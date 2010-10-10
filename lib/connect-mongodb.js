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
    DB = require('mongodb/db').Db,
    Server = require("mongodb/connection").Server;

/**
 * Initialize RedisStore with the given `options`.
 *
 * @param {Object} options
 * @api public
 */

module.exports = function RedisStore(options, callback) {

    options = options || {};

    var client = null,
        mongoStore = Store.prototype,
        connection = new DB(options.dbname, new Server(options.host || '127.0.0.1', options.port || 27017, {}), {});

    Store.call(mongoStore, options);
    connection.open(function (err, db) {
        db.collection(options.collection || 'sessions', function (err, collection) {
            client = collection;
            callback(client);
        });
    });

    /**
     * Attempt to fetch session by the given `hash`.
     *
     * @param {String} hash
     * @param {Function} fn
     * @api public
     */

    mongoStore.get = function (hash, fn) {
        client.findOne({_id: hash}, function (err, data) {
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
            client.update({_id: hash}, sess, {upsert: true}, function (err, data) {
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
        client.remove({_id: hash}, fn);
    };

    /**
     * Fetch number of sessions.
     *
     * @param {Function} fn
     * @api public
     */

    mongoStore.length = function (fn) {
        client.count({}, fn);
    };

    /**
     * Clear all sessions.
     *
     * @param {Function} fn
     * @api public
     */

    mongoStore.clear = function (fn) {
        client.drop(fn);
    };

    /**
     * Get the client
     *
     * @param
     * @api public
     */
    mongoStore.getClient = function (fn) {
        return client;
    };

    return mongoStore;
};
