'use strict';

import {BrumeConnection} from '../brumeConnection.mjs';
const brumeConnection = await (new BrumeConnection(offerHandler));
const callElem = customElements.get('brume-call') ? document.getElementById('call') : null;

/*****App specific handling of peer connection events *****/

function peerInit(peer, peerName) {
	peer.on('closed', () => {
		console.log(`peer closed`);
		handleClose();
	});

	peer.on('peerError', (data) => {
		switch(data.code) {
			case 'ENODEST':
				alert(`${data.peerUsername} is not connected`);
				break;

			case 'EOFFERTIMEOUT':
				alert(`${data.peerUsername} did not answer`);
				break;	
	
			default:
				alert(`peerError: ${data}`);
		}
		handleClose();
	});
}

/***** App specific handling of Brume signaling events *****/

let peer = null;

function offerHandler(peer) {
	if(confirm(`Accept call from ${peer.peerUsername}?`)){
		callElem.name.value = `call from ${peer.peerUsername}`;
		//peer = await brumeConnection.makePeer({channelId});
		peerInit(peer);
		callElem.hangUpBtn.addEventListener("click", () => { hangupHandler(peer); });
		callElem.hangUp();
		peer.on('close', () => {
			handleClose();
		});
		peer.on('data', data => {
			dataArea.innerHTML = `Data from ${peer.peerUsername}: ${data}`;
		});
	}
};

function handleClose() {
	peer = null;
	callElem.call();
	dataArea.innerHTML='';
	callElem.name.value = '';
};

/***** App UI logic *****/

const dataArea = document.querySelector('#dataArea');

callElem.call();

// call button handler
callElem.callBtn.addEventListener('click', async (e) => {		 
	if (callElem.name.value.length > 0) { 
		peer = await brumeConnection.connect(callElem.name.value);
		peer.on('close', () => {
			handleClose();
		});
		peerInit(peer, callElem.name.value);
		callElem.hangUpBtn.addEventListener("click", () => { hangupHandler(peer); });
		callElem.hangUp();
		console.log(`caller data channel open`);
		peer.send(`Hi ${callElem.name.value}`);
	}
});

// hangup button handler
function hangupHandler(peer) {
	//peer.close();
	if(peer) peer.destroy();
	peer = null;
	dataArea.innerHTML='';
	callElem.call();
	callElem.name.value = '';
}
//});
