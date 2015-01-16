var request = require('request');
var _ = require('lodash');
var Q = require('q');
var argParse = require('argparse');

var DEFAULT_LIMIT = 500;
var debug = _.identity;

var getOpts = function (q, options) {
  return {
    url: options.baseUrl + '/api/items/search.json',
    qs: {
      q: q,
      limit: options.limit || DEFAULT_LIMIT
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
  argParse();
}

module.exports.search = search;
module.exports.getOptions = getOpts;
