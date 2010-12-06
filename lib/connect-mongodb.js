/*!
 * Connect - Mongo
 * Copyright(c) 2010 Vladimir Dronnikov <dronnikov@gmail.com>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var sys = require('sys'),
    Store = require('connect/middleware/session/store'),
    MongoDB = require('mongodb/db'),
    DB = require('mongodb/db').Db,
    Server = require("mongodb/connection").Server,

    getConnectionURL = function (options, callback) {
      var url = 'mongo://';

      if (options.username) {
        url += options.username;
        if (options.password) {
          url += ':' + options.password;
        } else {
          if (callback) {
            callback(new Error('Username set without password. Need both to make a connection'), null);
          }
        }
        url += '@';
      }

      url += options.host || '127.0.0.1';
      url += options.port ? ':' + options.port : ':27017';
      url += options.dbname ? '/' + options.dbname : '/dev';

      return url;
    };

/**
 * Initialize MongoStore with the given `options`.
 *
 * @param {Object} options
 * @api public
 */

module.exports = function (options, callback) {

  options = options || {};

  var collection = null,
      mongoStore = Store.prototype,
      url = options.url || getConnectionURL(options, callback),
      connection = MongoDB.connect(url, function (err, db) {
        if (err) {
          callback(err, null);
        } else {
          db.collection(options.collection || 'sessions', function (err, col) {
            collection = col;
            if (callback) {
              callback(null, collection);
            }
          });
        }
      });

  Store.call(mongoStore, options);


  /**
   * Attempt to fetch session by the given `hash`.
   *
   * @param {String} hash
   * @param {Function} fn
   * @api public
   */

  mongoStore.get = function (hash, fn) {
    collection.findOne({_id: hash}, function (err, data) {
      try {
        if (data) {
          delete data._id;
        }
        // TODO: fail if expired
        fn(null, data);
      } catch (exc) {
        fn(exc);
      }
    });
  };

  /**
   * Commit the given `sess` object associated with the given `hash`.
   *
   * @param {String} hash
   * @param {Session} sess
   * @param {Function} fn
   * @api public
   */

  mongoStore.set = function (hash, sess, fn) {
    try {
      sess._id = hash;
      collection.update({_id: hash}, sess, {upsert: true}, function (err, data) {
        if (data) {
          delete data._id;
        }
        if (fn) {
          fn.apply(this, arguments);
        }
      });
    } catch (exc) {
      if (fn) {
        fn(exc);
      }
    }
  };

  /**
   * Destroy the session associated with the given `hash`.
   *
   * @param {String} hash
   * @api public
   */

  mongoStore.destroy = function (hash, fn) {
    collection.remove({_id: hash}, fn);
  };

  /**
   * Fetch number of sessions.
   *
   * @param {Function} fn
   * @api public
   */

  mongoStore.length = function (fn) {
    collection.count({}, fn);
  };

  /**
   * Clear all sessions.
   *
   * @param {Function} fn
   * @api public
   */

  mongoStore.clear = function (fn) {
    collection.drop(fn);
  };

  /**
   * Get the collection
   *
   * @param
   * @api public
   */
  mongoStore.getCollection = function (fn) {
    return collection;
  };

  return mongoStore;
};
