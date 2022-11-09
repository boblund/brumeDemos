'use strict';

import {BrumePeer} from '../brumePeer.mjs';
import {getToken} from '../../brumeLogin.mjs';

/***** This section doesn't change between apps that use the Brume app template *****/
let token = null,
	myName = null,
	brumeConnection = null;

const divLogin = document.querySelector('div#login');
const divApp = document.querySelector('div#app');

divLogin.classList.add('hidden');
divApp.classList.add('hidden');

token = getToken(loginCallBack);

if(token != null) {
	divLogin.classList.add('hidden');
	divApp.classList.remove('hidden');

	// Delay if reload due to AWS websocket connect/disconnect race condition
	setTimeout(
		async ()=> {
			await loginCallBack(token),
			divApp.classList.remove('hidden');
		},
		sessionStorage.reload ? 1000 : 0
	);
	sessionStorage.reload = 'yes';

} else {
	divLogin.classList.remove('hidden');
}

async function loginCallBack(brumeToken) {
	token = brumeToken;
	myName = JSON.parse(atob(token.split('.')[1]))['custom:brume_name'];
	divLogin.classList.add('hidden');
	brumeConnection = await (new BrumePeer(myName, offerHandler, token));
	divApp.classList.remove('hidden');
};
/***** End of section that doesn't change between apps that use the Brume app template *****/

// App stuff

let peer = null;
let peerUsername = null;

function peerInit(peer) {
	peer.on('connect', () => {
		hangUpBtn.classList.remove('hidden');
		callBtn.classList.add('hidden');
		console.log(`caller data channel open`);
		peer.send(`Hi ${peerUsername}`);
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

// App brumeConnection action handlers

async function offerHandler(offer, name, channelId) {
	if(confirm(`Accept call from ${name}?`)){
		peerUsername = name;
		peer = brumeConnection.makePeer({channelId});
		peerInit(peer);
		await peer.connect(name, offer);
	}
};

function handleClose() {
	console.log('closing connection');
	peerUsername = null;
	peer = null;
	callBtn.classList.remove('hidden');
	hangUpBtn.classList.add('hidden');
	dataArea.innerHTML='';
	callToUsernameInput.value = '';
};

// App UI logic

const callToUsernameInput = document.querySelector('#callToUsernameInput');
const callBtn = document.querySelector('#callBtn');
const hangUpBtn = document.querySelector('#hangUpBtn');
const dataArea = document.querySelector('#dataArea');
callBtn.classList.remove('hidden');
hangUpBtn.classList.add('hidden');


// call button handler
callBtn.addEventListener('click', async (e) => {		 
	if (callToUsernameInput.value.length > 0) { 
		peerUsername = callToUsernameInput.value;
		peer = brumeConnection.makePeer({initiator: true});
		peer.peerUsername = callToUsernameInput.value;
		peerInit(peer);
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
