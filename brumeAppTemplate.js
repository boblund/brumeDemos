'use strict';

import {wsConnect} from './websocket.mjs';
import {getToken} from './brumeLogin.mjs';

const wsRoutes = {};
let sendMessage = null;
let token = null;


const divLogin = document.querySelector('div#login');
const divApp = document.querySelector('div#app');

divLogin.classList.add('hidden');
divApp.classList.add('hidden');
token = getToken(loginCallBack);

if(token != null) {
	divLogin.classList.add('hidden');
	divApp.classList.remove('hidden');
} else {
	divLogin.classList.remove('hidden');
}

function loginCallBack(brumeToken) {
	token = brumeToken;
	divLogin.classList.add('hidden');
	divApp.classList.remove('hidden');
};

// Do app stuff

document.querySelector('#startAppBtn').addEventListener('click', async (e) => {
	try {	
		sendMessage = await wsConnect(token, wsRoutes);
		alert(`Connected to brume server`);
		document.querySelector('#startAppBtn').classList.add('hidden');
	} catch(e) {
		alert(`Cannot connect to Brume: ${e}`);
	}
});
