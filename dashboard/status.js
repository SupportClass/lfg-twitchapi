(function () {
	'use strict';

	// Hit the extension endpoint with our cookies so it can capture our session
	fetch('/lfg-twitchapi/checkuser', {method: 'GET', credentials: 'include'});

	var pages = document.querySelector('iron-pages');
	var toast = document.querySelector('nodecg-toast');
	var avatar = document.getElementById('avatar');
	var usernameSpans = Array.prototype.slice.call(document.getElementsByClassName('username'));
	var session = nodecg.Replicant('session');

	usernameSpans.forEach(function (span) {
		span.innerText = nodecg.bundleConfig.username;
	});

	session.on('change', function (oldVal, newVal) {
		if (newVal) {
			pages.selected = 'active';
			avatar.src = newVal.logo;

			if (typeof oldVal === 'object' && Object.keys(oldVal).length === 0) {
				toast.text = '[lfg-twitchapi] ' + newVal.username + ' has signed in.';
				toast.show();
			}
		} else {
			pages.selected = 'inactive';
		}
	});

	nodecg.listenFor('destroyed', function (username) {
		toast.text = '[lfg-twitchapi] ' + username + ' has signed out.';
		toast.show();
	});
})();

