var sinon = require('sinon');
var request = require('request');
var search_payload = require('../fixtures/design-search');
var API = require('./index');
var Q = require('q');

describe('search', function () {
  describe('pagination', function () {
    it('simple sanity test', function () {
      sinon.stub(request, 'get')
        .returns(Q(search_payload));

      API.search(API.getOptions('assigned_to:me design', {
        user: 'j@example.org',
        pass: 's3cr3t'
      })).then(function (json) {
        assert.equal(17, len(json));
      });

      request.get.restore();
    });
  });
});
