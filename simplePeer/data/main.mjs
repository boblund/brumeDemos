'use strict';

import {BrumeConnection} from '../brumeConnection.mjs';
const brumeConnection = await (new BrumeConnection(offerHandler));
let callElem;
if(!customElements.get('brume-call') || !(callElem = document.getElementById('call'))) {
	callElem = new function(){
		return {
			// Mimic custom brume-call element API
			callBtn: document.getElementById('callBtn'),
			hangUpBtn: document.getElementById('hangUpBtn'),
			name: document.getElementById('name'),
			call() {
				this.callBtn.style.display='';
				this.hangUpBtn.style.display='none';
			},
			hangUp() {
				this.callBtn.style.display='none';
				this.hangUpBtn.style.display='';
			}
		};
	};
}

/*****App specific handling of peer connection events *****/

function peerInit(peer, peerName) {
	peer.peerUsername = peerName;

	peer.on('connect', () => {
		callElem.hangUp();
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
		callElem.name.value = `call from ${name}`;
		peer = brumeConnection.makePeer({channelId});
		peerInit(peer, name);
		await peer.connect(name, offer);
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
		peer = brumeConnection.makePeer({initiator: true});
		peerInit(peer, callElem.name.value);
		await peer.connect(callElem.name.value);
	}
});

// hangup button handler
callElem.hangUpBtn.addEventListener("click", function () {
	peer.close();
	peer.destroy();
	peer = null;
	callElem.call();
	callElem.name.value = '';
});
