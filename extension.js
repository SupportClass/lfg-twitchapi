'use strict';

const request = require('request-promise');
const app = require('express')();
let nodecg;
let accessToken;
let _session;

module.exports = function (extensionApi) {
	nodecg = extensionApi;

	if (!nodecg.config.login.enabled) {
		throw new Error('Login security is not enabled, lfg-twitchapi will not load.');
	}

	if (!nodecg.config.login.twitch.enabled) {
		throw new Error('Twitch authentication is not enabled, lfg-twitchapi will not load.');
	}

	if (!Object.keys(nodecg.bundleConfig).length) {
		throw new Error('No config found in cfg/lfg-twitch.json, aborting!');
	}

	const loginLib = require('../../lib/login');

	// Non-confidential session details are made available to dashboard & view
	const sessionReplicant = nodecg.Replicant('session', {defaultValue: null, persistent: false});

	// Capture the relevant session data the moment our user logs in
	loginLib.on('login', session => {
		const user = session.passport.user;
		_session = session;
		if (user.provider === 'twitch' && user.username === nodecg.bundleConfig.username) {
			// Update the 'session' syncedconst with only the non-confidential information
			sessionReplicant.value = {
				provider: user.provider, // should ALWAYS be 'twitch'
				username: user.username,
				displayName: user.displayName,
				logo: user._json.logo,
				url: user._json._links.self
			};
			accessToken = user.accessToken;
		}
	});

	// If our target user logs out, we can't do anything else until they log back in
	loginLib.on('logout', session => {
		const user = session.passport.user;
		if (user.provider === 'twitch' && user.username === nodecg.bundleConfig.username) {
			sessionReplicant.value = null;
			accessToken = null;
			_session = null;
		}
	});

	app.get('/lfg-twitchapi/checkuser', (req, res) => {
		if (req.session.passport && req.session.passport.user) {
			const user = req.session.passport.user;
			if (user.username === nodecg.bundleConfig.username) {
				// Update the 'session' Replicant with only the non-confidential information
				sessionReplicant.value = {
					provider: user.provider, // should ALWAYS be 'twitch'
					username: user.username,
					displayName: user.displayName,
					logo: user._json.logo,
					url: user._json._links.self
				};
				accessToken = user.accessToken;
				_session = req.session;
			}
		}
		res.sendStatus(200);
	});

	nodecg.mount(app);

	// Return the function used to make API calls, so other bundles can use it
	return {
		get(path, qs, body) {
			return apiCall('GET', path, qs, body);
		},
		post(path, qs, body) {
			return apiCall('POST', path, qs, body);
		},
		put(path, qs, body) {
			return apiCall('PUT', path, qs, body);
		},
		delete(path, qs, body) {
			return apiCall('DELETE', path, qs, body);
		},
		destroySession() {
			if (_session) {
				_session.destroy(err => {
					if (err) {
						nodecg.log.error(err.stack);
					} else {
						const username = _session.passport.user.displayName;
						sessionReplicant.value = null;
						accessToken = null;
						_session = null;
						nodecg.sendMessage('destroyed', username);
					}
				});
			}
		},
		channel: nodecg.bundleConfig.username
	};
};

function apiCall(method = 'GET', path = '', qs = {}, body = {}) {
	const requestOptions = {
		method,
		url: `https://api.twitch.tv/kraken${path}`,
		headers: {
			'Accept': 'application/vnd.twitchtv.v3+json',
			'content-type': 'application/json',
			'Client-ID': nodecg.config.login.twitch.clientID
		},
		qs,
		body,
		json: true,
		resolveWithFullResponse: true,
		simple: false
	};

	// If {{username}} is present in the url string, replace it with the username from bundleConfig
	if (requestOptions.url.indexOf('{{username}}') >= 0) {
		// If we don't have an active session, error
		if (!accessToken) {
			return new Promise((resolve, reject) => {
				process.nextTick(() => {
					reject(`Access token for "${nodecg.bundleConfig.username}" has not been captured yet.` +
						' Once they sign in, this error will stop.');
				});
			});
		}
		requestOptions.url = requestOptions.url.replace('{{username}}', nodecg.bundleConfig.username);
	}

	if (accessToken) {
		requestOptions.headers.Authorization = `OAuth ${accessToken}`;
	}

	return request(requestOptions);
}
