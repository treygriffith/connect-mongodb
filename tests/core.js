var testosterone = require('testosterone')({title: 'models/advertiser'})
  , assert = testosterone.assert
  , gently = global.GENTLY = new (require('gently'))
  , Db = require('mongodb').Db
  , Server = require('mongodb').Server
  , server_config = new Server('localhost', 27017, {auto_reconnect: true, native_parser: true})
  , db = new Db('test', server_config, {});

testosterone

  .add('Should callback an error if no db given', function (done) {
    var funk = require('funk')('parallel');

    db.open(function () {
      require('..')(null, funk.add(assert.ok));
      require('..')({db: null}, funk.add(assert.ok));
      require('..')({db: db, setInterval: -1}, funk.add(assert.ifError));
      require('..')({server_config: server_config, setInterval: -1}, funk.add(assert.ifError));
      funk.run(done);
    });
  })

  .run();

