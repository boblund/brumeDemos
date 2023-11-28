'use strict';

import {Brume} from './Brume.mjs';
import {getToken} from './brumeLogin.mjs';

const brume = new Brume(),
	callElem = customElements.get('brume-call') ? document.getElementById('call') : null,
	dataArea = document.querySelector('#dataArea'),
	divLogin = document.querySelector('div#login'),
	divApp = document.querySelector('div#app');

let token = localStorage?.Authorization,
	triedLogin = false;

function endPeerConnection(peer = undefined) {
	if(peer) peer.destroy();
	dataArea.innerHTML='';
	callElem.call();
	callElem.name.value = '';
}

function offerHandler(peer) {
	if(confirm(`Accept call from ${peer.peerUsername}?`)){
		callElem.name.value = `call from ${peer.peerUsername}`;
		callElem.hangUpBtn.addEventListener("click", () => { endPeerConnection(peer); });
		callElem.hangUp();
		peer.on('close', () => {
			endPeerConnection();
		});
		peer.on('data', data => {
			dataArea.innerHTML = `Data from ${peer.peerUsername}: ${data}`;
		});
	}
};

callElem.callBtn.addEventListener('click', async (e) => {	
	let peer = undefined;	 
	if (callElem.name.value.length > 0) { 
		try {
			peer = await brume.connect(callElem.name.value);
		} catch(e) {
			alert(`Could not connect to ${callElem.name.value}`);
			return;
		}
		peer.on('close', () => {
			endPeerConnection();
		});
		callElem.hangUpBtn.addEventListener("click", () => { endPeerConnection(peer); });
		callElem.hangUp();
		console.log(`caller data channel open`);
		peer.send(`Hi ${callElem.name.value}`);
	}
});

callElem.call();
brume.onconnection = offerHandler;


while(true){
	try {
		if(!token) {
			divLogin.style.display = '';
			token = await getToken();
			//localStorage.Authorization = token;
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
