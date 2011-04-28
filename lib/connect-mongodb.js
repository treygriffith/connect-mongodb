/*!
 * Connect - Mongodb
 * Copyright(c) 2010 Vladimir Dronnikov <dronnikov@gmail.com>
 * Mantained by Pau Ramon Revilla <masylum@gmail.com>
 * MIT Licensed
 */

var Store = require('connect').session.Store,
    mongo = require('mongodb'),

    _collection = null,
    _default = function (callback) {
      callback = callback || function () { };
      return callback;
    },

    defaults = {host: '127.0.0.1', port: 27017, dbname: '/dev', collection: 'sessions'},

    getConnectionURL = function (options) {
      var url = 'mongo://';

      if (options.username) {
        url += options.username;
        if (options.password) {
          url += ':' + options.password;
        } else {
          throw Error('Username set without password. Need both to make a connection');
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

var MONGOSTORE = module.exports = function MongoStore(options) {

  options = options || {};

  var _url = getConnectionURL(options),
      _details = parseConnectionURL(_url), // mongodb 0.7.9 parser is broken, this fixes it
      _db = new mongo.Db(_details.dbname, new mongo.Server(_details.host, _details.port, options)),

      _getCollection = function (_db) {
        _db.collection(options.collection || defaults.collection, function (err, col) {
          if (err) {
            throw err;
          }
          _collection = col;
        });
      };

  Store.call(this, options);

  if (options.reapInterval !== -1) {
    setInterval(function () {
      _collection.remove({expires: {'$lte': Date.now()}}, function () { });
    }, options.reapInterval || 60 * 1000, this); // every minute
  }


  _db.open(function (err) {
    if (err) {
      throw Error("Error connecting to " + _url);
    }

    if (_details.username && _details.password) {
      _db.authenticate(_details.username, _details.password, function () {
        _getCollection(_db);
      });
    } else {
      _getCollection(_db);
    }
  });
};

MONGOSTORE.prototype.__proto__ = Store.prototype;

/**
 * Attempt to fetch session by the given `sid`.
 *
 * @param {String} sid
 * @param {Function} cb
 * @api public
 */

MONGOSTORE.prototype.get = function (sid, cb) {
  _default(cb);
  _collection.findOne({_id: sid}, function (err, data) {
    try {
      if (data) {
        cb(null, JSON.parse(data.session.toString()));
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

MONGOSTORE.prototype.set = function (sid, sess, cb) {
  _default(cb);
  try {
    var update = {_id: sid, session: JSON.stringify(sess)};
    if (sess && sess.cookie && sess.cookie.expires) {
      update.expires = Date.parse(sess.cookie.expires);
    }

    _collection.update({_id: sid}, update, {upsert: true}, function (err, data) {
      cb.apply(this, arguments);
    });
  } catch (exc) {
    cb(exc);
  }
};

/**
 * Destroy the session associated with the given `sid`.
 *
 * @param {String} sid
 * @api public
 */

MONGOSTORE.prototype.destroy = function (sid, cb) {
  _collection.remove({_id: sid}, _default(cb));
};

/**
 * Fetch number of sessions.
 *
 * @param {Function} cb
 * @api public
 */

MONGOSTORE.prototype.length = function (cb) {
  _collection.count({}, _default(cb));
};

/**
 * Clear all sessions.
 *
 * @param {Function} cb
 * @api public
 */

MONGOSTORE.prototype.clear = function (cb) {
  _collection.drop(_default(cb));
};

/**
 * Get the collection
 *
 * @param
 * @api public
 */
MONGOSTORE.prototype.getCollection = function () {
  return _collection;
};
