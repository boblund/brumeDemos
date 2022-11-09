'use strict';

import {BrumeConnection} from '../brumeConnection.mjs';
const brumeConnection = await (new BrumeConnection(offerHandler));

/*****App specific handling of peer connection events *****/

function peerInit(peer, peerName) {
	peer.peerUsername = peerName;

	peer.on('connect', () => {
		hangUpBtn.classList.remove('hidden');
		callBtn.classList.add('hidden');
		console.log(`caller data channel open`);
		peer.send(`Hi ${peer.peerUsername}`);
	});

	peer.on('data', data => {
		dataArea.innerHTML = `Data from ${peer.peerUsername}: ${data}`;
	});

	peer.on('closed', () => {
		console.log(`peer closed`);
		handleClose();
	});

	peer.on('peerError', (data) => {
		switch(data.code) {
			case 'ENODEST':
				alert(`${data.edata.receiver} is not connected`);
				break;

			case 'EOFFERTIMEOUT':
				alert(`${data.edata.receiver} did not answer`);
				break;	
	
			default:
				alert(`peerError: ${data.data}`);
		}
		handleClose();
	});
}

/***** App specific handling of Brume signaling events *****/

let peer = null;

async function offerHandler(offer, name, channelId) {
	if(confirm(`Accept call from ${name}?`)){
		peer = brumeConnection.makePeer({channelId});
		peerInit(peer, name);
		await peer.connect(name, offer);
	}
};

function handleClose() {
	peer = null;
	callBtn.classList.remove('hidden');
	hangUpBtn.classList.add('hidden');
	dataArea.innerHTML='';
	callToUsernameInput.value = '';
};

/***** App UI logic *****/

const callToUsernameInput = document.querySelector('#callToUsernameInput');
const callBtn = document.querySelector('#callBtn');
const hangUpBtn = document.querySelector('#hangUpBtn');
const dataArea = document.querySelector('#dataArea');
callBtn.classList.remove('hidden');
hangUpBtn.classList.add('hidden');


// call button handler
callBtn.addEventListener('click', async (e) => {		 
	if (callToUsernameInput.value.length > 0) { 
		peer = brumeConnection.makePeer({initiator: true});
		peerInit(peer, callToUsernameInput.value);
		await peer.connect(callToUsernameInput.value);
	}
});

// hangup button handler
hangUpBtn.addEventListener("click", function () {
	peer.close();
	peer.destroy();
	peer = null;
	hangUpBtn.classList.add('hidden');
	callBtn.classList.remove('hidden');
});
