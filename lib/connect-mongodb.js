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
      var url = '',
          hosts = !options.host ? [defaults.host] : 'object' === typeof options.host ? options.host : [options.host],
          ports = !options.port ? [defaults.port] : 'object' === typeof options.port ? options.port : [options.port],
          username = options.username || '',
          password = options.password || '',
          userpass = '',
          i, len;

      if ((username !== '' && password === '') || (password !== '' && username === '')) {
        throw Error('Need both username and password to make an auth connection.');
      } else if (username !== '') {
        userpass = username + ':' + password + '@';
      }

      for (i = 0, len = Math.max(hosts.length, ports.length); i < len; i++) {
        url += 'mongo://';

        url += userpass;

        url += (hosts[i] || hosts[0]) + ':';
        url += ports[i] || ports[0];
        url += options.dbname ? '/' + options.dbname : defaults.dbname;

        if (i !== len - 1) {
          url += ',';
        }
      }

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
      var details = [], i, len, config, auth;
      url = url.split(',');

      for (i = 0, len = url.length; i < len; i++) {
        config = require('url').parse(url[i]);
        auth = null;

        if (!config.protocol.match(/^mongo/)) {
          throw new Error("URL must be in the format mongo://user:pass@host:port/dbname");
        }

        if (config.auth) {
          auth = config.auth.split(':', 2);
        }

        details.push({
          host: config.hostname || defaults.host,
          port: config.port || defaults.port,
          dbname: config.pathname.replace(/^\//, '') || defaults.dbname,
          username: auth && auth[0],
          password: auth && auth[1]
        });
      }

      return details.length > 1 ? details : details[0];
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
      _db,

      _getCollection = function (_db) {
        _db.collection(options.collection || defaults.collection, function (err, col) {
          if (err) {
            throw err;
          }
          _collection = col;
        });
      },
      servers = [], i, len;

  if (!_details.length) {
    _db = new mongo.Db(_details.dbname, new mongo.Server(_details.host, _details.port, options));
  } else {
    for (i = 0, len = _details.length; i < len; i++) {
      servers.push(new mongo.Server(_details[i].host, _details[i].port, {}));
    }
    _db = new mongo.Db(_details[0].dbname, new mongo.ReplSetServers(servers));
  }

  Store.call(this, options);

  if (options.reapInterval !== -1) {
    setInterval(function () {
      _collection.remove({expires: {'$lte': Date.now()}}, function () { });
    }, options.reapInterval || 60 * 1000, this); // defaults to each minute
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
        cb(null, data.session);
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
    var update = {_id: sid, session: sess};
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
