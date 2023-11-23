'use script';

export {BrumePeer};
let SimplePeer = typeof window != 'undefined' ? window.SimplePeer : null,
	wrtc, _ws;

/*(async function() {
	if(typeof window == 'undefined') {
		SimplePeer = (await import('simple-peer')).default;
		const os = (await import('os')).default;
		wrtc = (os.cpus()[0].model == 'Apple M1') && (os.arch() == 'arm64')
			? (await import('@koush/wrtc')).default
			: (await import('wrtc')).default;
		_ws = (await import('ws')).default;
	}
})();*/

function BrumePeer(myName, token, url, onServerClose) {
	let instance = this,
		peers = {},
		ws;

	function sendMessage(to, data){
		if(ws == null) {
			return false;
		}
	
		ws.send(JSON.stringify({
			action: 'send',
			to,
			data
		}));

		return true;
	}

	function offerTimeout(peer) {
		peer.emit('peerError', {
			type: "peerError",
			code: "EOFFERTIMEOUT",
			channelId: peer.channelId,
			peerUsername: peer.peerUsername
		});
		delete peers[peer];
	}

	function wsConnect(token) {
		return new Promise((res, rej) => {	
			if(typeof window == 'undefined') {
				ws = new _ws(url, {
					headers : { token: token},
					rejectUnauthorized: false
				});
			} else {
				const _url = location.host == 'brume.occams.solutions' ? location.host + '/Prod' : location.host;
				ws = new WebSocket(`${location.protocol == 'https:' ? 'wss' : 'ws'}://${_url}?token=${token}`);
			}
	
			const pingInterval = typeof ws.ping === 'function'
				? setInterval(function(){ws.ping(()=>{});}, 9.8 * 60 * 1000)
				: null;

			ws.onopen = () => {
				console.log('Connected to the signaling server');
				// close can come before ws is set
				ws.onclose = () => {
					if(onServerClose) {
						setTimeout(()=>{onServerClose('serverclose');}, 10*1000);  //give server time to delete closed session
					}
					clearInterval(pingInterval);
					ws = null;
				};
				res(sendMessage);
			};
	
			ws.onerror = err => {
				rej(err);
			};
	
			ws.onmessage = msg => {
				const data = JSON.parse(msg.data);
				const type = data.type == 'peerError' ? data.type : data.data.type;
	
				switch (type) {
					case 'offer':
						instance.offerHandler(data.data.offer, data.from, data.data.channelId);
						break;
		
					case 'answer':	
					case 'candidate':
						if(type == 'answer'){
							clearTimeout(peers[data.data.channelId].offerTimer);
						}
						if(peers[data.data.channelId]){
							peers[data.data.channelId].signal(data.data[type]);
						}
						break;
	
					case 'close':
						if(peers[data.data.channelId]) {
							peers[data.data.channelId].emit('closed');
							delete peers[data.data.channelId];
						}
						break;

					case 'peerError':
						if(peers[data.channelId]) {
							clearTimeout(peers[data.channelId].offerTimer);
							peers[data.channelId].emit('peerError', data);
							delete peers[data.channelId];
						}
						break;
	
					default:
						break;
				}
			};
		});
	}

	this.makePeer = async (options) => {
		if(ws == null) {
			// ws server closed websocket after page was loaded
			await wsConnect(token); // should catch wsConnect errors
		}
		const	peer = new SimplePeer({...options, trickle: false, wrtc: wrtc});
		peer.myName = myName;

		peer.channelId = options.initiator ? myName + Math.random().toString(10).slice(2,8) : options.channelId;

		peers[peer.channelId] = peer;

		peer.connect = (peerName, offer) => {
			return new Promise((res, rej) => {
				if(offer) {
					peer.signal(offer);
				}

				peer.peerUsername = peerName;

				peer.on('signal', data => {
					let msg;
					if(data.candidate) {
						msg = {type: 'candidate', candidate: data};
					} else {
						msg = {type: data.type};
						msg[data.type] = data;
					}
					msg.channelId = peer.channelId;
					if(data.type == 'offer') {
						peer.offerTimer = setTimeout(()=>{offerTimeout(peer);}, 60 * 1000);
					}
					sendMessage(peerName, msg);
				});

				peer.on('connect', () => {
					res(peer);
				});

				peer.on('error', (e) => {
					rej(e);
				});

				peer.on('close', () => {
					delete peers[peer.channelId];
					peer.emit('closed');
				});
			});
		};

		peer.close = () => {
			sendMessage(peer.peerUsername, { type: 'close' });
		};

		return peer;
	};

	return (async () => {
		if(typeof window == 'undefined') {
			SimplePeer = (await import('simple-peer')).default;
			const os = (await import('os')).default;
			wrtc = (os.cpus()[0].model == 'Apple M1') && (os.arch() == 'arm64')
				? (await import('@koush/wrtc')).default
				: (await import('wrtc')).default;
			_ws = (await import('ws')).default;
		}
		await wsConnect(token);
		return instance;
	})();
};

