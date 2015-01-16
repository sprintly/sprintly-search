var search = require('./index').search;
var getOpts = require('./index').getOpts;
var yargs = require('yargs');


/* istanbul ignore if */
if (require.main === module) {
  var args = yargs
    .demand(['user', 'key'])
    .describe('user', 'Email address you log in with')
    .describe('key', 'API key (it\'s on your profile page)')
    .describe('debug', 'Enable debug mode for extra reporting')
    .describe('query', 'Search query.')
    .default('query', 'assigned_to:me')
    .describe('base_url', 'Root URL to hit for sprintly endpoint')
    .default('base_url', 'https://sprint.ly')
    .describe('help', 'Show this help')
    .describe('limit', 'API limit to use')
    .default('limit', DEFAULT_LIMIT)
    .describe('nojson', "Don't print json. Used in combination with --debug")
    .default('nojson', false)
    .argv;

  var removeTrailingSlash = /(.*)\/$/g;
  var baseUrl = removeTrailingSlash.exec(args.base_url);
  if (baseUrl) {
    baseUrl = baseUrl[1];
  } else {
    baseUrl = args.base_url;
  }

  if (args.help) {
    console.log(yargs.help());
    return;
  }

  if (args.debug) {
    debug = console.log;
  }

  search(getOpts(args.query, {
    user: args.user,
    pass: args.key,
    baseUrl: baseUrl,
    limit: args.limit
  })).then(function (json) {
    if (!args.nojson) {
      console.log(JSON.stringify(json));
    }
  }, function (err) {
    console.log('error: ', err.response.body);
  });
}