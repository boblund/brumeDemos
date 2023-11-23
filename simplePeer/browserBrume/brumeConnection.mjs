'use strict';

export {BrumeConnection};
import {Brume} from './Brume.mjs';
import {getToken} from './brumeLogin.mjs';

const delay = t => new Promise(resolve => setTimeout(resolve, t));
const loginWait = new EventTarget();

let token = null,
	myName = null;

const divLogin = document.querySelector('div#login');
const divApp = document.querySelector('div#app');

function appLoginDisplay(state) {
	switch(state) {
		case 'none':
			divLogin.style.display = 'none';
			divApp.style.display = 'none';
			break;

		case 'login':
			divLogin.style.display = '';
			divApp.style.display = 'none';
			break;

		case 'app':
			divLogin.style.display = 'none';
			divApp.style.display = '';
			break;
		
		default:
	}
}

appLoginDisplay('none');

token = getToken(_token => {
	token = _token;
	myName = JSON.parse(atob(token.split('.')[1]))['custom:brume_name'];
	appLoginDisplay('app');
	loginWait.dispatchEvent(new CustomEvent('loggedIn'));
});

if(token != null) {
	// Delay if reload due to AWS websocket connect/disconnect race condition
	await delay(sessionStorage.reload ? 1000 : 0);
	appLoginDisplay('app');
	sessionStorage.reload = 'yes';
} else {
	appLoginDisplay('login');
}

function BrumeConnection(offerHandler) {
	const brumeConnection = new Brume();
	brumeConnection.onconnection = offerHandler;
	if(token) {
		myName = JSON.parse(atob(token.split('.')[1]))['custom:brume_name'];
		return (async () => {
			await brumeConnection.start({token, url: 'wss://brume.occams.solutions/Prod'});
			return brumeConnection;
		})();
	} else {
		return new Promise((res, rej) => {
			loginWait.addEventListener('loggedIn', async (e) => {
				await brumeConnection.start({token, url: 'wss://brume.occams.solutions/Prod'});
				res(brumeConnection);
			});
		});
	}
};
