'use strict';

import {BrumePeer} from '../brumePeer.mjs';
import {getToken} from '../brumeLogin.mjs';

const brumeLogin = new function(){
	return {
		submitLogin: document.querySelector('#submitLogin'),
		email: document.querySelector('#email'),
		password: document.querySelector('#password'),
		checkbox: document.querySelector('#checkbox'),
		loginStatus: document.querySelector('#loginStatus')
	};
};

const bi = document.querySelector('i.bi');
bi.addEventListener('click', doToggle);

function doToggle(event) {
	let password = document.getElementById(event.currentTarget.attributes.getNamedItem('for').value);
	password.type = password.type === "password" ? "text" : "password";
	event.currentTarget.classList.toggle("bi-eye");
}

let token = null,
	myName = null,
	brumeConnection = null;

const divLogin = document.querySelector('div#login');
const divApp = document.querySelector('div#app');

divLogin.style.display = 'none';
divApp.style.display = 'none';

// Either returns a localStorage token or presents a login
// page that calls loginCallBack with a token

token = getToken(loginCallBack, brumeLogin);

if(token != null) {
	// localStorage token
	divLogin.style.display = 'none';
	divApp.style.display = '';

	// Delay if reload due to AWS websocket connect/disconnect race condition
	setTimeout(
		async ()=> {
			await loginCallBack(token), //sendMessage = await wsConnect(token, rtcMsgHandlers);
			divApp.style.display = '';
		},
		sessionStorage.reload ? 1000 : 0
	);
	sessionStorage.reload = 'yes';

} else {
	divLogin.style.display = '';
}

async function loginCallBack(brumeToken) {
	token = brumeToken;
	myName = JSON.parse(atob(token.split('.')[1]))['custom:brume_name'];
	divLogin.style.display = 'none';
	brumeConnection = await (new BrumePeer(myName, offerHandler, token));
	divApp.style.display = '';
};

// App stuff

let peer = null;
let peerUsername = null;

function peerInit(peer) {
	peer.on('connect', () => {
		hangUpBtn.style.display = '';
		callBtn.style.display = 'none';
		chatArea.style.display = '';
		chatInput.style.display = '';
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
	callBtn.style.display = '';
	hangUpBtn.style.display = 'none';
	name.value = '';
	chatArea.innerHTML = '';
	chatArea.style.display = 'none';
	chatInput.style.display = 'none';
};

// App UI logic

const name = document.querySelector('#name');
const callBtn = document.querySelector('#callBtn');
const hangUpBtn = document.querySelector('#hangUpBtn');
callBtn.style.display = '';
hangUpBtn.style.display = 'none';

const msgInput = document.querySelector('#msgInput');
const sendMsgBtn = document.querySelector('#sendMsgBtn');
const chatArea = document.querySelector('#chatarea');
const chatInput = document.querySelector('#chatInput');

chatArea.style.display = 'none';
chatInput.style.display = 'none';
hangUpBtn.style.display = 'none';

// Chat send
sendMsgBtn.addEventListener("click", function (event) { 
	var val = msgInput.value; 
	chatArea.innerHTML += myName + ": " + val + "<br />";
	chatArea.scrollTop = chatArea.scrollHeight;
   
	//sending a message to a connected peer 
	peer.send(val); 
	msgInput.value = ""; 
});

// call button handler
callBtn.addEventListener('click', async (e) => {		 
	if (name.value.length > 0) { 
		peerUsername = name.value;
		peer = brumeConnection.makePeer({initiator: true});
		peer.peerUsername = name.value;
		peerInit(peer);
		await peer.connect(name.value);
	}
});

// hangup button handler
hangUpBtn.addEventListener("click", function () {
	peer.close();
	peer.destroy();
	peer = null;
	hangUpBtn.style.display = 'none';
	callBtn.style.display = '';
});
