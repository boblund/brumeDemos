'use strict';

import {Brume} from './Brume.mjs';
import {getToken} from './brumeLogin.mjs';

const brume = new Brume(),
	callElem = customElements.get('brume-call') ? document.getElementById('call') : null;

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

const dataArea = document.querySelector('#dataArea'),
	divLogin = document.querySelector('div#login'),
	divApp = document.querySelector('div#app');

callElem.call();

callElem.callBtn.addEventListener('click', async (e) => {		 
	if (callElem.name.value.length > 0) { 
		try {
			peer = await brume.connect(callElem.name.value);
		} catch(e) {
			alert(`Could not connect to ${callElem.name.value}`);
			return;
		}
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

function hangupHandler(peer) {
	//peer.close();
	if(peer) peer.destroy();
	peer = null;
	dataArea.innerHTML='';
	callElem.call();
	callElem.name.value = '';
}

brume.onconnection = offerHandler;
let token = localStorage?.Authorization,
	triedLogin = false;

while(true){
	try {
		if(!token) {
			divLogin.style.display = '';
			token = await getToken();
			localStorage.Authorization = token;
			triedLogin = true;
		}
		await brume.start({token, url: 'wss://brume.occams.solutions/Prod'});
		break;
	} catch(e) {
		if(triedLogin) alert(`Connection to Brume failed. Try signing in again.`);
		token = null;
		delete localStorage.Authorization;
	}
}

divLogin.style.display = 'none';
divApp.style.display = '';
