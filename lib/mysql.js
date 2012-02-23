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
//exports.createTables()


// Query Convenience Methods
// =========================
mysql.Client.prototype.insert = function (table, fields, callback) {
  var keys = Object.keys(fields)
    , values = keys.map(function (k) { return fields[k] })
    , placeholders = keys.map(function () { return '?' });
  var querystring
    = 'INSERT INTO `'+table+'` '
    + '('+keys.join(', ')+') '
    + 'VALUES '
    + '('+placeholders.join(', ')+')';

  this.query(querystring, values, callback);
}

mysql.Client.prototype.upsert = function (table, fields, callback) {
  if (!fields['id']) return this.insert(table, fields, callback);
  var keys = Object.keys(fields)
    , values = keys.map(function (k) { return fields[k] })
  var querystring
    = 'UPDATE `'+table+'` SET '
    + keys.map(function (k) { return k + ' = ?'}).join(', ')
    + ' WHERE id = ?'

  values.push(fields['id']);
  this.query(querystring, values, callback)
}

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


// Base Model
// ==========

var Base = function (attributes) {}
Base.prototype = {
  driver: 'mysql',
  engine: 'InnoDB',
  schema: null,
  validators: null,
  
  save: function () {},
  
  destroy: function () {},
  
  // Internal
  // --------
  
  // A number of methods create or populate the `_fieldspec` object.
  // The object is keyed by the fields in the schema. The values of are
  // objects that have, at the very minimum, an `sql` property. They can
  // also contain:
  //   `validators` -- an array of validator functions,
  //   `keySql` -- sql for generating key contraints
  //   `dependsOn` -- a model the field depends on.
  //   `mutators` -- object with `storage` and `retrieval` props
  _fieldspec: null,
  
  // Parse the `schema` object, handle any helpers, and turn it into a 
  // fieldspec entry.
  _parseSchema: function () {
    var schema = this.schema
      , fieldspec = this._fieldspec || {};
    this._fieldspec = fieldspec;
    
    if (!schema) {
      throw new Error('_parseSchema: Missing schema');
    }
    
    if (String(schema) !== '[object Object]') {
      throw new TypeError('schema must be an object');
    }
    
    _.each(schema, function (value, key) {
      // A string means that the user wants this inserted as raw sql
      if (_.isString(value)) {
        fieldspec[key] = _.extend({}, {sql: value});
      }

      // Functions should generate an object with, at the very least, an `sql`
      // property. They can optionally generate more (like validators).
      // The function can also be a higher order function that returns a
      // function that does the above.
      if (_.isFunction(value)) {
        var spec = value.higherOrder ? value()() : value();
        fieldspec[key] = _.extend({}, fieldspec[key], spec);
      }
    });
  },

  // Add validators from `this.validators` if there are any. They should
  // be added at the end of the validation chain.
  _addValidators: function () {
    var validators = this.validators
      , fieldspec = this._fieldspec || {};
    this._fieldspec = fieldspec;
    
    if (!validators) return;
    _.each(validators, function (value, key) {
      var spec = fieldspec[key]
      // wrap non-array values in an array as a convenience to the user.
      if (!_.isArray(value)) {
        value = [value]
      }
      if (!spec) {
        spec = fieldspec[key] = {};
      }
      if (!spec.validators) {
        spec.validators = [];
      }
      spec.validators = _.union(spec.validators, value);
    });
  }
};


// The following is all jacked from Backbone.js (version 0.9.1)
Base.extend = function (protoProps, classProps) {
  var child = inherits(this, protoProps, classProps);
  child.extend = this.extend;
  return child;
};


// Helper function to correctly set up the prototype chain, for subclasses.
// Similar to `goog.inherits`, but uses a hash of prototype properties and
// class properties to be extended.
var inherits = function(parent, protoProps, staticProps) {
  var child;
  
  // Shared empty constructor function to aid in prototype-chain creation.
  var ctor = function(){};
  
  // The constructor function for the new subclass is either defined by you
  // (the "constructor" property in your `extend` definition), or defaulted
  // by us to simply call the parent's constructor.
  if (protoProps && protoProps.hasOwnProperty('constructor')) {
    child = protoProps.constructor;
  } else {
    child = function(){parent.apply(this, arguments);};
  }

  // Inherit class (static) properties from parent.
  _.extend(child, parent);

  // Set the prototype chain to inherit from `parent`, without calling
  // `parent`'s constructor function.
  ctor.prototype = parent.prototype;
  child.prototype = new ctor();

  // Add prototype properties (instance properties) to the subclass,
  // if supplied.
  if (protoProps) _.extend(child.prototype, protoProps);

  // Add static properties to the constructor function, if supplied.
  if (staticProps) _.extend(child, staticProps);

  // Correctly set child's `prototype.constructor`.
  child.prototype.constructor = child;

  // Set a convenience property in case the parent's prototype is needed later.
  child.__super__ = parent.prototype;

  return child;
};
exports.Base = Base;
