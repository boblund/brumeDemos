'use strict';

import {BrumePeer} from '../brumePeer.mjs';
import {getToken} from '../brumeLogin.mjs';

/***** This section doesn't change between apps that use the Brume app template *****/
let token = null,
	myName = null,
	brumeConnection = null;

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

const divLogin = document.querySelector('div#login');
const divApp = document.querySelector('div#app');

divLogin.style.display='none';
divApp.style.display='none';

token = getToken(loginCallBack, brumeLogin);

if(token != null) {
	divLogin.style.display='none';
	divApp.style.display='';

	// Delay if reload due to AWS websocket connect/disconnect race condition
	setTimeout(
		async ()=> {
			await loginCallBack(token),
			divApp.style.display='';
		},
		sessionStorage.reload ? 1000 : 0
	);
	sessionStorage.reload = 'yes';

} else {
	divLogin.style.display='';
}

async function loginCallBack(brumeToken) {
	token = brumeToken;
	myName = JSON.parse(atob(token.split('.')[1]))['custom:brume_name'];
	divLogin.style.display='none';
	brumeConnection = await (new BrumePeer(myName, offerHandler, token));
	divApp.style.display='';
};
/***** End of section that doesn't change between apps that use the Brume app template *****/

// App stuff

let peer = null;
let peerUsername = null;

function peerInit(peer) {
	peer.on('connect', () => {
		hangUpBtn.style.display='';
		callBtn.style.display='none';
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
	callBtn.style.display='';
	hangUpBtn.style.display='none';
	dataArea.innerHTML='';
	name.value = '';
};

// App UI logic

const name = document.querySelector('#name');
const callBtn = document.querySelector('#callBtn');
const hangUpBtn = document.querySelector('#hangUpBtn');
const dataArea = document.querySelector('#dataArea');
callBtn.style.display='';
hangUpBtn.style.display='none';


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
	hangUpBtn.style.display='none';
	callBtn.style.display='';
});
