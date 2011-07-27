/*!
 * Connect - Mongodb
 * Copyright(c) 2010 Vladimir Dronnikov <dronnikov@gmail.com>
 * Mantained by Pau Ramon Revilla <masylum@gmail.com>
 * MIT Licensed
 */

var Store = require('connect').session.Store
  , mongo = require('mongodb')
  , _collection = null
  , _default = function (callback) {
      callback = typeof(callback) === 'function' ? callback : function () { };
      return callback;
    }
  , _defaults = {host: '127.0.0.1', port: 27017, dbname: 'dev', collection: 'sessions', reapInterval: 60 * 1000};

/**
 * Initialize MongoStore with the given `options`.
 *
 * @param {Object} options
 * @param {Function} callback
 * @api public
 */
var MONGOSTORE = module.exports = function MongoStore(options, callback) {
  options = options || {};
  callback = _default(callback);

  var db, server_config;

  function getCollection(db, callback) {
    db.collection(options.collection || _defaults.collection, function (err, col) {
      if (err) callback(err);
      _collection = col;
      callback();
    });
  }

  function authenticateAndGetCollection(callback) {
    if (options.username && options.password) {
      db.authenticate(options.username, options.password, function () {
        getCollection(db, callback);
      });
    } else {
      getCollection(db, callback);
    }
  }

  if (options.server_config) {
    server_config = options.server_config;
    db = new mongo.Db(options.dbname || _defaults.dbname, server_config);
  }

  if (options.db) {
    server_config = options.db.serverConfig;
    db = options.db;
  }

  if (!db || !server_config) {
    return callback(Error('You must provide a `db` or `server_config`!'));
  }

  Store.call(this, options);

  if (options.reapInterval !== -1) {
    setInterval(function () {
      _collection.remove({expires: {'$lte': Date.now()}}, function () { });
    }, options.reapInterval || _defaults.reapInterval, this); // _defaults to each minute
  }

  if (server_config.isConnected()) {
    authenticateAndGetCollection(callback);
  } else {
    server_config.connect(db, function (err) {
      if (err) callback(Error("Error connecting (" + (err instanceof Error ? err.message : err) + ")"));
      authenticateAndGetCollection(callback);
    })
  }
};

MONGOSTORE.prototype.__proto__ = Store.prototype;

/**
 * Attempt to fetch session by the given `sid`.
 *
 *   Old versions of this code used to store sessions in the database
 *   as a JSON string rather than as a structure.  For backwards
 *   compatibility, handle old sessions.
 *
 * @param {String} sid
 * @param {Function} cb
 * @api public
 */
MONGOSTORE.prototype.get = function (sid, cb) {
  cb = _default(cb);
  _collection.findOne({_id: sid}, function (err, data) {
    try {
      if (data) {
        var sess =
            typeof data.session === 'string' ? JSON.parse(data.session)
                                             : data.session;
        cb(null, sess);
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
 *   With connect-session, `sess.cookie` has a getter `data`, and if we
 *   store sess.cookie.data in the DB, problems occur. Run sess through
 *   JSON.stringify(), which strips out the getter.
 *
 * @param {String} sid
 * @param {Session} sess
 * @param {Function} cb
 * @api public
 */
MONGOSTORE.prototype.set = function (sid, sess, cb) {
  cb = _default(cb);
  try {
    var update = {_id: sid, session: JSON.parse(JSON.stringify(sess))};
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
