import {SimplePeer} from './simplepeer.min.mjs';
'use script';

// https://medium.com/@AkashHamirwasia/new-ways-of-sharing-files-across-devices-over-the-web-using-webrtc-2554abaeb2e6

export {BrumePeer};

function BrumePeer (myName, offerHandler, token) {		//es6ify
	let //myName = _myName,
		//offerHandler = _offerHandler,
		instance = this,
		sendMessage = null,
		peers = {};

	function wsConnect(token) {
		return new Promise((res, rej) => {
			let ws = new WebSocket(`${location.protocol == 'https:' ? 'wss' : 'ws'}://${location.host}?token=${token}`);
	
			ws.onopen = () => {
				console.log('Connected to the signaling server');
				res(sendMessage);
			};
	
			ws.onclose = (event) => { 
				ws = null;
			};
	
			ws.onerror = err => {
				rej(null);
			};
	
			ws.onmessage = msg => {
				const data = JSON.parse(msg.data);
				const type = data.type == 'peerError' ? data.type : data.data.type;
				console.log('Got message', type);
	
				switch (type) {
					case 'offer':
						offerHandler(data.data.offer, data.from, data.data.channelId);
						break;
		
					case 'answer':	
					case 'candidate':
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
						if(peers[data.edata.channelId]) {
							peers[data.edata.channelId].emit('peerError', data);
							delete peers[data.edata.channelId];
						}
						break;
	
					default:
						break;
				}
			};
	
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
		});
	}

	this.makePeer = (options) => {
		const	peer = new SimplePeer(options);

		if(options.initiator) {
			peer.channelId = myName + Math.random().toString(10).slice(2,8,);
		} else {
			peer.channelId = options.channelId;
		}

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
		sendMessage = await wsConnect(token);
		return instance;
	})();
}
