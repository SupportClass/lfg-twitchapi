# lfg-twitchapi
This is a [NodeCG](http://github.com/nodecg/nodecg) bundle.

Lets other bundles easily query the [Twitch API](https://github.com/justintv/Twitch-API) on behalf of a logged in user.
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
```js
const twitchApi = nodecg.extensions['lfg-twitchapi'];

// Gets the 25 most recent subs
// {{username}} will be automatically replaced by the username specified in lfg-twitchapi.json
twitchApi.get('/channels/{{username}}/subscriptions', {
	limit: 25, 
	direction: 'desc'
}).then(response => {
	if (response.statusCode !== 200) {
		return nodecg.log.error(response.body.error, response.body.message);
	}
	
	// Go through subs in reverse, from oldest to newest
	response.body.subscriptions.reverse().forEach(subscription => {
		const username = subscription.user.name;
		console.log('%s subscribed to channel %s', username, twitchApi.channel);
	});
}).catch(err => {
	nodecg.log.error(err);
});
```

## API
### twitchApi.get(path, [qs, body])
### twitchApi.put(path, [qs, body])
### twitchApi.post(path, [qs, body])
### twitchApi.delete(path, [qs, body])
Makes a call to the Twitch API and returns a promise.

If `{{username}}` is present in `path`, it will be replaced with the value of `nodecg.bundleConfig.username`.

* `path` is the desired endpoint; ex: `/channels/{{username}}/subscriptions`
* `qs` (Optional) is an object of query parameters; ex: `{limit: 25, direction: 'desc'}`
* `body` (Optional) is an object to send as the JSON request body

### License
lfg-twitchapi is provided under the MIT license, which is available to read in the [LICENSE][] file.
[license]: LICENSE
