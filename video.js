'use strict';

/***** Globals *****/

let peerUsername = null;
let rtcConnection = null;
let sendMessage = null;
let localStream = null;

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

const userNameToCall = document.querySelector('input#username-to-call');
const callButton = document.querySelector('button#call');
const closeButton = document.querySelector('button#close-call');
const brumeName = document.querySelector('#brume_name');
const localDiv = document.getElementById('localDiv');
const localButton = document.querySelector('button.local');
const remoteDiv = document.getElementById('remoteDiv');
const remoteButton = document.querySelector('button.remote');

remoteDiv.style.visibility = 'hidden';
localDiv.style.visibility = 'hidden';
localButton.style.textDecoration = 'line-through';
remoteButton.style.textDecoration = 'line-through';

/***** Websocket *****/

function wsConnect(url) {
	return new Promise((res, rej) => {
		let ws = new WebSocket(url);

		ws.onopen = () => {
			console.log('Connected to the signaling server');
			res(sendMessage);
		};

		ws.onclose = () => { 
			ws = null;
		};

		ws.onerror = err => {
			alert(`wsconnect error: ${JSON.stringify(err)}`);
			console.error(`ws.onerror: ${JSON.stringify(err)}`);
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
					switch(data.code) {
						case 'ENODEST':
							alert(`${data.edata.receiver} is not connected`);
							break;
	
						default:
							alert(`peerError: ${data.data}`);
					}
					handleClose();
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
		sendMessage = await wsConnect(`${location.protocol == 'https:' ? 'wss' : 'ws'}://${location.host}?token=${token}`);
		divLogin.style.display = 'none';
		divApp.style.display = 'block';
		alert(`Signed in as ${username}`);
	} catch(e) {
		alert(`Error connecting to Brume server: ${location.protocol == 'https:' ? 'wss' : 'ws'}://${location.host}?token= ...token`);
		delete localStorage.Authorization;
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
		divLogin.classList.toggle('hidden');
		delete localStorage.Authorization;
	}
}

/***** WebRTC video chat *****/

async function makePeerConnection(){
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
	console.log(`create connection`);
	const connection = new RTCPeerConnection({
		iceServers: [{ url: 'stun:stun2.1.google.com:19302' }]
	});

	console.log(`created connection`);

	connection.onclose = e=> {
		handleClose();
	};

	connection. onconnectionstatechange = () => {
		console.log(`connectionState: ${connection.connectionState}`);
		if (["disconnected", "failed", "closed"].includes(connection.connectionState)) {
			console.log(`remote closed connection`);
			handleClose();
		}
	};

	connection.addStream(localStream);

	connection.onaddstream = event => {
		document.querySelector('video#remote').srcObject = event.stream;
	};

	connection.onicecandidate = event => {
		if (event.candidate) {
			sendMessage({
				type: 'candidate',
				candidate: event.candidate
			});
		}
	};
	return connection;
};

callButton.addEventListener('click', async function() {
	peerUsername = document.querySelector('input#username-to-call').value;

	if (peerUsername.length === 0) {
		alert('Enter a username 😉');
		return;
	}

	rtcConnection = await makePeerConnection(true);
	localDiv.style.visibility = '';
	remoteButton.innerHTML = `${peerUsername}'s video`;

	rtcConnection.createOffer(
		offer => {
			sendMessage({
				type: 'offer',
				offer: offer
			});

			rtcConnection.setLocalDescription(offer);
			console.log('createOffer setLocalDescription');
		},
		error => {
			alert('Error when creating an offer');
			console.error(`createOffer error: ${JSON.stringify(error)}`);
		}
	);
});

const handleOffer = async (offer, username) => {
	rtcConnection = await makePeerConnection(true);
	peerUsername = username;
	localDiv.style.visibility = '';
	remoteDiv.style.visibility = '';
	remoteButton.innerHTML = `${peerUsername}'s video`;

	rtcConnection.setRemoteDescription(offer);
	rtcConnection.createAnswer(
		answer => {
			rtcConnection.setLocalDescription(answer);
			console.log('createAnswer setLocalDescription');
			sendMessage({
				type: 'answer',
				name: username, //to work with chat server
				answer: answer
			});
		},
		error => {
			alert('Error when creating an answer');
			console.error(`createAnswer error: ${JSON.stringify(error)}`);
		}
	);
	callButton.classList.toggle('hidden');
	closeButton.classList.toggle('hidden');
	userNameToCall.classList.toggle('hidden');
	console.log(`sent answer`);
};

const handleAnswer = answer => {
	rtcConnection.setRemoteDescription(answer);
	remoteDiv.style.visibility = '';
	callButton.classList.toggle('hidden');
	closeButton.classList.toggle('hidden');
	userNameToCall.classList.toggle('hidden');
};

const handleCandidate = candidate => {
	//console.log(`current remote description: ${connection.currentRemoteDescription != null ? true : false}`);
	rtcConnection.addIceCandidate(candidate); //(new RTCIceCandidate(candidate));
};

document.querySelector('button#close-call').addEventListener('click', () => {
	sendMessage({
		type: 'close'
	});

	handleClose();
});

const handleClose = () => {
	console.log('closing connection');
	peerUsername = null;
	localStream.getTracks().forEach(media => { media.enabled = false; });

	// 10/6
	localStream.getVideoTracks()[0].stop();
	localStream = null;
	firstUserGesture = true;

	//const video = document.querySelector('video#remote'); 10/6
	Array.from(document.getElementsByTagName('video')).forEach(video => {
		video.pause();
		video.src = '';
		video.srcObject = null;  
		video.load();
	});

	callButton.classList.toggle('hidden');
	closeButton.classList.toggle('hidden');
	userNameToCall.classList.toggle('hidden');
	localButton.style.textDecoration = 'line-through';
	localDiv.style.visibility = 'hidden';
	remoteButton.innerHTML = 'Remote video';
	remoteButton.style.textDecoration = 'line-through';
	remoteDiv.style.visibility = 'hidden';
	//initialize label of remote button
	rtcConnection.close();
	rtcConnection = null;
};

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

