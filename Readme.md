# connect-mongodb

connect-mongodb is a mongoDB session store backed by [node-mongodb-native](http://github.com/christkv/node-mongodb-native).

Originally written by [dvv](http://github.com/dvv)

## Installation

via npm:

    $ npm install connect-mongodb

## Options

You can build your MongoDB connection url passing an object with the following parameters:

  * `dbname` MongoDB db name _'dev' by default_
  * `host` MongoDB server hostname _'127.0.0.1' by default_
  * `port` MongoDB server port _27017 by default_
  * `username` MongoDB server username
  * `password` MongoDB server password

Or just the url:

  * `url` MongoDB connection url

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

## test

To run the tests:

    node test
