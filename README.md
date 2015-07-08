# lfg-twitchapi
This is a [NodeCG](http://github.com/nodecg/nodecg) bundle.

Lets other bundles easily query the Twitch API on behalf of a logged in user.
Requires Twitch authentication to be enabled in your NodeCG installation.

## Installation
- Install to `nodecg/bundles/lfg-twitchapi`
- Create `nodecg/cfg/lfg-twitchapi.json` with a valid configuration (see below).

### Config Example
```json
{
  "username": "langeh"
}
```

## Usage
First, ensure that your NodeCG installation is using Twitch authentication. See the [NodeCG configuration docs](http://nodecg.com/starter/configuration.html) for details.

Then, add `lfg-twitchapi` as a `bundleDependency` in your bundle's [`nodecg.json`](http://nodecg.com/guide/nodecg.json.html)

Now, add the following code to your bundle's extension:
```javascript
var twitchApi = nodecg.extensions['lfg-twitchapi'];

// Gets the 25 most recent subs
// {{username}} will be automatically replaced by the username specified in lfg-twitchapi.json
twitchApi.get('/channels/{{username}}/subscriptions', { limit: 25, direction: 'desc' },
    function(err, code, body) {
        if (err) {
            nodecg.log.error(err);
            return;
        }

        if (code !== 200) {
            nodecg.log.error(body.error, body.message);
            return;
        }

        // Go through subs in reverse, from oldest to newest
        body.subscriptions.reverse().forEach(function(subscription) {
            var username = subscription.user.name;
            var channel = body.channel;
            console.log('%s subscribed to channel %s', username, channel);
        });
    });
```

## API
### twitchApi.get(path, options, callback)
### twitchApi.put(path, options, callback)
### twitchApi.post(path, options, callback)
### twitchApi.delete(path, options, callback)
Makes a call to the Twitch API, invoking `callback` with the response.

If `{{username}}` is present in `path`, it will be replaced with the value of `nodecg.bundleConfig.username`.

* `path` is the desired endpoint; ex: `/channels/{{username}}/subscriptions`
* `options` is an object of query parameters; ex: `{ limit: 25, direction: 'desc' }`
* `callback` will be invoked with the response from the Twitch API

### License
lfg-twitchapi is provided under the MIT license, which is available to read in the [LICENSE][] file.
[license]: LICENSE
