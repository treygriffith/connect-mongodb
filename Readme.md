# connect-mongodb

connect-mongodb is a mongoDB session store backed by [node-mongodb-native](http://github.com/christkv/node-mongodb-native).

Originally written by [dvv](http://github.com/dvv)

## Installation

via npm:

    $ npm install connect-mongodb

## Updating

If you update this module, please clean your sessions database as some changes may affect the way the sessions are stored.

## Options

You can build your MongoDB connection url passing an object with the following parameters:

  * `dbname` MongoDB db name _'dev' by default_
  * `host` MongoDB server hostname _'127.0.0.1' by default_ (pass an array for replica set)
  * `port` MongoDB server port _27017 by default_ (pass an array for replica set)
  * `username` MongoDB server username
  * `password` MongoDB server password

Or just the url:

  * `url` MongoDB connection url (comma separated list of urls for replica set)

Other options:

  * `collection` MongoDB collection to host sessions. _'sessions' by default_
  * `reapInterval` ms to check expired sessions to remove on db

## Example

You have a complete example on `examples/index.js`.

    var connect = require('connect'),
        mongoStore = require('connect-mongodb');

    connect.createServer(
      connect.bodyParser(),
      connect.cookieParser(),
      connect.session({
        cookie: {maxAge: 60000 * 20}, // 20 minutes
        secret: 'foo',
        store: new mongoStore({
          dbname: 'production',
          username: 'foo',
          password: 'bar'
        })
      })
    );

## Host - Port Examples for Replica Sets

Instances running on separate machines:

    {
      cookie: {maxAge: 60000 * 20}, // 20 minutes
      secret: 'foo',
      store: new mongoStore({
        host: ['xx.xxx.xxx.xx', 'xx.xxx.xx.xxx', 'xx.xxx.xx.xxx'],
        port: 27017
      })
    }

...separate ports:

    {
      cookie: {maxAge: 60000 * 20}, // 20 minutes
      secret: 'foo',
      store: new mongoStore({
        host: 'localhost',
        port: [27017, 27017, 27018]
      })
    }

Or some combination:

    {
      cookie: {maxAge: 60000 * 20}, // 20 minutes
      secret: 'foo',
      store: new mongoStore({
        host: ['xx.xxx.xxx.xx', 'xx.xxx.xx.xxx', 'xx.xxx.xx.xxx'],
        port: [27017, 27017, 27018]
      })
    }

## test

To run the tests:

    node test
