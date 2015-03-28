'use strict';

var nodecg, _session;
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

    // Non-confidential session details are made available to dashboard & view
    nodecg.declareSyncedVar({ name: 'session', initialVal: {} });

    // On startup, check to see if the desired session already exists in the database
    nodecg.util.findSession({
        'data.passport.user.provider': 'twitch',
        'data.passport.user.username': nodecg.bundleConfig.username
    }, function(err, session) {
        if (err) {
            nodecg.log.error(err.stack);
            return;
        }

        // If we successfully found the session, populate nodecg.variables.session
        if (session) {
            _session = session.data; // store globally for use later
            var user = _session.passport.user;
            nodecg.variables.session = {
                provider: user.provider, // should ALWAYS be 'twitch'
                username: user.username,
                displayName: user.displayName,
                logo: user._json.logo,
                url: user._json._links.self
            };
        }
    });

    app.get('/lfg-twitchapi/checkuser', function(req, res){
        if (req.session.passport && req.session.passport.user) {
            var user = req.session.passport.user;
            if (user.username === nodecg.bundleConfig.username) {
                // Update the 'session' syncedVar with only the non-confidential information
                nodecg.variables.session = {
                    provider: user.provider, // should ALWAYS be 'twitch'
                    username: user.username,
                    displayName: user.displayName,
                    logo: user._json.logo,
                    url: user._json._links.self
                };
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
            nodecg.util.findSession({
                'data.passport.user.provider': 'twitch',
                'data.passport.user.username': nodecg.bundleConfig.username
            }, function(err, session) {
                if (err) {
                    nodecg.log.error(err.stack);
                    return;
                }

                // If we successfully found the session, populate nodecg.variables.session
                if (session) {
                    nodecg.util.destroySession(session.sid, function(err) {
                        if (err) { nodecg.log.error(err.stack); }
                    });
                } else {
                    nodecg.log.warn('Couldn\'t destroy non-existent session for "%s"', nodecg.bundleConfig.username);
                }
            });
        }
    };
};

function apiCall(method, path, options, callback) {
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
        if (!_session) {
            return callback(new Error('Session for "' + nodecg.bundleConfig.username + '" has not been captured yet.' +
                ' Once they log in to the dashboard, this error will stop.'));
        }
        requestOptions.url = requestOptions.url.replace('{{username}}', nodecg.bundleConfig.username);
    }


    if (_session) {
        requestOptions.headers.Authorization = 'OAuth ' + _session.passport.user.accessToken;
    }

    request(requestOptions, function (error, response, body) {
        if (error) { return callback(error); }

        try { body = JSON.parse(body); }
        catch (error) { return callback(error); }

        body.channel = nodecg.bundleConfig.username;

        return callback(null, response.statusCode, body);
    });
}
