# sprintly-search

This project aims to provide a simple node/in-browser (via
[browserify](http://browserify.org/)) API client for fetching items
across multiple products inside [sprintly](https://sprint.ly/).

## Usage
```js
var API = require('sprintly-search');

API.search(API.getOpts('assigned_to:me', {
  user: 'jane@example.org',
  pass: 's3cr3t'
})).then(function (json) {
  console.log('Number of items? ', len(JSON.stringify(json)));
}, function (err) {
  console.log('error: ', err.response.body);
});

```

Your username is the email you use to login to sprintly with. The
password is your API key, which can be found on [your
profile](https://sprint.ly/account/settings/profile).