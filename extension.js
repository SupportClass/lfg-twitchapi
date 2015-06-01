'use strict';

var nodecg, accessToken, _session;
var request = require('request');
var querystring = require('querystring');
var app = require('express')();

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

    if (!nodecg.bundleConfig.username) {
        throw new Error('"username" key not present in cfg/lfg-twitch.json, aborting!');
    }

    var loginLib = require('../../lib/login');

    // Non-confidential session details are made available to dashboard & view
    var sessionReplicant = nodecg.Replicant('session', { defaultValue: null, persistent: false });

    // Capture the relevant session data the moment our user logs in
    loginLib.on('login', function(session) {
        var user = session.passport.user;
        _session = session;
        if (user.provider === 'twitch' && user.username === nodecg.bundleConfig.username) {
            // Update the 'session' syncedVar with only the non-confidential information
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
    loginLib.on('logout', function(session) {
        var user = session.passport.user;
        if (user.provider === 'twitch' && user.username === nodecg.bundleConfig.username) {
            sessionReplicant.value = null;
            accessToken = null;
            _session = null;
        }
    });

    app.get('/lfg-twitchapi/checkuser', function(req, res){
        if (req.session.passport && req.session.passport.user) {
            var user = req.session.passport.user;
            if (user.username === nodecg.bundleConfig.username) {
                // Update the 'session' syncedVar with only the non-confidential information
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
        get: function(path, options, callback) {
            apiCall('GET', path, options, callback);
        },
        post: function(path, options, callback) {
            apiCall('POST', path, options, callback);
        },
        put: function(path, options, callback) {
            apiCall('PUT', path, options, callback);
        },
        delete: function(path, options, callback) {
            apiCall('DELETE', path, options, callback);
        },
        destroySession: function() {
            if (_session) {
                _session.destroy(function(err) {
                    if (err) {
                        nodecg.log.error(err.stack);
                    } else {
                        var username = _session.passport.user.displayName;
                        sessionReplicant.value = null;
                        accessToken = null;
                        _session = null;
                        nodecg.sendMessage('destroyed', username);
                    }
                });
            }
        }
    };
};

function apiCall(method, path, options, callback) {
    if (typeof callback === 'undefined' && typeof options === 'function') {
        callback = options;
        options = {};
    }
    method = typeof method !== 'undefined' ? method : 'GET';
    path = typeof path === 'string' ? path : '';
    options = typeof options !== 'undefined' ? options : {};
    callback = typeof callback === 'function' ? callback : function () {};

    options = querystring.stringify(options);

    var requestOptions = {
        url: 'https://api.twitch.tv/kraken' + path + (options ? '?' + options : ''),
        headers: {
            'Accept': 'application/vnd.twitchtv.v3+json',
            'Client-ID': nodecg.config.login.twitch.clientID
        },
        method: method
    };

    // If {{username}} is present in the url string, replace it with the username from bundleConfig
    if (requestOptions.url.indexOf('{{username}}') >= 0) {
        // If we don't have an active session, error
        if (!accessToken) {
            return callback(new Error('Access token for "' + nodecg.bundleConfig.username + '" has not been captured yet.' +
                ' Once they sign in, this error will stop.'));
        }
        requestOptions.url = requestOptions.url.replace('{{username}}', nodecg.bundleConfig.username);
    }


    if (accessToken) {
        requestOptions.headers.Authorization = 'OAuth ' + accessToken;
    }

    request(requestOptions, function (error, response, body) {
        if (error) { return callback(error); }

        try { body = JSON.parse(body); }
        catch (error) { return callback(error); }

        body.channel = nodecg.bundleConfig.username;

        return callback(null, response.statusCode, body);
    });
}
