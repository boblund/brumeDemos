'use strict';

import {BrumeConnection} from '../brumeConnection.mjs';
const brumeConnection = await (new BrumeConnection(offerHandler));
let callElem = null;
if(customElements.get('brume-call')) {
	callElem = document.getElementById('call');
}

// App stuff

let peer = null;
let peerUsername = null;

function peerInit(peer) {
	peer.on('connect', () => {
		callElem.hangUp();
	});

	peer.on('data', data => {});

	peer.on('stream', stream => {
		document.querySelector('video#remote').srcObject = stream;
		remoteDiv.style.visibility = 'visible';
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

let localStream = null;

async function getMedia() {
	if(localStream == null){
		try {
			localStream = await navigator.mediaDevices.getUserMedia({
				video: true,
				audio: true
			});
		} catch (error) {
			alert(`navigator.mediaDevices.getUserMedia: ${error.name}`);
			console.error(`navigator.mediaDevices.getUserMedia: ${JSON.stringify(error)}`);
		}

		localStream.getTracks().forEach(media => {
			media.enabled = false;
		});

		document.querySelector('video#local').srcObject = localStream;
	}

	return localStream;
}

// App brumeConnection action handlers

async function offerHandler(offer, name, channelId) {
	if(confirm(`Accept call from ${name}?`)){
		callElem.name.value = `call from ${name}`;
		peerUsername = name;
		localStream = await getMedia();
		peer = brumeConnection.makePeer({channelId, stream: localStream});
		peerInit(peer);
		await peer.connect(name, offer);
		localDiv.style.visibility = 'visible';
		remoteButton.innerHTML = `${name}'s video`;
	}
};

function handleClose() {
	console.log('closing connection');
	peer.close();
	peer.destroy();
	peer = null;
	callElem.call();
	callElem.name.value = '';
	if(localStream != null) {
		localStream.getTracks().forEach(media => { media.enabled = false; });
		localStream.getVideoTracks()[0].stop();
		localStream = null;
	}
	firstUserGesture = true;

	Array.from(document.getElementsByTagName('video')).forEach(video => {
		video.pause();
		video.src = '';
		video.srcObject = null;  
		video.load();
	});

	localButton.style.textDecoration = 'line-through';
	remoteButton.innerHTML = 'Remote video';
	remoteButton.style.textDecoration = 'line-through';
	remoteDiv.style.visibility = 'hidden';
	localDiv.style.visibility = 'hidden';
};

// App UI logic
callElem.call();

const localDiv = document.getElementById('localDiv');
const localButton = document.querySelector('button.local');
const remoteDiv = document.getElementById('remoteDiv');
const remoteButton = document.querySelector('button.remote');

localButton.addEventListener('click', ()=>{toggle('local');});
remoteButton.addEventListener('click', ()=>{toggle('remote');});

remoteDiv.style.visibility = 'hidden';
localDiv.style.visibility = 'hidden';
localButton.style.textDecoration = 'line-through';
remoteButton.style.textDecoration = 'line-through';

// call button handler
callElem.callBtn.addEventListener('click', async (e) => {		 
	if (callElem.name.value.length > 0) { 
		peerUsername = callElem.name.value;
		localStream = await getMedia();
		peer = brumeConnection.makePeer({initiator: true, stream: localStream });
		peer.peerUsername = callElem.name.value;
		peerInit(peer);
		await peer.connect(callElem.name.value);
		localDiv.style.visibility = 'visible';
		remoteButton.innerHTML = `${callElem.name.value}'s video`;
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

let firstUserGesture = true;
function toggle(buttonName) {
	const button = document.querySelector('#' + buttonName + 'Button');
	const player = document.querySelector('video#'+buttonName);

	if(buttonName == 'local') {
		if(firstUserGesture) {
			player.play();
			button.style.textDecoration = '';
			firstUserGesture = false;

			localStream.getTracks().forEach(media => {
				media.enabled = true;
			});

			return;
		} else {
			button.style.textDecoration = button.style.textDecoration == 'line-through' ? '' : 'line-through';
			localStream.getTracks().forEach(media => {
				media.enabled = media.enabled ? false : true;
			});
		}
	} else {
		if (player.paused) {
			player.play();
			player.muted = false;
			button.style.textDecoration = '';
		} else {
			player.src='';
			player.pause();
			player.muted = true;
			button.style.textDecoration = 'line-through';
		}
	}
};
