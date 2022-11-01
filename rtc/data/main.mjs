'use strict';

import {wsConnect} from './websocket.mjs';
import {getToken} from '../../brumeLogin.mjs';

const rtcMsgHandlers = {
	offer: handleOffer,
	answer: handleAnswer,
	candidate: handleCandidate,
	close: handleClose,
	peerError: handlePeerError
};

let sendMessage = null;
let token = null;
let iceBuffer = [];


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
	divLogin.classList.add('hidden');
	sendMessage = await wsConnect(token, rtcMsgHandlers);
	divApp.classList.remove('hidden');
};

// App stuff

// WebRTC signalling message handlers

async function handleOffer(offer, name) {
	peerUsername = name;
	rtcConnection = new RTCPeerConnection(iceServers); 
	rtcConnection.onicecandidate = function (event) {
		if (event.candidate) { 
			sendMessage(
				peerUsername,
				{ type: "candidate", candidate: event.candidate }); 
		} 
	};

	await rtcConnection.setRemoteDescription(offer);
	//Data channel
	rtcConnection.ondatachannel = function (event) {
		dataChannel = event.channel;

		dataChannel.addEventListener('open', event => {
			console.log('callee dataChannel opened');
		});

		dataChannel.onmessage = function (event) { 
			dataArea.innerHTML = `Data from ${peerUsername}: ${event.data}`;
			dataChannel.send(`Hi ${peerUsername}`);
		};

		dataChannel.onerror = function (error) { 
			console.log("Ooops...error:", error); 
		};

		dataChannel.onclose = dataChannelOnClose;
	};

	rtcConnection.createAnswer(async function (answer) { 
		await rtcConnection.setLocalDescription(answer); 
		console.log('createAnswer setLocalDescription');
		sendMessage(
			peerUsername,
			{ type: "answer", answer: answer });
	}, function (error) { 
		alert("Error when creating an answer"); 
	});

	handleCandidate();
	callBtn.classList.add('hidden');
	hangUpBtn.classList.remove('hidden');
};

async function handleAnswer(answer) { 
	await rtcConnection.setRemoteDescription(answer);
	handleCandidate();
	console.log('answer setRemoteDescription');
	callBtn.classList.add('hidden');
	hangUpBtn.classList.remove('hidden');
};

function handleCandidate(candidate){
	if(candidate == undefined) {
		while(iceBuffer.length > 0) {
			console.log(`add buffered candidate`);
			rtcConnection.addIceCandidate(iceBuffer.pop());
		}
	} else {
		if(rtcConnection == null || rtcConnection.currentRemoteDescription == null) {
			console.log(`buffer candidate`);
			iceBuffer.push(candidate);
		} else {
			console.log(`add candidate`);
			rtcConnection.addIceCandidate(candidate);
		}
	}
}

function handleClose() {
	console.log('closing connection');
	peerUsername = null;
	if(rtcConnection) {
		rtcConnection.close();
	}
	rtcConnection = null;
	callBtn.classList.remove('hidden');
	hangUpBtn.classList.add('hidden');
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
const iceServers = { 'iceServers': [
	{ 'urls': 'stun:stun2.1.google.com:19302' }
]};

let rtcConnection = null;
let peerUsername = null;

//Data channel
let dataChannel = null;

function dataChannelOnClose() { 
	console.log("data channel is closed");
	if(rtcConnection) {
		rtcConnection.close();
	}
	rtcConnection = null;
	dataChannel = null;
	hangUpBtn.classList.add('hidden');
	callBtn.classList.remove('hidden');
	dataArea.innerHTML='';
}

// call button handler
callBtn.addEventListener('click', async (e) => {
	try {	
		rtcConnection = new RTCPeerConnection(iceServers); 
		rtcConnection.onicecandidate = function (event) { 
			if (event.candidate) { 
				sendMessage(
					peerUsername,
					{ type: "candidate", candidate: event.candidate }
				); 
			} 
		};
		
		rtcConnection.addEventListener('connectionstatechange', event => {
			console.log(`rtcConnection.connectionState = ${rtcConnection.connectionState}`);
			if (rtcConnection.connectionState === 'connected') {
				// do something when channel gets to connected state
			}
		});
		 
		if (callToUsernameInput.value.length > 0) { 
			peerUsername = callToUsernameInput.value;

			//Data channel
			dataChannel = rtcConnection.createDataChannel("channel1", {reliable:true});

			dataChannel.addEventListener('open', e => {
				hangUpBtn.classList.remove('hidden');
				callBtn.classList.add('hidden');
				console.log(`caller data channel open`);
				dataChannel.send(`Hi ${peerUsername}`);
			});
	
			console.log(`created dataChannel`);
			dataChannel.onmessage = function (event) {
				dataArea.innerHTML = `Data from ${peerUsername}: ${event.data}`;
			};
	
			dataChannel.onerror = function (error) { 
				console.log("Ooops...error:", error); 
			 };
	
			dataChannel.onclose = dataChannelOnClose;

			rtcConnection.createOffer(async function (offer) {
				offer.app = 'text';
				sendMessage(peerUsername, {type: "offer", offer: offer}); 
				await rtcConnection.setLocalDescription(offer);
				console.log('createOffer setLocalDescription'); 
			}, function (error) { 
				alert("Error when creating an offer", error); 
			});

			hangUpBtn.classList.remove('hidden');
			callBtn.classList.add('hidden');
		}
	} catch(e) {
		alert(`Cannot connect to Brume: ${e}`);
	}
});

// hangup button handler
hangUpBtn.addEventListener("click", function () {
	sendMessage(peerUsername, { type: 'close' }); 
	peerUsername = null;
	if(rtcConnection) { 
		//Data channel
		dataChannel.close();

		rtcConnection.close(); 
		rtcConnection = null;
	}
	hangUpBtn.classList.add('hidden');
	callBtn.classList.remove('hidden');
});
