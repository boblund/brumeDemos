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

// App stuff

let peer = null;
let peerUsername = null;

function peerInit(peer) {
	peer.on('connect', () => {
		callElem.hangUp();
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
		callElem.name.value = `call from ${name}`;
		peerUsername = name;
		peer = brumeConnection.makePeer({channelId});
		peerInit(peer);
		await peer.connect(name, offer);
	}
};


function handleClose() {
	console.log('closing connection');
	peer.close();
	peer.destroy();
	peer = null;
	callElem.call();
	callElem.name.value = '';
	chatArea.innerHTML = '';
	chatArea.style.display = 'none';
	chatInput.style.display = 'none';
};

// App UI logic
callElem.call();

const msgInput = document.querySelector('#msgInput');
const sendMsgBtn = document.querySelector('#sendMsgBtn');
const chatArea = document.querySelector('#chatarea');
const chatInput = document.querySelector('#chatInput');

chatArea.style.display = 'none';
chatInput.style.display = 'none';
callElem.call();

// Chat send
sendMsgBtn.addEventListener("click", function (event) { 
	var val = msgInput.value; 
	chatArea.innerHTML += peer.myName + ": " + val + "<br />";
	chatArea.scrollTop = chatArea.scrollHeight;
   
	//sending a message to a connected peer 
	peer.send(val); 
	msgInput.value = ""; 
});

// call button handler
callElem.callBtn.addEventListener('click', async (e) => {		 
	if (callElem.name.value.length > 0) { 
		peerUsername = callElem.name.value;
		peer = brumeConnection.makePeer({initiator: true});
		peer.peerUsername = callElem.name.value;
		peerInit(peer);
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
