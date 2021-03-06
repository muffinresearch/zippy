var uuid = require('node-uuid');
var when = require('when');

var Client = require('../client').Client;
var AnonymousClient = require('../client').AnonymousClient;
var helpers = require('../helpers');

var client = new Client('/products');
var anonymousClient = new AnonymousClient('/products');


function makeTwoProducts(t, extIds) {
  var deferred = when.defer();

  helpers.withSeller({}, function(seller) {
    helpers.withProduct({
      /*jshint camelcase: false */
      seller_id: seller.uuid,
      external_id: extIds.pop(),
      name: 'x',
    }, function(product1) {
      helpers.withProduct({
        /*jshint camelcase: false */
        seller_id: seller.uuid,
        external_id: extIds.pop(),
        name: 'x',
      }, function(product2) {
        deferred.resolve({
          products: [product1, product2],
          seller: seller,
        });
      });
    });
  });

  return deferred.promise;
}


function makeTwoSellers(t, extIds) {
  var deferred = when.defer();
  var seller1;
  var seller2;

  makeTwoProducts(t, extIds)
    .then(function(result1) {
      seller1 = result1.seller;
      return makeTwoProducts(t, extIds);
    })
    .then(function(result2) {
      seller2 = result2.seller;
    })
    .then(function() {
      deferred.resolve([seller1, seller2]);
    }, function(err) {
      deferred.reject(err);
    });

  return deferred.promise;
}


exports.setUp = function(done) {
  helpers.resetDB()
    .then(done)
    .catch(function(err) {
      throw err;
    });
};


exports.createWithoutUUID = function(t) {
  helpers.withSeller({}, function(seller) {
    client
      .post({
        /*jshint camelcase: false */
        external_id: uuid.v4(),
        seller_id: seller.uuid,
        name: 'x',
      })
      .expect(409)
      .end(function(err, res) {
        t.ifError(err);
        t.equal(res.body.error.name, 'InvalidArgumentError');
        t.done();
      });
  });
};


exports.createWithoutSeller = function(t) {
  client
    .post({
      uuid: uuid.v4(),
      /*jshint camelcase: false */
      external_id: uuid.v4(),
      name: 'x',
    })
    .expect(409)
    .end(function(err, res) {
      t.ifError(err);
      t.equal(res.body.error.name, 'InvalidArgumentError');
      t.done();
    });
};


exports.createWithoutExternalId = function(t) {
  helpers.withSeller({}, function(seller) {
    client
      .post({
        uuid: uuid.v4(),
        /*jshint camelcase: false */
        seller_id: seller.uuid,
        name: 'x',
      })
      .expect(409)
      .end(function(err, res) {
        t.ifError(err);
        t.equal(res.body.error.name, 'InvalidArgumentError');
        t.done();
      });
  });
};


exports.createWithoutName = function(t) {
  helpers.withSeller({}, function(seller) {
    /*jshint camelcase: false */
    var external_id = uuid.v4();
    client
      .post({
        uuid: uuid.v4(),
        /*jshint camelcase: false */
        seller_id: seller.uuid,
        external_id: external_id,
      })
      .expect(409)
      .end(function(err) {
        t.ifError(err);
        t.done();
      });
  });
};


exports.createProductOk = function(t) {
  helpers.withSeller({}, function(seller) {
    var productUUID = uuid.v4();
    /*jshint camelcase: false */
    var external_id = uuid.v4();
    var name = 'x';
    client
      .post({
        uuid: productUUID,
        /*jshint camelcase: false */
        seller_id: seller.uuid,
        external_id: external_id,
        name: name,
      })
      .expect(201)
      .end(function(err, res) {
        t.ifError(err);
        t.equal(res.body.uuid, productUUID);
        t.equal(res.body.seller_id, seller.uuid);
        t.equal(res.body.external_id, external_id);
        t.equal(res.body.name, name);
        t.done();
      });
  });
};


exports.createAnonymousSeller = function(t) {
  helpers.withSeller({}, function(seller) {
    anonymousClient
      .post({
        uuid: uuid.v4(),
        /*jshint camelcase: false */
        seller_id: seller.uuid,
        external_id: uuid.v4(),
        name: 'x',
      })
      .expect(401)
      .end(function(err, res) {
        t.ifError(err);
        t.equal(res.body.error.name, 'InvalidCredentialsError');
        t.done();
      });
  });
};


exports.createWrongSeller = function(t) {
  var nonExistant = uuid.v4();
  client
    .post({
      uuid: uuid.v4(),
      /*jshint camelcase: false */
      seller_id: nonExistant,
      external_id: uuid.v4(),
      name: 'x',
    })
    .expect(409)
    .end(function(err) {
      t.ifError(err);
      t.done();
    });
};


exports.createInactiveSeller = function(t) {
  var opt = {status: 'INACTIVE'};
  helpers.withSeller(opt, function(seller) {
    client
      .post({
        uuid: uuid.v4(),
        /*jshint camelcase: false */
        seller_id: seller.uuid,
        external_id: uuid.v4(),
        name: 'x',
      })
      .expect(409)
      .end(function(err) {
        t.ifError(err);
        t.done();
      });
  });
};


exports.createDupeExternalId = function(t) {
  helpers.withSeller({}, function(seller) {
    helpers.withProduct({
      /*jshint camelcase: false */
      seller_id: seller.uuid,
      external_id: uuid.v4(),
      name: 'x',
    }, function(product) {
      client
        .post({
          uuid: uuid.v4(),
          /*jshint camelcase: false */
          seller_id: seller.uuid,
          external_id: product.external_id,
          name: 'x',
        })
        .expect(409)
        .end(function(err, res) {
          t.ifError(err);
          t.equal(res.body.error.name, 'InvalidArgumentError');
          t.done();
        });
    });
  });
};


exports.externaIdUniquePerSeller = function(t) {
  // An external ID only has to be unique per seller.
  var extId = 'shared-product-id';

  helpers.withSeller({}, function(seller1) {
    helpers.withProduct({
      /*jshint camelcase: false */
      seller_id: seller1.uuid,
      external_id: extId,
      name: 'x',
    }, function() {
      helpers.withSeller({}, function(seller2) {
        client
          .post({
            uuid: uuid.v4(),
            /*jshint camelcase: false */
            seller_id: seller2.uuid,
            external_id: extId,
            name: 'x',
          })
          .expect(201)
          .end(function(err) {
            t.ifError(err);
            t.done();
          });
      });
    });
  });
};


exports.retrieveProductByPk = function(t) {
  helpers.withSeller({}, function(seller) {
    helpers.withProduct({
      /*jshint camelcase: false */
      seller_id: seller.uuid,
      external_id: uuid.v4(),
      name: 'x',
    }, function(product) {
      client
        .get(product.uuid)
        .expect(200)
        .end(function(err, res) {
          t.ifError(err);
          t.equal(res.body.external_id, product.external_id);
          t.done();
        });
    });
  });
};


exports.retrieveNoProduct = function(t) {
  client
    .get(777)  // non-existant ID
    .expect(404)
    .end(function(err) {
      t.ifError(err);
      t.done();
    });
};


exports.listAllProducts = function(t) {
  makeTwoProducts(t, ['one', 'two'])
    .then(function() {
      var extIds = [];
      var sellerIds = [];
      client
        .get()
        .expect(200)
        .end(function(err, res) {
          t.ifError(err);
          res.body.forEach(function(ob) {
            /*jshint camelcase: false */
            extIds.push(ob.external_id);
            sellerIds.push(ob.seller_id);
          });
          extIds.sort();
          t.equal(extIds[0], 'one');
          t.equal(extIds[1], 'two');
          t.equal(sellerIds[0], sellerIds[1]);
          t.done();
        });
    })
    .fail(function(err) {
      t.ifError(err);
      t.done();
    });
};


exports.filterProductsByExtId = function(t) {
  makeTwoProducts(t, ['one', 'two'])
    .then(function() {
      client
        .get({
          /*jshint camelcase: false */
          external_id: 'one',
        })
        .expect(200)
        .end(function(err, res) {
          t.ifError(err);
          t.equal(res.body[0].external_id, 'one');
          t.equal(res.body.length, 1);
          t.done();
        });
    })
    .fail(function(err) {
      t.ifError(err);
      t.done();
    });
};


exports.filterProductsBySeller = function(t) {
  // Make two products with the same ext ID for two sellers.
  var extId = 'ext_id';

  helpers.withSeller({}, function(seller1) {
    helpers.withProduct({
      /*jshint camelcase: false */
      seller_id: seller1.uuid,
      external_id: extId,
      name: 'x',
    }, function(/*product1*/) {
      helpers.withSeller({}, function(seller2) {
        helpers.withProduct({
          /*jshint camelcase: false */
          seller_id: seller2.uuid,
          external_id: extId,
          name: 'x',
        }, function(/*product2*/) {

          client
            .get({
              /*jshint camelcase: false */
              external_id: extId,
              seller_id: seller1.uuid,
            })
            .expect(200)
            .end(function(err, res) {
              t.ifError(err);
              t.equal(res.body.length, 1);
              t.equal(res.body[0].external_id, 'ext_id');
              t.equal(res.body[0].seller_id, seller1.uuid);
              t.done();
            });

        });
      });
    });
  });
};


exports.filterByWrongSeller = function(t) {
  makeTwoProducts(t, ['one', 'two'])
    .then(function() {
      client
        .get({
          /*jshint camelcase: false */
          seller_id: 'invalid',
          external_id: 'one',
        })
        .expect(404)
        .end(function(err) {
          t.ifError(err);
          t.done();
        });
    })
    .fail(function(err) {
      t.ifError(err);
      t.done();
    });
};


exports.filterByWrongExtenalId = function(t) {
  makeTwoSellers(t, ['one', 'two'])
    .then(function(sellersResult) {
      client
        .get({
          /*jshint camelcase: false */
          seller_id: sellersResult[0].resource_pk,
          external_id: 'three',
        })
        .expect(200)
        .end(function(err, res) {
          t.ifError(err);
          t.equal(res.body.length, 0);
          t.done();
        });
    })
    .fail(function(err) {
      t.ifError(err);
      t.done();
    });
};


exports.wrongParamIsError = function(t) {
  client
    .get({badParam: 'nope'})
    .expect(409)
    .end(function(err) {
      t.ifError(err);
      t.done();
    });
};
