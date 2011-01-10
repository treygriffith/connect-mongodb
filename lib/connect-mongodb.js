/*!
 * Connect - Mongo
 * Copyright(c) 2010 Vladimir Dronnikov <dronnikov@gmail.com>
 * Mantained by Pau Ramon Revilla <masylum@gmail.com>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var Store = require('connect').session.Store,
    mongo = require('mongodb'),

    defaults = {host: '127.0.0.1', port: 27017, dbname: '/dev', collection: 'sessions'},

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

      url += options.host || defaults.host;
      url += options.port ? ':' + options.port : ':' + defaults.port;
      url += options.dbname ? '/' + options.dbname : defaults.dbname;

      // delete this options so we don't send them to Server
      delete options.username;
      delete options.password;
      delete options.host;
      delete options.port;
      delete options.dbname;

      if (options.url) {
        return options.url;
      } else {
        return url;
      }
    },

    parseConnectionURL = function (url) {
      var config = require('url').parse(url),
          host = config.hostname || defaults.host,
          port = config.port || defaults.port,
          dbname = config.pathname.replace(/^\//, '') || defaults.dbname,
          auth;

      if (!config.protocol.match(/^mongo/)) {
        throw new Error("URL must be in the format mongo://user:pass@host:port/dbname");
      }

      if (config.auth) {
        auth = config.auth.split(':', 2);
      }

      return {
        host: host,
        port: port,
        dbname: dbname,
        username: auth && auth[0],
        password: auth && auth[1]
      };
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
      url = getConnectionURL(options, callback),
      details = parseConnectionURL(url), // mongodb 0.7.9 parser is broken, this fixes it
      db = new mongo.Db(details.dbname, new mongo.Server(details.host, details.port, options)),

      getCollection = function (db, callback) {
        db.collection(options.collection || defaults.collection, function (err, col) {
          collection = col;
          if (callback) {
            callback(null, col);
          }
        });
      };

  db.open(function (err) {
    if (err) {
      throw new Error("Error connecting to " + url);
    }

    if (details.username && details.password) {
      db.authenticate(details.username, details.password, function () {
        getCollection(db, callback);
      });
    } else {
      getCollection(db, callback);
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
