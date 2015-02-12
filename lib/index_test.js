var sinon = require('sinon');
var searchPayload = require('../fixtures/design-search');
var API = require('./index');
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

describe('search', function () {
  describe('pagination', function () {
    it('simple sanity test', function () {

      var stub = {get: sinon.stub().returns(q(searchPayload))};

      API.search(API.getOptions('assigned_to:me design', {
        user: 'j@example.org',
        pass: 's3cr3t',
        request: stub
      })).then(function (json) {
        assert.equal(17, json.length);
      });
    });

    it('queries for incremental pages', function (done) {
      var pages = 10;
      var payloads = genPayloads(pages);

      var app = express();
      app.get('/api/items/search.json', function (req, res) {
        if (!req.query.offset) {
          res.json(payloads[0]);
        } else {
          var os = Number(req.query.offset);
          if (os > payloads.length) {
            res.sendStatus(404);
          } else {
            res.json(payloads[os]);
          }
        }
        });

      freeport(function (err, port) {
        if (err) {
          throw new Error(err);
        }
        app.listen(port, function () {
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
          }).done(done);
        });

      });

    });

  });
});
