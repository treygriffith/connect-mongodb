# Connect MongoDB

connect-mongodb is a MongoDB session store backed by [node-mongodb-native](http://github.com/christkv/node-mongodb-native).

Originally written by [dvv](http://github.com/dvv)

## Installation

Via git:

    $ git clone git://github.com/masylum/connect-mongodb.git ~/.node_libraries/connect-mongodb

via npm:

    $ npm install connect-mongodb

## Options

  * `dbname` MongoDB db name
  * `host` MongoDB server hostname
  * `port` MongoDB server portno
  * `collection` MongoDB collection to host sessions. 'sessions' by default.

## Example

    var connect = require('connect')
          , mongoStore = require('connect-mongodb');

    connect.createServer(
      connect.cookieDecoder(),
      connect.session({ store: mongoStore() })
    );
