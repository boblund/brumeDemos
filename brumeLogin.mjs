'use strict';

export {getToken};

const loginStatus = document.querySelector('#loginStatus');
const LoginPage = {
	Form: {
		Email: document.getElementById('LoginPage.Form.Email'),
		RememberMeChkBx: document.getElementById('LoginPage.Form.RememberMeCkhBx'),
		PasswordDiv: document.getElementById('LoginPage.Form.PasswordDiv'),
		Password: document.getElementById('LoginPage.Form.Password'),
		SubmitLogin: document.getElementById('LoginPage.Form.SubmitLogin'),
		Bi: document.querySelector('i.bi')
	}
};

LoginPage.Form.SubmitLogin.addEventListener('click', processLogin);
LoginPage.Form.Bi.addEventListener('click', doToggle);

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

let loginCallBack = ()=> {};

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

function getToken(cb) {		//es6ify
	loginCallBack = cb;
	if (localStorage.checkbox && localStorage.checkbox !== "") {
		LoginPage.Form.RememberMeChkBx.setAttribute("checked", "checked");
		LoginPage.Form.Email.value = localStorage.email;
	} else {
		LoginPage.Form.RememberMeChkBx.removeAttribute("checked");
		LoginPage.Form.Email.value = "";
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
