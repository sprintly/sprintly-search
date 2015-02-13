var request = require('request');
var _ = require('lodash');
var Q = require('q');
var async = require('async');

var DEFAULT_LIMIT = 500;

var presentResponses = function(jsonStrings) {
  return _.flatten(
    _.pluck(jsonStrings, 'items')
  );
};

var getOpts = function (searchQuery, options) {
  var baseUrl = options.baseUrl;
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
  return opts;
};

var search = function(opts, callback) {
  var debug = opts.debug ? console.log : _.identity;
  var start = Date.now();

  debug('options: ', opts);
  debug('search string: ', opts.qs.q);

  request.get(opts, function(err, resp, body) {
    if (err) {
      return callback(err);
    }

    if (resp.statusCode !== 200) {
      return callback(new Error('Unexpected status code: ' + resp.statusCode));
    }

    debug('First response: ', (new Date()) - start, 'ms');

    var total = body.total_count;
    var responses = [ body ];
    var pages = Math.ceil(total / opts.qs.limit);

    async.times(pages, function(pageNumber, next) {
      if (pageNumber === 0) {
        return next();
      }

      var pageOpts = _.cloneDeep(opts);
      pageOpts.qs.offset = pageNumber * pageOpts.qs.limit;

      request.get(pageOpts, function(err, pageResp, pageBody) {
        if (err) {
          return next(err);
        }

        if (pageResp.statusCode !== 200) {
          return next(new Error('Unexpected status code: ' + pageResp.statusCode));
        }

        return next(null, pageBody);
      });
    }, function(err, pages) {
      if (err) {
        return callback(err);
      }
      var rawResponses = responses.concat(_.compact(pages));
      if (opts.debug) {
        debug('All RPCs took: ', (new Date()) - start, 'ms');
        debug('Facets:', _.pluck(rawResponses, 'facets'));
      }
      callback(null, presentResponses(rawResponses));
    });
  });
};

exports.search = function(opts, callback) {
  if (callback && _.isFunction(callback)) {
    search(opts, callback);
  } else {
    return Q.nfcall(search, opts);
  }
};

exports.getOptions = getOpts;
