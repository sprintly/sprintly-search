var sinon = require('sinon');
var request = require('request');
var searchPayload = require('../fixtures/design-search');
var API = require('./index');
var q = require('q');

describe('search', function () {
  describe('pagination', function () {
    it('simple sanity test', function () {
      sinon.stub(request, 'get')
        .returns(q(searchPayload));

      API.search(API.getOptions('assigned_to:me design', {
        user: 'j@example.org',
        pass: 's3cr3t'
      })).then(function (json) {
        assert.equal(17, json.length);
      });

      request.get.restore();
    });
  });
});
