'use strict';

import {BrumePeer} from '../brumePeer.mjs';
import {getToken} from '../../brumeLogin.mjs';

let token = null,
	myName = null,
	brumeConnection = null,
	localStream = null;

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
	});

	peer.on('data', data => {});

	peer.on('stream', stream => {
		document.querySelector('video#remote').srcObject = stream;
		remoteDiv.classList.remove('invisible');
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
	peerUsername = name;
	localStream = await getMedia();
	peer = brumeConnection.makePeer({channelId, stream: localStream });
	peer.peerUsername = name;
	peerInit(peer);
	await peer.connect(name, offer);
	localDiv.classList.remove('invisible');
	remoteButton.innerHTML = `${peerUsername}'s video`;
};


function handleClose() {
	console.log('closing connection');
	peerUsername = null;
	peer = null;
	callBtn.classList.remove('hidden');
	hangUpBtn.classList.add('hidden');
	callToUsernameInput.value = '';
	localStream.getTracks().forEach(media => { media.enabled = false; });
	localStream.getVideoTracks()[0].stop();
	localStream = null;
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
	remoteDiv.classList.add('invisible');
	localDiv.classList.add('invisible');
};

// App UI logic

const callToUsernameInput = document.querySelector('#callToUsernameInput');
const callBtn = document.querySelector('#callBtn');
const hangUpBtn = document.querySelector('#hangUpBtn');
callBtn.classList.remove('hidden');
hangUpBtn.classList.add('hidden');
const localDiv = document.getElementById('localDiv');
const localButton = document.querySelector('button.local');
const remoteDiv = document.getElementById('remoteDiv');
const remoteButton = document.querySelector('button.remote');

localButton.addEventListener('click', ()=>{toggle('local');});
remoteButton.addEventListener('click', ()=>{toggle('remote');});

remoteDiv.classList.add('invisible');
localDiv.classList.add('invisible');
localButton.style.textDecoration = 'line-through';
remoteButton.style.textDecoration = 'line-through';

// call button handler
callBtn.addEventListener('click', async (e) => {		 
	if (callToUsernameInput.value.length > 0) { 
		peerUsername = callToUsernameInput.value;
		localStream = await getMedia();
		peer = brumeConnection.makePeer({initiator: true, stream: localStream });
		peer.peerUsername = callToUsernameInput.value;
		peerInit(peer);
		await peer.connect(callToUsernameInput.value);
		localDiv.classList.remove('invisible');
		remoteButton.innerHTML = `${peerUsername}'s video`;
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
