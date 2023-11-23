'use strict';

export {getToken};

let brumeLogin = null;

if(customElements.get('brume-login')){
	brumeLogin = document.getElementById('brumeLogin');
	brumeLogin.submitLogin.addEventListener('click', processLogin);
}

const CLIENTID = '6dspdoqn9q00f0v42c12qvkh5l';
const REGION = 'us-east-1';
const cognito = new AWS.CognitoIdentityServiceProvider({region : REGION});

let loginCallBack = ()=> {};

function processLogin() {
	if (brumeLogin.checkbox.checked && brumeLogin.email.value !== "") {
		localStorage.email = brumeLogin.email.value;
		localStorage.checkbox = brumeLogin.checkbox.value;
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
				localStorage.Authorization = data.AuthenticationResult.IdToken;
				loginCallBack(data.AuthenticationResult.IdToken);
			}
		}
	});
}

function getToken(cb, _brumeLogin) {		//es6ify
	loginCallBack = cb;
	if(_brumeLogin) {
		brumeLogin = _brumeLogin;
		brumeLogin.submitLogin.addEventListener('click', processLogin);
	}
	
	if (localStorage.checkbox && localStorage.checkbox !== "") {
		brumeLogin.checkbox.setAttribute("checked", "checked");
		brumeLogin.email.value = localStorage.email;
	} else {
		//brumeLogin.checkBox.removeAttribute("checked");
		brumeLogin.email.value = "";
	}

	if(localStorage.Authorization && localStorage.Authorization != '') {
		if(new Date(JSON.parse(atob(localStorage.Authorization.split('.')[1])).exp * 1000) >= new Date()) {
			return (localStorage.Authorization);
		} else {
			delete localStorage.Authorization;
			return null;
		}
	} else {
		return null;
	}
};
