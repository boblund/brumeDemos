'use strict';

// UI
const callToUsernameInput = document.querySelector('#callToUsernameInput');
const chatBtn = document.querySelector('#chatBtn');
const videoBtn = document.querySelector('#videoBtn');
const fileBtn = document.querySelector('#fileBtn');
const hangUpBtn = document.querySelector('#hangUpBtn');
const brumeBtn = document.querySelector('#brumeBtn');
const msgInput = document.querySelector('#msgInput');
const sendMsgBtn = document.querySelector('#sendMsgBtn');
const chatArea = document.querySelector('#chatarea');
const chatInput = document.querySelector('#chatInput');

chatBtn.disabled = true;
sendMsgBtn.disabled = true;
hangUpBtn.disabled = true;

const iceServers = { 'iceServers': [
	{ 'urls': 'stun:stun2.1.google.com:19302' }/*,
	{ 'urls': 'stun:stun.stunprotocol.org:3478' },
	{ 'urls': 'stun:stun.l.google.com:19302' },*/
]};

//var name; 
var connectedUser;
var peerConnection = null; 
var dataChannel = null;
var rtcMode = null;
var remoteDescriptionSet = false;
var iceBuffer = [];

const ws  = (function() {
	var wsServer = {};

	const open = function () {
		return new Promise((res, rej) => {
			//https://websockets.readthedocs.io/en/stable/topics/authentication.html
			wsServer = new WebSocket(`wss://bobsm1.local:3000?token=${localStorage.Authorization}`); 

			wsServer.onopen = function () { 
				console.log("Connected to the signaling server");
				res();
			};
			
			//when we got a message from a signaling server
			wsServer.onmessage = function (msg) {  
				var data = JSON.parse(msg.data);
				data = {...data.data, name: data.from};
				console.log(`Got message ${data.type} from ${data.name}`);
				
				switch(data.type) {   
					case "offer": 
						handleOffer(data.offer, data.name);
						break;

					case "answer": 
						handleAnswer(data.answer); 
						break;

					case "candidate": 
						handleCandidate(data.candidate); 
						break;
					default:
						break; 
				} 
			};

			wsServer.onerror = function (err) { 
				//console.log("Got error", err);
				rej(err);
			};
		});
	};

	//alias for sending JSON encoded messages 
	const send = function(message) {
		if (connectedUser) { 
			wsServer.send(JSON.stringify({
				action: 'send',
				to: connectedUser,
				data: {
					...message
				}
			}));
		}
	};

	const close = function() {
		wsServer.close();
	};

	return {open, send, close};
})();

//connect to ws server
brumeBtn.addEventListener("click", async function () {
	if(brumeBtn.textContent == 'Brume Connect') {
		try {
			await ws.open();
			chatBtn.disabled = false;
			brumeBtn.textContent = 'Brume Disconnect';
		} catch(e) {
			alert(`Error connecting to Brume: ${e}`);
		}
	} else {
		ws.close();
		brumeBtn.textContent = 'Brume Connect';
		chatBtn.disabled = true;
		videoBtn.disabled = true;
		fileBtn.disabled = true;
	}
});

function dataChannelOnClose() {
	console.log("data channel is closed");
	peerConnection = null;
	dataChannel = null;
	chatArea.innerHTML = '';
	hangUpBtn.disabled = true;
	sendMsgBtn.disabled = true;
	chatBtn.disabled = false;
	chatArea.style.display = 'none';
	chatInput.style.display = 'none';
}

/*
*	https://webrtc.org/getting-started/overview
*/

// Initiate chat
chatBtn.addEventListener("click", function () {
	peerConnection = new RTCPeerConnection(iceServers); 
	peerConnection.onicecandidate = function (event) { 
		if (event.candidate) { 
			ws.send({ type: "candidate", candidate: event.candidate }); 
		} 
	}; 
   
	if (callToUsernameInput.value.length > 0) { 
		connectedUser = callToUsernameInput.value;
		dataChannel = peerConnection.createDataChannel("channel1", {reliable:true});

		//when we receive a message from the other peer, display it on the screen 
		dataChannel.onmessage = function (event) { 
			chatArea.innerHTML += connectedUser + ": " + event.data + "<br />"; 
			chatArea.scrollTop = chatArea.scrollHeight;
		};

		dataChannel.onerror = function (error) { 
			console.log("Ooops...error:", error); 
		 };

		 dataChannel.onclose = dataChannelOnClose;
		// create an offer 
		peerConnection.createOffer(async function (offer) {
			offer.app = 'text';
			ws.send({ type: "offer", offer: offer }); 
			await peerConnection.setLocalDescription(offer);
			console.log('createOffer setLocalDescription'); 
		}, function (error) { 
			alert("Error when creating an offer", error); 
		});

		rtcMode = 'chat';
		hangUpBtn.disabled = false;
		chatBtn.disabled = true;
		chatArea.style.display = '';
		chatInput.style.display = '';
	} 
   
});

// Hang up chat
hangUpBtn.addEventListener("click", function () {  
	connectedUser = null;
	if(peerConnection) { 
		peerConnection.close(); 
		peerConnection.onicecandidate = null;
		chatArea.style.display = 'none';
		chatInput.style.display = 'none';
	}
});
 
// Chat send
sendMsgBtn.addEventListener("click", function (event) { 
	var val = msgInput.value; 
	chatArea.innerHTML += name + ": " + val + "<br />";
	chatArea.scrollTop = chatArea.scrollHeight;
   
	//sending a message to a connected peer 
	dataChannel.send(val); 
	msgInput.value = ""; 
});
 
// Handle WebRTC offer
async function handleOffer(offer, name) {
	const offerMeda = offer.sdp
		.split('\r\nm=').slice(1)
		.map(e=>e.split('\r\n')[0].split(' ')[0]);

	//93
	peerConnection = new RTCPeerConnection(iceServers); 
		
	// 104 
	peerConnection.onicecandidate = function (event) {
		if (event.candidate) { 
			ws.send({ type: "candidate", candidate: event.candidate }); 
		} 
	};

	connectedUser = name; // 142
	const appType = offer.app;
	delete offer.app;
	await peerConnection.setRemoteDescription(offer); //(new RTCSessionDescription(offer));
	remoteDescriptionSet = true;
	handleCandidate();
	console.log('offer setRemoteDescription');
  
	switch(appType) {
		case 'av':
			let localStream; //74
			try {
				localStream = await navigator.mediaDevices.getUserMedia({
					video: true,
					audio: true
				});
			} catch (error) {
				alert(`${error.name}`);
				console.error(error);
			}
			// 86
			document.querySelector('video#local').srcObject = localStream;
			// 96
			peerConnection.addStream(localStream);
			// 99
			peerConnection.onaddstream = event => {
				document.querySelector('video#remote').srcObject = event.stream;
			};
			//143
			//await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
			break;

		case 'text':
			peerConnection.ondatachannel = function (event) {
				sendMsgBtn.disabled = false;
				chatArea.style.display = '';
				chatInput.style.display = '';
				console.log('dataChannel opened');
				dataChannel = event.channel;
		
				dataChannel.onmessage = function (event) { 
					chatArea.innerHTML += connectedUser + ": " + event.data + "<br />";
					chatArea.scrollTop = chatArea.scrollHeight;
				};

				dataChannel.onerror = function (error) { 
					console.log("Ooops...error:", error); 
				};

				dataChannel.onclose = dataChannelOnClose;
			};
			chatBtn.disabled = true;
			break;
		
		case 'file':
			break;

		default:
			console.error(`Unknown offer.app: ${offer.ap}`);
	}

	// 144
	peerConnection.createAnswer(async function (answer) { 
		await peerConnection.setLocalDescription(answer); 
		console.log('createAnswer setLocalDescription');
		ws.send({ type: "answer", answer: answer });
		handleCandidate();
	}, function (error) { 
		alert("Error when creating an answer"); 
	});

	hangUpBtn.disabled = false;
};
 
// Handle WebRTC answer 
async function handleAnswer(answer) { 
	await peerConnection.setRemoteDescription(answer); //(new RTCSessionDescription(answer));
	remoteDescriptionSet = true;
	handleCandidate();
	console.log('answer setRemoteDescription');
	sendMsgBtn.disabled = false;
};
 
// Handle WebRTC ice candidate 
// If candidate undefined this is call to handle any buffered candidates
async function handleCandidate(candidate) {
	//if(peerConnection) {
	if(remoteDescriptionSet) {
		// handle any buffered candidates then this one, if present
		if(candidate) iceBuffer.push(candidate);
		let entry = null;
		while((entry = iceBuffer.shift())) {
			try {
				console.log(`current remote description: ${peerConnection.currentRemoteDescription != null ? true : false}`);
				await peerConnection.addIceCandidate(entry);
			} catch(e) {
				console.error(`peerConnection.addIceCandidate error: ${e}`);
			}
		}
	} else {
		if(candidate) iceBuffer.push(candidate); // should always be a candidate
	}
	//};
};