'use strict';

import {BrumeConnection} from '../brumeConnection.mjs';
const brumeConnection = await (new BrumeConnection(offerHandler));
let callElem = null;
if(customElements.get('brume-call')) {
	callElem = document.getElementById('call');
}

const inFile = document.querySelector('#inFile');
const sendFile = document.querySelector('#sendFile');
const saveFileBtn = document.querySelector('#saveFileBtn');
const outFile = document.querySelector('#outFile');

let peer = null;

function peerInit(peer) {
	peer.on('connect', () => {
		callElem.hangUp();
		sendFile.style.display = '';
	});

	peer.once('data', saveResultHandler);

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

let reader = null;

inFile.onchange = (evt) => {
	peer.send(JSON.stringify({
		type: 'start',
		data: {
			name: inFile.files[0].name,
			size: inFile.files[0].size
		}
	}));
	const stream = inFile.files[ 0 ].stream();
	reader = stream.getReader();
};

async function saveResultHandler(_msg) {
	let	received = 0,
		size = 0,
		name = '',
		writableStream = null,
		msg = JSON.parse(_msg.toString());
		
	switch(msg.type) {
		case 'start':
			inFile.style.display = 'none';
			({name, size} = msg.data);
			saveFileBtn.style.display = '';
			outFile.style.display = '';
			saveFileBtn.addEventListener('click', async () => {
				const newHandle = await window.showSaveFilePicker({suggestedName: name});
				writableStream = await newHandle.createWritable();
				saveFileBtn.style.display = 'none';
				peer.send(JSON.stringify({type: 'ready'}));
			});

			peer.on('data', async _msg => {
				let msg = JSON.parse(_msg.toString());
				switch(msg.type) {
					case 'chunk':
						const chunk = new Uint8Array(msg.data);
						received += chunk.length;
						await writableStream.write(chunk);
						break;
			
					case 'eof':
						if(received < size){
							peer.send(JSON.stringify({type: 'result', status: 'failed: received too few bytes'}));
							alert('Transfer ' + 'failed: received too few bytes');
						} else {
							peer.send(JSON.stringify({type: 'result', status: 'succeeded'}));
							alert('Transfer ' + 'succeeded');
						}
						await writableStream.close();
						received = 0;
						size = 0;
						name = '';
						writableStream = null;
						reader = null;
						outFile.style.display = 'none';
						inFile.style.display = '';
						break;
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
				peer.send(JSON.stringify({type: 'chunk', data: Array.from(value)}));
			}

			break;

		case 'result':
			alert('Transfer ' + msg.result);
			received = 0;
			size = 0;
			name = '';
			writableStream = null;
			reader = null;
			outFile.style.display = 'none';
			inFile.style.display = '';
			inFile.value = '';
			break;

		default:
	}
}

// App brumeConnection action handlers

async function offerHandler(offer, name, channelId) {
	if(confirm(`Accept call from ${name}?`)){
		callElem.name.value = `call from ${name}`;
		peer = brumeConnection.makePeer({channelId});
		peerInit(peer);
		peer.peerUsername = name;
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
};

// App UI logic
callElem.call();

// call button handler
callElem.callBtn.addEventListener('click', async (e) => {		 
	if (callElem.name.value.length > 0) { 
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
