'use strict';

export {getToken};

let brumeLogin = null;

if(customElements.get('brume-login')){
	brumeLogin = document.getElementById('brumeLogin');
	brumeLogin.submitLogin.addEventListener('click', processLogin);
}

brumeLogin.email.value = localStorage?.email ? localStorage.email : '';
brumeLogin.checkbox.checked = localStorage?.checkbox ? localStorage.checkbox : false;

const CLIENTID = '6dspdoqn9q00f0v42c12qvkh5l';
const REGION = 'us-east-1';
const cognito = new AWS.CognitoIdentityServiceProvider({region : REGION});

let loginCallBack = ()=> {};

function processLogin() {
	if (brumeLogin.checkbox.checked && brumeLogin.email.value !== "") {
		localStorage.email = brumeLogin.email.value;
		localStorage.checkbox = brumeLogin.checkbox.checked;
	} else {
		localStorage.email = "";
		localStorage.checkbox = "";
	}
	
	const params = {
		AuthFlow: "USER_PASSWORD_AUTH",
		ClientId: CLIENTID,
		AuthParameters : {
			USERNAME: brumeLogin.email.value,
			PASSWORD: brumeLogin.password.value
		}
	};

	cognito.initiateAuth(params, function(err,data) {
		if (err) {
			// Login fail
			if(err.code == 'NotAuthorizedException') {
				brumeLogin.loginStatus.innerHTML = err.message;
			}
			delete localStorage.Authorization;
			return null;
		} else {
			// Login success
			if(data.ChallengeName && data.ChallengeName == "NEW_PASSWORD_REQUIRED"){
				alert('New Password Required. Change your password at brume.occams.solutions.');
			} else {
				if(brumeLogin.stayLoggedInCb.checked)
					localStorage.Authorization = data.AuthenticationResult.IdToken;
				loginCallBack(data.AuthenticationResult.IdToken);
			}
		}
	});
}

function getToken() {
	return new Promise((res, rej) => {
		loginCallBack = (token) => {
			res(token);
		};
	});
}
