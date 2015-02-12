var request = require('request');
var _ = require('lodash');
var Q = require('q');

var DEFAULT_LIMIT = 500;

  return {
    url: options.baseUrl + '/api/items/search.json',
var getOpts = function (searchQuery, options) {
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
};

var search = function (opts) {
  var debug = opts.debug ? console.log : _.identity;
  debug('options: ', opts);
  debug('search string: ', opts.qs.q);
  var start = new Date();
  var dfd = Q.defer();
  request.get(opts, function (err, resp, body) {
    if (err) {
      throw new Error(err);
    }
    debug('First response: ', (new Date()) - start, 'ms');
    var total = JSON.parse(body).total_count;
    debug('total items: ', total);
    var strs = [
      [null, body]
    ];
    var pages = Math.ceil(total / opts.qs.limit);

    _.times(pages, function (pageNumber) {
      if (pageNumber === 0) {
        // We've already processed page 1.
        return;
      }
      opts.qs.offset = pageNumber * opts.qs.limit;
      strs.push(Q.nfcall(request.get, opts));
    });

    Q.all(strs)
      .then(function (jsonStrings) {
        // jsonStrings is an array in the form of [XHR, jsonString]
        debug('All RPCs took: ', (new Date()) - start, 'ms');
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


module.exports.search = search;
module.exports.getOptions = getOpts;
