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
            callback(Error('Username set without password. Need both to make a connection'), null);
          }
        }
        url += '@';
      }

      url += options.host || defaults.host;
      url += options.port ? ':' + options.port : ':' + defaults.port;
      url += options.dbname ? '/' + options.dbname : defaults.dbname;

      // delete this options so we don't send them to Server
      ['username', 'password', 'host', 'port', 'dbname'].forEach(function (attr) {
        delete options[attr];
      });

      if (options.url) {
        return options.url;
      } else {
        return url;
      }
    },

    parseConnectionURL = function (url) {
      var config = require('url').parse(url),
          auth = null;

      if (!config.protocol.match(/^mongo/)) {
        throw new Error("URL must be in the format mongo://user:pass@host:port/dbname");
      }

      if (config.auth) {
        auth = config.auth.split(':', 2);
      }

      return {
        host: config.hostname || defaults.host,
        port: config.port || defaults.port,
        dbname: config.pathname.replace(/^\//, '') || defaults.dbname,
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
      MONGOSTORE = Store.prototype,
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

  if (options.reapInterval !== -1) {
    setInterval(function (self) {
      collection.remove({expires: {'$lte': Date.now()}}, function () { });
    }, options.reapInterval || 60000, this); // every minute
  }


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

  Store.call(MONGOSTORE, options);

  /**
   * Attempt to fetch session by the given `sid`.
   *
   * @param {String} sid
   * @param {Function} cb
   * @api public
   */

  MONGOSTORE.get = function (sid, cb) {
    collection.findOne({_id: sid}, function (err, data) {
      try {
        if (data) {
          cb(null, JSON.parse(data.session));
        } else {
          cb();
        }
      } catch (exc) {
        cb(exc);
      }
    });
  };


  /**
   * Commit the given `sess` object associated with the given `sid`.
   *
   * @param {String} sid
   * @param {Session} sess
   * @param {Function} cb
   * @api public
   */

  MONGOSTORE.set = function (sid, sess, cb) {
    try {
      collection.update(
        {_id: sid},
        {_id: sid, expires: Date.parse(sess.cookie.expires), session: JSON.stringify(sess)},
        {upsert: true},
        function (err, data) {
          if (cb) {
            cb.apply(this, arguments);
          }
        }
      );
    } catch (exc) {
      if (cb) {
        cb(exc);
      }
    }
  };

  /**
   * Destroy the session associated with the given `sid`.
   *
   * @param {String} sid
   * @api public
   */

  MONGOSTORE.destroy = function (sid, fn) {
    collection.remove({_id: sid}, fn);
  };

  /**
   * Fetch number of sessions.
   *
   * @param {Function} fn
   * @api public
   */

  MONGOSTORE.length = function (fn) {
    collection.count({}, fn);
  };

  /**
   * Clear all sessions.
   *
   * @param {Function} fn
   * @api public
   */

  MONGOSTORE.clear = function (fn) {
    collection.drop(fn);
  };

  /**
   * Get the collection
   *
   * @param
   * @api public
   */
  MONGOSTORE.getCollection = function (fn) {
    return collection;
  };

  return MONGOSTORE;
};
