# Connect MongoDB

connect-mongodb is a MongoDB session store backed by [node-mongodb-native](http://github.com/christkv/node-mongodb-native).

Originally written by [dvv](http://github.com/dvv)

## Installation

Via git:

    $ git clone git://github.com/masylum/connect-mongodb.git ~/.node_libraries/connect-mongodb

via npm:

    $ npm install connect-mongodb

## Options

  * `dbname` MongoDB db name _'dev' by default_
  * `host` MongoDB server hostname _'127.0.0.1' by default_
  * `port` MongoDB server port _27017 by default_
  * `username` MongoDB server username
  * `password` MongoDB server password
  * `collection` MongoDB collection to host sessions. _'sessions' by default_

## Example

    var connect = require('connect'),
        mongoStore = require('connect-mongodb');

    connect.createServer(
      connect.bodyDecoder(), // Always before the session
      connect.cookieDecoder(),
      connect.session({store: mongoStore({
        dbname: 'production',
        username: 'foo',
        password: 'bar'
      })})
    );

## Warning

If you use the bodyDecoder middleware, place it *before* the session one! In some connect versions it breaks async session stores.
