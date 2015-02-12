var nodeRequest = require('request');
var _ = require('lodash');
var Q = require('q');

var DEFAULT_LIMIT = 500;
var SPRINTLY_URL = 'https://sprint.ly/';

var getOpts = function (searchQuery, options) {
  var baseUrl = options.baseUrl || SPRINTLY_URL;
  var opts = {
    json: true,
    url: baseUrl + '/api/items/search.json',
    qs: {
      q: searchQuery,
      limit: options.limit || DEFAULT_LIMIT
    },
    auth: {
      username: options.user,
      password: options.pass
    },
    debug: !!options.debug
  };
  if (options.request) {
    opts.request = options.request;
  }
  return opts;
};

var search = function (opts) {
  var debug = opts.debug ? console.log : _.identity;
  var request = opts.request ? opts.request : nodeRequest;
  debug('options: ', opts);
  debug('search string: ', opts.qs.q);
  var start = new Date();
  var dfd = Q.defer();
  request.get(opts, function (err, resp, body) {
    if (err) {
      throw new Error(err);
    }

    debug('First response: ', (new Date()) - start, 'ms');
    var total = body.total_count;
    debug('total items: ', total);
    var strs = [
      body
    ];
    var pages = Math.ceil(total / opts.qs.limit);

    _.times(pages, function (pageNumber) {
      if (pageNumber === 0) {
        // We've already processed page 1.
        return;
      }

      var opts2 = _.cloneDeep(opts);
      opts2.qs.offset = pageNumber * opts2.qs.limit;

      var d = Q.defer();
      strs.push(d.promise);
      request.get(opts2, function (err2, results, body2) {
        if (err2) {
          d.reject(err2);
        }
        d.resolve(body2);
      });
    });

    Q.all(strs)
      .then(function (jsonStrings) {
        // jsonStrings is an array in the form of [XHR, jsonString]
        debug('All RPCs took: ', (new Date()) - start, 'ms');
        dfd.resolve(_.flatten(
          _.map(jsonStrings, function (json) {
            debug('facets: ', json.facets);
            return json.items;
          }), true));
      }, dfd.reject);
  });

  return dfd.promise;
};


module.exports.search = search;
module.exports.getOptions = getOpts;
