'use strict';

import {wsConnect} from './brumeWebsocket.js';
import {getToken} from './brumeLogin.js';

const rtcMsgHandlers = {
	offer: handleOffer,
	answer: handleAnswer,
	candidate: handleCandidate,
	close: handleClose,
	peerError: handlePeerError
};

let sendMessage = null,
	token = null,
	myName = null,
	channelName = myName + Math.random().toString(10).slice(2,8,);

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
	sendMessage = await wsConnect(token, rtcMsgHandlers);
	divApp.classList.remove('hidden');
};


// App stuff

let peer = null;
let peerUsername = null;

// Simple-peer helper function

function peerInit(peer) {
	peer.on('signal', data => {
		let msg;
		if(data.candidate) {
			msg = {type: 'candidate', candidate: data};
		} else {
			msg = {type: data.type};
			msg[data.type] = data;
		}
		msg.channelName = peer.channelName;
		sendMessage(peerUsername, msg);
	});

	peer.on('connect', () => {
		hangUpBtn.classList.remove('hidden');
		callBtn.classList.add('hidden');
		console.log(`caller data channel open`);
		peer.send(`Hi ${peerUsername}`);
	});

	peer.on('data', data => {
		dataArea.innerHTML = `Data from ${peerUsername}: ${data}`;
		//peer.send(`Hi ${peerUsername}`);
		//handleHangup();
	});

	peer.on('close', () => {
		console.log(`peer closed`);
		handleClose();
	});
}

// WebRTC signalling message handlers

function handleOffer(data, name) {
	peerUsername = name;
	peer = new SimplePeer();
	peerInit(peer);
	peer.signal(data);
	//callBtn.classList.add('hidden');
	//hangUpBtn.classList.remove('hidden');
};

function handleAnswer(data) { 
	peer.signal(data);
	callBtn.classList.add('hidden');
	//hangUpBtn.classList.remove('hidden');
};

function handleCandidate(data){
	if(peer) {
		peer.signal(data);
	}
}

function handleClose() {
	console.log('closing connection');
	peerUsername = null;
	peer = null;
	callBtn.classList.remove('hidden');
	hangUpBtn.classList.add('hidden');
	dataArea.innerHTML='';
	callToUsernameInput.value = '';

};

function handlePeerError(data) {
	switch(data.code) {
		case 'ENODEST':
			alert(`${data.edata.receiver} is not connected`);
			break;

		default:
			alert(`peerError: ${data.data}`);
	}
	handleClose();
}

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
		peer = new SimplePeer({ initiator: true, channelName: myName + Math.random().toString(10).slice(2,8,)});
		peerInit(peer);
		//hangUpBtn.classList.remove('hidden');
		//callBtn.classList.add('hidden');
	}
});

// hangup button handler
hangUpBtn.addEventListener("click", function () {
	sendMessage(peerUsername, { type: 'close' }); 
	peerUsername = null;
	peer.destroy();
	peer = null;
	hangUpBtn.classList.add('hidden');
	callBtn.classList.remove('hidden');
});
