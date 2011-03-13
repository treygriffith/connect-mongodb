# connect-mongodb

connect-mongodb is a MongoDB session store backed by [node-mongodb-native](http://github.com/christkv/node-mongodb-native).

Originally written by [dvv](http://github.com/dvv)

## Installation

via npm:

    $ npm install connect-mongodb

## Options

  * `dbname` mongoDB db name _'dev' by default_
  * `host` mongoDB server hostname _'127.0.0.1' by default_
  * `port` mongoDB server port _27017 by default_
  * `username` mongoDB server username
  * `password` mongoDB server password
  * `collection` mongoDB collection to host sessions. _'sessions' by default_
  * `reapInterval` ms to check expired sessions to remove on db

## Example

    var connect = require('connect'),
        mongoStore = require('connect-mongodb');

    connect.createServer(
      connect.bodyParser(),
      connect.cookieParser(),
      connect.session({
        cookie: {maxAge: 60000 * 20}, // 20 minutes
        secret: 'foo',
        store: mongoStore({
          dbname: 'production',
          username: 'foo',
          password: 'bar'
        })
      })
    );
