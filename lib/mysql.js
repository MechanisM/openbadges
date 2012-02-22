var mysql = require('mysql')
  , conf = require('../lib/configuration').get('database')
  , client = mysql.createClient(conf)
  , testDb = "`" + conf.database + "_test`"
  , _ = require('underscore')

var schemas = [
  "CREATE TABLE IF NOT EXISTS `user` ("
    + "id               BIGINT AUTO_INCREMENT PRIMARY KEY,"
    + "email            VARCHAR(255) UNIQUE NOT NULL,"
    + "last_login       INT(13) NULL,"
    + "active           BOOLEAN DEFAULT 1,"
    + "passwd           VARCHAR(255),"
    + "salt             TINYBLOB"
  + ") ENGINE=InnoDB;",

  "CREATE TABLE IF NOT EXISTS `badge` ("
    + "id            BIGINT AUTO_INCREMENT PRIMARY KEY,"
    + "user_id       BIGINT,"
    + "type          ENUM('hosted', 'signed') NOT NULL,"
    + "endpoint      TINYTEXT,"
    + "public_key    TEXT,"
    + "jwt           TEXT,"
    + "image_path    VARCHAR(255) NOT NULL,"
    + "rejected      BOOLEAN DEFAULT 0,"
    + "body          MEDIUMBLOB NOT NULL,"
    + "body_hash     VARCHAR(255) UNIQUE NOT NULL,"
    + "validated_on  TIMESTAMP DEFAULT CURRENT_TIMESTAMP," 
    + "FOREIGN KEY user_fkey (user_id) REFERENCES `user`(id)"
  + ") ENGINE=InnoDB;",
  
  "CREATE TABLE IF NOT EXISTS `group` ("
    + "id               BIGINT AUTO_INCREMENT PRIMARY KEY,"
    + "user_id          BIGINT NOT NULL,"
    + "name             VARCHAR(255),"
    + "url              VARCHAR(255) UNIQUE,"
    + "public           BOOLEAN DEFAULT 0,"
    + "badges           MEDIUMBLOB NOT NULL,"
    + "FOREIGN KEY user_fkey (user_id) REFERENCES `user`(id)"
  + ") ENGINE=InnoDB;"
];

exports.schemas = schemas;

exports.createTables = function () {
  schemas.forEach(function(schema){
    client.query(schema);
  })
}
exports.useTestDatabase = function () {
  client.query("CREATE DATABASE IF NOT EXISTS " + testDb);
  client.query("USE "+ testDb);
}
exports.dropTestDatabase = function () {
  client.query("DROP DATABASE IF EXISTS " + testDb);
}
exports.prepareTesting = function () {
  exports.dropTestDatabase();
  exports.useTestDatabase();
  exports.createTables();
}

exports.client = client
client._insert = function (table, fields, callback) {
  var keys = Object.keys(fields)
    , values = keys.map(function (k) { return fields[k] })
    , placeholders = keys.map(function () { return '?' });
  var querystring
    = 'INSERT INTO `'+table+'` '
    + '('+keys.join(', ')+') '
    + 'VALUES '
    + '('+placeholders.join(', ')+')';

  client.query(querystring, values, callback);
}

client._upsert = function (table, fields, callback) {
  if (!fields['id']) return client._insert(table, fields, callback);
  var keys = Object.keys(fields)
    , values = keys.map(function (k) { return fields[k] })
  var querystring
    = 'UPDATE `'+table+'` SET '
    + keys.map(function (k) { return k + ' = ?'}).join(', ')
    + ' WHERE id = ?'

  values.push(fields['id']);
  client.query(querystring, values, callback)
}
exports.createTables()


mysql.Client.prototype.select = function (fields) {
  var F = Object.create(mysql.Client.prototype)
    , client = this;
  F.qs = [];
  F.values = [];
  F.qs.str = function () { return this.join(' '); }
  
  function NormalStatement (cmd) {
    return function (input) {
      F.qs.push(cmd);
      if (_.isString(input) || _.isArray(input)) {
        F.qs.push(input+'');
      }
      else {
        var items = [];
        _.each(input, function (value, key) {
          items.push(key + ' AS ' + value);
        });
        F.qs.push(items.join(','));
      }
      return F;
    }
  }
  
  function CompareStatement (cmd) {
    return function (comparison) {
      var rest = [].slice.call(arguments, 1)
        , values = this.values
        , qs = this.qs
      qs.push(cmd, comparison);
      if (rest.length) {
        if (rest.length === 1 && _.isArray(rest[0])) rest = rest[0];
        values.push.apply(values, rest);
      }
      return this;
    }
  }
  
  function BooleanStatement(cmd) {
   return function () { F.qs.push(cmd); return this; }
  }
  
  F.select = NormalStatement('SELECT');
  F.from = NormalStatement('FROM');
  F.join = function (type, tables) {
    var cmd = [];
    if (type) cmd.push(type.toUpperCase());
    cmd.push('JOIN')
    return NormalStatement(cmd.join(' '))(tables);
  }
  F.innerJoin = F.join.bind(F, 'inner')
  F.outerJoin = F.join.bind(F, 'outer')
  F.rightJoin = F.join.bind(F, 'right')
  F.leftJoin = F.join.bind(F, 'left')
  F.crossJoin = F.join.bind(F, 'cross')
  F.on = CompareStatement('ON');
  F.where = CompareStatement('WHERE');
  F.and = CompareStatement('AND');
  F.or = CompareStatement('OR');
  
  F.limit = function (obj) {
    var argv = [].slice.call(arguments);
    F.qs.push('LIMIT')
    if (obj.hasOwnProperty('count') || obj.hasOwnProperty('offset')) {
      argv = [];
      if(obj['offset']) argv.push(obj['offset']);
      argv.push(obj['count'] || 0);
    }
    F.qs.push(argv.join(','));
    return this;
  }
  
  F.go = function (callback) {  
    var queryString = F.qs.join(' ');
    return client.query(queryString, this.values, callback);
  }
  
  F.select(fields);
  return F;
}
