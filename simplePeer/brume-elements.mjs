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

class Call extends HTMLElement {
	constructor() {
		super();
	}

	connectedCallback() {
		this.innerHTML = `
			<div class="w3-cell-row">
				<div class="w3-container w3-cell">
					<input id = "${this.id}-name" type = "text" 
						placeholder = "username to call" />
				</div>
				<div class="w3-container w3-cell">
					<button id = "${this.id}-callBtn" class = "btn-success btn">Call</button>
					<button id = "${this.id}-hangUpBtn" class = "btn-danger btn">Hang Up</button>					
				</div> 
			</div>
    `;

		this.loaded = true;
		this.callBtn = document.getElementById(`${this.id}-callBtn`);
		this.hangUpBtn = document.getElementById(`${this.id}-hangUpBtn`);
		this.name = document.getElementById(`${this.id}-name`);

		this.callBtn.style.display='';
		this.hangUpBtn.style.display='none';
	}

	call() {
		this.callBtn.style.display='';
		this.hangUpBtn.style.display='none';
	}

	hangUp() {
		this.callBtn.style.display='none';
		this.hangUpBtn.style.display='';
	}
}

customElements.define('brume-call', Call);
