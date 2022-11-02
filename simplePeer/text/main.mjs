'use strict';

import {BrumePeer} from '../brumePeer.mjs';
import {getToken} from '../../brumeLogin.mjs';

let token = null,
	myName = null,
	brumeConnection = null;

const divLogin = document.querySelector('div#login');
const divApp = document.querySelector('div#app');

divLogin.classList.add('hidden');
divApp.classList.add('hidden');

// Either returns a localStorage token or presents a login
// page that calls loginCallBack with a token

token = getToken(loginCallBack);

if(token != null) {
	// localStorage token
	divLogin.classList.add('hidden');
	divApp.classList.remove('hidden');

	// Delay if reload due to AWS websocket connect/disconnect race condition
	setTimeout(
		async ()=> {
			await loginCallBack(token), //sendMessage = await wsConnect(token, rtcMsgHandlers);
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

// App stuff

let peer = null;
let peerUsername = null;

function peerInit(peer) {
	peer.on('connect', () => {
		hangUpBtn.classList.remove('hidden');
		callBtn.classList.add('hidden');
		chatArea.classList.remove('hidden');
		chatInput.classList.remove('hidden');
	});

	peer.on('data', data => {
		chatArea.innerHTML += `${peerUsername}: ${data} </br>`; 
		chatArea.scrollTop = chatArea.scrollHeight;
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
	
			default:
				alert(`peerError: ${data.data}`);
		}
		handleClose();
	});
}

// App brumeConnection action handlers

async function offerHandler(offer, name, channelId) {
	peerUsername = name;
	peer = brumeConnection.makePeer({channelId});
	peerInit(peer);
	await peer.connect(name, offer);
};


function handleClose() {
	console.log('closing connection');
	peerUsername = null;
	peer = null;
	callBtn.classList.remove('hidden');
	hangUpBtn.classList.add('hidden');
	callToUsernameInput.value = '';
	chatArea.innerHTML = '';
	chatArea.classList.add('hidden');
	chatInput.classList.add('hidden');
};

// App UI logic

const callToUsernameInput = document.querySelector('#callToUsernameInput');
const callBtn = document.querySelector('#callBtn');
const hangUpBtn = document.querySelector('#hangUpBtn');
const dataArea = document.querySelector('#dataArea');
callBtn.classList.remove('hidden');
hangUpBtn.classList.add('hidden');

const msgInput = document.querySelector('#msgInput');
const sendMsgBtn = document.querySelector('#sendMsgBtn');
const chatArea = document.querySelector('#chatarea');
const chatInput = document.querySelector('#chatInput');

chatArea.classList.add('hidden');
chatInput.classList.add('hidden');
hangUpBtn.classList.add('hidden');

// Chat send
sendMsgBtn.addEventListener("click", function (event) { 
	var val = msgInput.value; 
	chatArea.innerHTML += name + ": " + val + "<br />";
	chatArea.scrollTop = chatArea.scrollHeight;
   
	//sending a message to a connected peer 
	peer.send(val); 
	msgInput.value = ""; 
});

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
