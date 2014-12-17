var request = require('browser-request');
var _ = require('lodash');
var Q = require('q');

var DEFAULT_LIMIT = 500;
var debug = _.identity;

var getOpts = function (q, options) {
  return {
    url: options.baseUrl + '/api/items/search.json',
    qs: {
      q: q,
      limit: options.LIMIT || DEFAULT_LIMIT
    },
    auth: {
      username: options.user,
      password: options.pass
    }
  };
};

var search = function (opts) {
  debug('options: ', opts);
  debug('search string: ', opts.qs.q);
  var start = new Date();
  var dfd = Q.defer();
  request.get(opts, function (err, resp, body) {
    debug("First response: ", (new Date()) - start, 'ms');
    var total = JSON.parse(body).total_count;
    debug('total items: ', total);
    var strs = [];
    var pages = Math.ceil(total / opts.qs.limit);
    
    _.times(pages, function (pageNumber) {
      opts.qs.offset = pageNumber * opts.qs.limit;
      strs.push(Q.nfcall(request.get, opts));
    });

    Q.all(strs)
      .then(function (jsonStrings) {
        // jsonStrings is an array in the form of [XHR, jsonString]
        debug("All RPCs took: ", (new Date()) - start, 'ms');
        dfd.resolve(_.flatten(
          _.map(jsonStrings, function (x) {
            var json = JSON.parse(x[1]);
            debug('facets: ', json.facets);
            return json.items;
          }), true));
      }, dfd.reject);
  });

  return dfd.promise;
};


/* istanbul ignore if  */
if (require.main === module) {

  var yargs = require('yargs');
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
    baseUrl: baseUrl
  })).then(function (json) {
    console.log(JSON.stringify(json));
  }, function (err) {
    console.log('error: ', err.response.body);
  });
}

module.exports.search = search;
module.exports.getOptions = getOpts;
