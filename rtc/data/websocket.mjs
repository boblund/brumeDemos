'use script';

export function wsConnect(token, handlers) {
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
					handlers[type](data.data.offer, data.from);
					break;
	
				case 'answer':
					handlers[type](data.data.answer);
					break;
	
				case 'candidate':
					handlers[type](data.data.candidate);
					break;

				case 'close':
					handlers[type]();
					break;

				case 'peerError':
					handlers[type](data);
					break;
	
				default:
					break;
			}
		};

		function sendMessage(to, data){
			/*if (peerUsername) {
				message.name = peerUsername;
			}*/

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
