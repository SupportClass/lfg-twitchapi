'use strict';

var nodecg, session;
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

    // `app` is what will get exported. We have to piggyback our `apiCall` function on it.
    app.apiCall = apiCall;

    // On startup, check to see if the desired session already exists in the database
    var foundSession = nodecg.util.findSession({
        'data.passport.user.provider': 'twitch',
        'data.passport.user.username': nodecg.bundleConfig.username
    });

    // If the above step successfully found the session, populate nodecg.variables.session
    if (foundSession) {
        session = foundSession.data;
        nodecg.variables.session = {
            provider: session.passport.user.provider, // should ALWAYS be 'twitch'
            username: session.passport.user.username,
            displayName: session.passport.user.displayName,
            logo: session.passport.user._json.logo,
            url: session.passport.user._json._links.self
        };
    }

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
                session = req.session;
            }
        }
        res.sendStatus(200);
    });

    // Return the function used to make API calls, so other bundles can use it
    return app;
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
        if (!session) {
            return callback(new Error('Session for ' + nodecg.bundleConfig.username + ' has not been captured yet.' +
                '\nOnce they log in to the dashboard, this error will stop.'));
        }
        requestOptions.url = requestOptions.url.replace('{{username}}', nodecg.bundleConfig.username);
    }


    if (session) {
        requestOptions.headers.Authorization = 'OAuth ' + session.passport.user.accessToken;
    }

    request(requestOptions, function (error, response, body) {
        if (error) { return callback(error); }

        try { body = JSON.parse(body); }
        catch (error) { return callback(error); }

        body.channel = nodecg.bundleConfig.username;

        return callback(null, response.statusCode, body);
    });
}
