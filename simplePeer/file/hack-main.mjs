'use strict';

import {BrumePeer} from '../brumePeer.mjs';
import {getToken} from '../../brumeLogin.mjs';

let token = null,
	myName = null,
	brumeConnection = null;

const divLogin = document.querySelector('div#login');
const divApp = document.querySelector('div#app');
const saveFileBtn = document.querySelector('#saveFileBtn');
const outFile = document.querySelector('#outFile');

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

let peer = null,
	peerUsername = null,
	received = 0,
	size = 0,
	name = '',
	writableStream = null,
	reader = null;

async function saveResultHandler(_msg) {
	let msg = JSON.parse(_msg.toString());
	switch(msg.type) {
		case 'start':
			({name, size} = msg.data);
			saveFileBtn.classList.remove('hidden');
			outFile.classList.remove('hidden');
			saveFileBtn.addEventListener('click', async () => {
				const newHandle = await window.showSaveFilePicker({suggestedName: name});
				writableStream = await newHandle.createWritable();
				saveFileBtn.classList.add('hidden');
				peer.send(JSON.stringify({type: 'ready'}));
			});

			peer.on('data', async _msg => {
				let msg = _msg.toString();
				try {
					msg = JSON.parse(msg);
					if(msg.type == 'eof'){
						if(received < size){
							peer.send(JSON.stringify({type: 'result', status: 'failed: received too few bytes'}));
							alert('Transfer ' + 'failed: received too few bytes');
						} else {
							peer.send(JSON.stringify({type: 'result', status: 'succeeded'}));
							alert('Transfer ' + 'succeeded');
						}
						await writableStream.close();
						peer.on('data', () => {});
						peer.once('data', saveResultHandler);
						received = 0;
					}
				} catch(e) {
					received += _msg.length;
					await writableStream.write(_msg);
				}
			});
			
			break;

		case 'ready':
			while( true ) {
				const { done, value } = await reader.read();
				if( done ) {
					peer.send(JSON.stringify({type: 'eof'}));
					break;
				}
				peer.send(value);//(JSON.stringify({type: 'chunk', data: value.toString()}));
			}

			break;

		case 'result':
			alert('Transfer ' + msg.result);
			break;

		default:
	}
}

function peerInit(peer) {
	peer.on('connect', () => {
		hangUpBtn.classList.remove('hidden');
		callBtn.classList.add('hidden');
		sendFile.classList.remove('hidden');
	});

	peer.once('data', saveResultHandler);

	peer.on('closed',  () => {
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
	callToUsernameInput.value = '';
};

// App UI logic

const callToUsernameInput = document.querySelector('#callToUsernameInput');
const callBtn = document.querySelector('#callBtn');
const hangUpBtn = document.querySelector('#hangUpBtn');
const inFile = document.querySelector('#inFile');
const sendFile = document.querySelector('#sendFile');
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

inFile.onchange = async (evt) => {
	peer.send(JSON.stringify({
		type: 'start',
		data: {
			name: inFile.files[0].name,
			size: inFile.files[0].size
		}
	}));
	const stream = inFile.files[ 0 ].stream();
	reader = stream.getReader();
	/*while( true ) {
		const { done, value } = await reader.read();
		if( done ) {
			console.log("peer.send(JSON.stringify({type: 'eof'})");
			break;
		}
		console.log('peer.send( value )');
	}*/
};

// hangup button handler
hangUpBtn.addEventListener("click", function () {
	peer.close();
	peer.destroy();
	peer = null;
	hangUpBtn.classList.add('hidden');
	callBtn.classList.remove('hidden');
});
