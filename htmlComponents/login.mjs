'use strict';

//https://medium.com/front-end-weekly/how-to-build-reusable-html-components-without-component-based-frameworks-2f7747f4c5db
//https://web.dev/custom-elements-v1/

export {elementLoaded};

const delay = t => new Promise(resolve => setTimeout(resolve, t));
function elementLoaded(id) {
	return new Promise(async (res, rej) => {
		const el = document.getElementById(id);
		while(true){
			if(el.loaded) {
				break;
			} else {
				await delay(10);
			}
		}
		res(el);
	});
}

class Login extends HTMLElement {
	instance = this;
	name;
	constructor() {
		super();
	}

	connectedCallback() {
		
		this.innerHTML = `
			<div id="${this.id}-login" class="hidden">
				<form onsubmit="event.preventDefault()">

					<div>
						<input type="text" placeholder="Email" name="email" id="${this.id}-email">
						<input type="checkbox" value="lsRememberMe" id="${this.id}-rememberMeChkBx">
						<label for="${this.id}-rememberMeCkhBx">Remember me</label>
					</div>

					<div>
						<input type="password" placeholder="Password" class="bieye" id="${this.id}-password">
						<i class="bi bi-eye-slash" for="${this.id}-password" id="${this.id}-i"></i>
					</div>

					<div id="${this.id}-loginStatus"></div></br>

					<input type="submit" class="w3-teal" value="Login" id="${this.id}-submitLogin">
				</form>
			</div>
    `;

		this.loaded = true;
		this.email = document.getElementById(`${this.id}-email`);
		this.password = document.getElementById(`${this.id}-password`);
		this.rememberMeChkBx = document.getElementById(`${this.id}-rememberMeChkBx`);
		this.submitLogin = document.getElementById(`${this.id}-submitLogin`);

		const bi = document.getElementById(`${this.id}-i`);
		bi.addEventListener('click', doToggle);

		function doToggle(event) {
			// toggle the type attribute
			let password = document.getElementById(event.currentTarget.attributes.getNamedItem('for').value);
			password.type = password.type === "password" ? "text" : "password";
			// toggle the icon
			event.currentTarget.classList.toggle("bi-eye");
		}
	}
}

customElements.define('custom-login', Login);




