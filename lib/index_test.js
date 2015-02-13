var sinon = require('sinon');
var searchPayload = require('../fixtures/design-search');
var rewire = require('rewire');
var API = rewire('./index');
var q = require('q');
var express = require('express');
var freeport = require('freeport');
var _ = require('lodash');
var assert = require('assert');

var genPayloads = function (num) {
  var payloads = [];
  _.times(num, function (i) {
    payloads.push({items: [{id: i + 1}], 'total_count': num});
  });
  return payloads;
};

var setupServer = function(pages, payloads, cb) {
  var app = express();
  app.get('/api/items/search.json', function (req, res) {
    if (!req.query.offset) {
      res.json(payloads[0]);
    } else {
      var os = parseInt(req.query.offset, 10);
      if (os > payloads.length) {
        res.sendStatus(404);
      } else {
        res.json(payloads[os]);
      }
    }
  });

  freeport(function (err, port) {
    if (err) {
      throw err;
    }
    app.listen(port, function (err) {
      if (err) {
        throw err;
      }

      cb(port);
    });
  });

};

describe('search', function () {

  describe('error handling', function() {
    it('should bubble up errors from the initial request', function(done) {
      var stub = {
        get: function(opts, cb) {
          return cb(new Error('ruh roh'));
        }
      };
      var origRequest = API.__get__('request');
      API.__set__('request', stub);
      API.search(API.getOptions('assigned_to:me design', {
        user: 'j@example.org',
        pass: 's3cr3t'
      }), function (err, json) {
        API.__set__('request', origRequest);
        assert(err.message, 'ruh roh');
        done();
      });
    });

    it('should bubble up errors from page requests', function(done) {
      var calls = 0;
      var stub = {
        get: function(opts, cb) {
          calls++;
          if (calls === 1) {
            return cb(null, { statusCode: 200 }, { total_count: 17, items: searchPayload });
          }
          return cb(new Error('ruh roh'));
        }
      };
      var origRequest = API.__get__('request');
      API.__set__('request', stub);
      API.search(API.getOptions('assigned_to:me design', {
        user: 'j@example.org',
        pass: 's3cr3t',
        limit: 10
      }), function (err, json) {
        API.__set__('request', origRequest);
        assert(err.message, 'ruh roh');
        done();
      });
    });
  });

  describe('status codes', function() {
    it('should error if a non 200 response code is encountered in the initial response', function(done) {
      var stub = {
        get: function(opts, cb) {
          return cb(null, { statusCode: 403 }, {});
        }
      };
      var origRequest = API.__get__('request');
      API.__set__('request', stub);
      API.search(API.getOptions('assigned_to:me design', {
        user: 'j@example.org',
        pass: 's3cr3t'
      }), function (err, json) {
        API.__set__('request', origRequest);
        assert(err.message, 'Unexpected status code: 403');
        done();
      });
    });

    it('should error if a non 200 response code is encountered in subsequent requests', function(done) {
      var calls = 0;
      var stub = {
        get: function(opts, cb) {
          calls++;
          if (calls === 1) {
            return cb(null, { statusCode: 200 }, { total_count: 17, items: searchPayload });
          }
          return cb(null, { statusCode: 403 }, {});
        }
      };
      var origRequest = API.__get__('request');
      API.__set__('request', stub);
      API.search(API.getOptions('assigned_to:me design', {
        user: 'j@example.org',
        pass: 's3cr3t',
        limit: 10
      }), function (err, json) {
        API.__set__('request', origRequest);
        assert(err.message, 'Unexpected status code: 403');
        done();
      });
    });
  });

  describe('pagination', function () {
    it('simple sanity test', function (done) {
      var stub = {
        get: function(opts, cb) {
          return cb(null, { statusCode: 200 }, { total_count: 17, items: searchPayload });
        }
      };

      var origRequest = API.__get__('request');
      API.__set__('request', stub);

      API.search(API.getOptions('assigned_to:me design', {
        user: 'j@example.org',
        pass: 's3cr3t'
      })).then(function (json) {
        API.__set__('request', origRequest);
        assert.equal(17, json.length);
        done();
      });
    });

    it('queries for incremental pages', function (done) {
      var pages = 10;
      var payloads = genPayloads(pages);

      setupServer(pages, payloads, function(port) {
        var opts = API.getOptions('dummy search', {
          limit: 1,
          baseUrl: 'http://localhost:' + port,
          user: 'foo',
          pass: 'foo'
        });

        API.search(opts).then(function (results) {
          assert.equal(_.filter(results).length, pages, 'Expected ' + pages + ' results. Got: ' + JSON.stringify(results));
          assert.deepEqual(_.pluck(results, 'id'), _.range(1, pages + 1));
        }, function (err) {
          throw new Error(err);
        }).then(done);
      });

    });

  });
});

