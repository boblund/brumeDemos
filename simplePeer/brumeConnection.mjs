'use strict';

export {BrumeConnection};
import {getToken} from '../brumeLogin.mjs';
import {BrumePeer} from './brumePeer.mjs';

const delay = t => new Promise(resolve => setTimeout(resolve, t));
const loginWait = new EventTarget();

let token = null,
	myName = null;

const divLogin = document.querySelector('div#login');
const divApp = document.querySelector('div#app');


divLogin.classList.add('hidden');
divApp.classList.add('hidden');

token = getToken(_token => {
	token = _token;
	divLogin.classList.add('hidden');
	divApp.classList.remove('hidden');
	loginWait.dispatchEvent(new CustomEvent('loggedIn'));
});

if(token != null) {
	// Delay if reload due to AWS websocket connect/disconnect race condition
	await delay(sessionStorage.reload ? 1000 : 0);
	divLogin.classList.add('hidden');
	divApp.classList.remove('hidden');
	sessionStorage.reload = 'yes';
} else {
	divLogin.classList.remove('hidden');
}

function BrumeConnection(offerHandler) {
	if(token) {
		myName = JSON.parse(atob(token.split('.')[1]))['custom:brume_name'];
		return (async () => {
			const brumeConnection = await (new BrumePeer(myName, offerHandler, token));
			return brumeConnection;
		})();
	} else {
		return new Promise((res, rej) => {
			loginWait.addEventListener('loggedIn', async () => {
				const brumeConnection = await (new BrumePeer(myName, offerHandler, token));
				res(brumeConnection);
			});
		});
	}
};
