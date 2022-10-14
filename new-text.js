'use strict';

/***** Globals *****/

let peerUsername = null;
let rtcConnection = null;
let sendMessage = null;
let dataChannel = null;
let remoteDescriptionSet = false;
let iceBuffer = [];
const iceServers = { 'iceServers': [
	{ 'urls': 'stun:stun2.1.google.com:19302' }
]};

/***** Generic Login/App UI sections *****/

const divLogin = document.querySelector('div#login');
const loginStatus = document.querySelector('#loginStatus');
const LoginPage = {
	Form: {
		Email: document.getElementById('LoginPage.Form.Email'),
		RememberMeChkBx: document.getElementById('LoginPage.Form.RememberMeCkhBx'),
		PasswordDiv: document.getElementById('LoginPage.Form.PasswordDiv'),
		Password: document.getElementById('LoginPage.Form.Password'),
		SubmitLogin: document.getElementById('LoginPage.Form.SubmitLogin')
	}
};

const divApp = document.querySelector('div#app');
divApp.style.display = 'none';

/***** App specific UI sections *****/

const callToUsernameInput = document.querySelector('#callToUsernameInput');
const chatBtn = document.querySelector('#chatBtn');
const hangUpBtn = document.querySelector('#hangUpBtn');
const msgInput = document.querySelector('#msgInput');
const sendMsgBtn = document.querySelector('#sendMsgBtn');
const chatArea = document.querySelector('#chatarea');
const chatInput = document.querySelector('#chatInput');

chatArea.classList.add('hidden');
chatInput.classList.add('hidden');
hangUpBtn.classList.add('hidden');

/***** Websocket *****/

function wsConnect(url, handlers) {
	return new Promise((res, rej) => {
		let ws = new WebSocket(url);

		ws.onopen = () => {
			console.log('Connected to the signaling server');
			res(sendMessage);
		};

		ws.onclose = (event) => { 
			ws = null;
		};

		ws.onerror = err => {
			rej(null);
		};

		ws.onmessage = msg => {
			const data = JSON.parse(msg.data);
			const type = data.type == 'peerError' ? data.type : data.data.type;
			console.log('Got message', type);

			switch (type) {
				case 'offer':
					handlers[type](data.data.offer, data.from);
					break;
	
				case 'answer':
					handlers[type](data.data.answer);
					break;
	
				case 'candidate':
					handlers[type](data.data.candidate);
					break;

				case 'close':
					handlers[type]();
					break;

				case 'peerError':
					handlers[type](data);
					break;
	
				default:
					break;
			}
		};

		function sendMessage(message){
			/*if (peerUsername) {
				message.name = peerUsername;
			}*/

			if(ws == null) {
				return false;
			}
		
			ws.send(JSON.stringify({
				action: 'send',
				to: peerUsername,
				data: {
					...message
				}
			}));
			return true;
		}
	});
}
/*
function wsConnect(url) {
	return new Promise((res, rej) => {
		let ws = new WebSocket(url);

		ws.onopen = () => {
			console.log('Connected to the signaling server');
			res(sendMessage);
		};

		ws.onclose = (event) => { 
			ws = null;
		};

		ws.onerror = err => {
			rej(null);
		};

		ws.onmessage = msg => {
			const data = JSON.parse(msg.data);
			const type = data.type == 'peerError' ? data.type : data.data.type;
			console.log('Got message', type);
	
			switch (type) {
				case 'offer':
					handleOffer(data.data.offer, data.from);
					break;
	
				case 'answer':
					handleAnswer(data.data.answer);
					break;
	
				case 'candidate':
					handleCandidate(data.data.candidate);
					break;

				case 'close':
					handleClose();
					break;

				case 'peerError':
					handlePeerError(data);
					break;
	
				default:
					break;
			}
		};

		function sendMessage(message){
			if(ws == null) {
				return false;
			}
		
			ws.send(JSON.stringify({
				action: 'send',
				to: peerUsername,
				data: {
					...message
				}
			}));
			return true;
		}
	});
}
*/

const rtcSigHandlers = {
	offer: handleOffer,
	answer: handleAnswer,
	candidate: handleCandidate,
	close: handleClose,
	peerError: handlePeerError
};

/***** Brume login *****/

const CLIENTID = '6dspdoqn9q00f0v42c12qvkh5l';
const REGION = 'us-east-1';
const cognito = new AWS.CognitoIdentityServiceProvider({region : REGION});

function doToggle(event) {
	// toggle the type attribute
	let password = document.getElementById(event.currentTarget.attributes.getNamedItem('for').value);
	password.type = password.type === "password" ? "text" : "password";
	// toggle the icon
	event.currentTarget.classList.toggle("bi-eye");
}

async function loggedIn(token) {
	let username = JSON.parse(atob(token.split('.')[1]))['custom:brume_name'];
	try {
		sendMessage = await wsConnect(
			`${location.protocol == 'https:' ? 'wss' : 'ws'}://${location.host}?token=${token}`,
			rtcSigHandlers
		);
		divLogin.style.display = 'none';
		divApp.style.display = 'block';
		alert(`Signed in as ${username}`);
	} catch(e) {
		alert(`Brume server error. Try reloading this page`);
		//delete localStorage.Authorization;
		divLogin.classList.remove('hidden');
		divApp.classList.add('hidden');
	}
}

function processLogin() {
	if (LoginPage.Form.RememberMeChkBx.checked && LoginPage.Form.Email.value !== "") {
		localStorage.email = LoginPage.Form.Email.value;
		localStorage.checkbox = LoginPage.Form.RememberMeChkBx.value;
	} else {
		localStorage.email = "";
		localStorage.checkbox = "";
	}

	const params = {
		AuthFlow: "USER_PASSWORD_AUTH",
		ClientId: CLIENTID,
		AuthParameters : {
			USERNAME: LoginPage.Form.Email.value,
			PASSWORD: LoginPage.Form.Password.value
		}
	};

	cognito.initiateAuth(params, function(err,data) {
		if (err) {
			// Login fail
			if(err.code == 'NotAuthorizedException') {
				loginStatus.innerHTML = err.message;
			}
			delete localStorage.Authorization;
		} else {
			// Login success
			if(data.ChallengeName && data.ChallengeName == "NEW_PASSWORD_REQUIRED"){
				alert('New Password Required. Change your password at brume.occams.solutions.');
			} else {
				localStorage.Authorization = data.AuthenticationResult.IdToken;
				loggedIn(localStorage.Authorization);
			}
		}
	});
}

if (localStorage.checkbox && localStorage.checkbox !== "") {
	LoginPage.Form.RememberMeChkBx.setAttribute("checked", "checked");
	LoginPage.Form.Email.value = localStorage.email;
} else {
	LoginPage.Form.RememberMeChkBx.removeAttribute("checked");
	LoginPage.Form.Email.value = "";
}

if(localStorage.Authorization && localStorage.Authorization != '') {
	if(new Date(JSON.parse(atob(localStorage.Authorization.split('.')[1])).exp * 1000) >= new Date()) {
		loggedIn(localStorage.Authorization);
	} else {
		delete localStorage.Authorization;
		divLogin.classList.toggle('hidden');
	}
} else {
	divLogin.classList.toggle('hidden');
}

/***** WebRTC text chat *****/

function dataChannelOnClose() {
	console.log("data channel is closed");
	rtcConnection.close();
	rtcConnection = null;
	dataChannel = null;
	chatArea.innerHTML = '';
	hangUpBtn.classList.add('hidden');
	chatBtn.classList.remove('hidden');
	chatArea.classList.add('hidden');
	chatInput.classList.add('hidden');
}

/*
*	https://webrtc.org/getting-started/overview
*/

// Initiate chat
chatBtn.addEventListener("click", function () {
	rtcConnection = new RTCPeerConnection(iceServers); 
	rtcConnection.onicecandidate = function (event) { 
		if (event.candidate) { 
			sendMessage({ type: "candidate", candidate: event.candidate }); 
		} 
	}; 
   
	if (callToUsernameInput.value.length > 0) { 
		peerUsername = callToUsernameInput.value;
		dataChannel = rtcConnection.createDataChannel("channel1", {reliable:true});

		dataChannel.addEventListener('open', e => {
			console.log(`caller data channel open`);
		});

		console.log(`created dataChannel`);
		//when we receive a message from the other peer, display it on the screen 
		dataChannel.onmessage = function (event) { 
			chatArea.innerHTML += peerUsername + ": " + event.data + "<br />"; 
			chatArea.scrollTop = chatArea.scrollHeight;
		};

		dataChannel.onerror = function (error) { 
			console.log("Ooops...error:", error); 
		 };

		 dataChannel.onclose = dataChannelOnClose;
		// create an offer 
		rtcConnection.createOffer(async function (offer) {
			offer.app = 'text';
			sendMessage({ type: "offer", offer: offer }); 
			await rtcConnection.setLocalDescription(offer);
			console.log('createOffer setLocalDescription'); 
		}, function (error) { 
			alert("Error when creating an offer", error); 
		});

		hangUpBtn.classList.remove('hidden');
		chatBtn.classList.add('hidden');
		chatArea.classList.remove('hidden');
		chatInput.classList.remove('hidden');
	} 
   
});

// Hang up chat
hangUpBtn.addEventListener("click", function () {  
	peerUsername = null;
	if(rtcConnection) { 
		dataChannel.close();
		rtcConnection.close(); 
		rtcConnection.onicecandidate = null;
		hangUpBtn.classList.add('hidden');
		chatBtn.classList.remove('hidden');
		chatArea.classList.add('hidden');
		chatInput.classList.add('hidden');
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

async function handleOffer(offer, name) {
	rtcConnection = new RTCPeerConnection(iceServers); 
	rtcConnection.onicecandidate = function (event) {
		if (event.candidate) { 
			sendMessage({ type: "candidate", candidate: event.candidate }); 
		} 
	};

	peerUsername = name;
	await rtcConnection.setRemoteDescription(offer); 
	remoteDescriptionSet = true;
	handleCandidate();
	console.log('offer setRemoteDescription');
  

	rtcConnection.ondatachannel = function (event) {
		dataChannel = event.channel;

		dataChannel.addEventListener('open', event => {
			console.log('callee dataChannel opened');
			hangUpBtn.classList.toggle('hidden');
			chatBtn.classList.toggle('hidden');
			chatArea.classList.toggle('hidden');
			chatInput.classList.toggle('hidden');
		});

		dataChannel.onmessage = function (event) { 
			chatArea.innerHTML += peerUsername + ": " + event.data + "<br />";
			chatArea.scrollTop = chatArea.scrollHeight;
		};

		dataChannel.onerror = function (error) { 
			console.log("Ooops...error:", error); 
		};

		dataChannel.onclose = dataChannelOnClose;
	};

	rtcConnection.createAnswer(async function (answer) { 
		await rtcConnection.setLocalDescription(answer); 
		console.log('createAnswer setLocalDescription');
		sendMessage({ type: "answer", answer: answer });
		handleCandidate();
	}, function (error) { 
		alert("Error when creating an answer"); 
	});

	hangUpBtn.disabled = false;
};

async function handleAnswer(answer) { 
	await rtcConnection.setRemoteDescription(answer); //(new RTCSessionDescription(answer));
	remoteDescriptionSet = true;
	handleCandidate();
	console.log('answer setRemoteDescription');
	sendMsgBtn.disabled = false;
};

function handleCandidate(candidate){
	console.log(`current remote description: ${rtcConnection.currentRemoteDescription != null ? true : false}`);
	if(rtcConnection){
		rtcConnection.addIceCandidate(candidate);
	}
}

function handleClose() {
	console.log('closing connection');
	peerUsername = null;
	if(rtcConnection) {
		rtcConnection.close();
	}
	rtcConnection = null;
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
