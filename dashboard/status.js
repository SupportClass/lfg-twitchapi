(function () {
	'use strict';

	// Hit the extension endpoint with our cookies so it can capture our session
	fetch('/lfg-twitchapi/checkuser', {method: 'GET', credentials: 'include'});

	const pages = document.querySelector('iron-pages');
	const toast = document.querySelector('nodecg-toast');
	const avatar = document.getElementById('avatar');
	const usernameSpans = Array.prototype.slice.call(document.getElementsByClassName('username'));
	const session = nodecg.Replicant('session');

	usernameSpans.forEach(span => {
		span.innerText = nodecg.bundleConfig.username;
	});

	session.on('change', (newVal, oldVal) => {
		if (newVal) {
			pages.selected = 'active';
			avatar.src = newVal.logo;

			if (typeof oldVal === 'object' && Object.keys(oldVal).length === 0) {
				toast.text = `[lfg-twitchapi] ${newVal.username} has signed in.`;
				toast.show();
			}
		} else {
			pages.selected = 'inactive';
		}
	});

	nodecg.listenFor('destroyed', username => {
		toast.text = `[lfg-twitchapi] ${username} has signed out.`;
		toast.show();
	});
})();
