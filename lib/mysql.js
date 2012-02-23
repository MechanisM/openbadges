var mysql = require('mysql')
  , conf = require('../lib/configuration').get('database')
  , client = mysql.createClient(conf)
  , testDb = "`" + conf.database + "_test`"
  , _ = require('underscore')

var strwrp = function (c, str) { return c + str + c };
var sstrwrp = function (l, r, str) { return l + str + r };
_.mixin({
  isObject: function (value) {
    return (String(value) === '[object Object]' && !_.isString(value))
  },
  missing : function (value){
    return (undefined === value || null === value);
  },
  paren: sstrwrp.bind(null, '(', ')'),
  quote: strwrp.bind(null, '"'),
  squote: strwrp.bind(null, "'"),
  backtick: strwrp.bind(null, "`"),
  upcase: function (str) { return str.toUpperCase() },
  downcase: function (str) { return str.toLowerCase() }
});

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

// The following two functions are jacked from Backbone.js (version 0.9.1)
var extend = function (protoProps, classProps) {
  var child = inherits(this, protoProps, classProps);
  child.extend = this.extend;
  return child;
};
var inherits = function(parent, protoProps, staticProps) {
  var child;
  var ctor = function(){};
  if (protoProps && protoProps.hasOwnProperty('constructor')) {
    child = protoProps.constructor;
  } else {
    child = function(){parent.apply(this, arguments);};
  }
  _.extend(child, parent);
  ctor.prototype = parent.prototype;
  child.prototype = new ctor();
  if (protoProps) _.extend(child.prototype, protoProps);
  if (staticProps) _.extend(child, staticProps);
  child.prototype.constructor = child;
  child.__super__ = parent.prototype;
  return child;
};

// Base Model
// ==========
var Base = function (attributes) {
  this.attributes = attributes;
};
Base.extend = extend;
Base.prototype = {
  driver: 'mysql',
  engine: 'InnoDB',
  schema: null,
  validators: null,
  save: function () {},
  destroy: function () {}
};
_.extend(Base, {
  // Internal
  // --------
  
  // A number of methods create or populate the `_fieldspec` object.
  // The object is keyed by the fields in the schema. The values of are
  // objects that have, at the very minimum, an `sql` property. They can
  // also contain:
  //   `validators` -- an array of validator functions,
  //   `keysql` -- sql for generating key contraints
  //   `dependsOn` -- a model the field depends on.
  //   `mutators` -- object with `storage` and `retrieval` props
  fieldspec: null,
  
  // Parse the `schema` object, handle any helpers, and turn it into a 
  // fieldspec entry.
  parseSchema: function () {
    var schema = this.prototype.schema
      , fieldspec = this.fieldspec || {};
    this.fieldspec = fieldspec;
    
    if (!schema) {
      throw new Error('missing schema');
    }
    
    if (String(schema) !== '[object Object]') {
      throw new TypeError('schema must be an object');
    }
    
    _.each(schema, function (value, key) {
      // A string means that the user wants this inserted as raw sql
      if (_.isString(value)) {
        fieldspec[key] = _.extend({}, {sql: value});
      }

      // Pass objects straight through
      if (_.isObject(value)) {
        fieldspec[key] = _.extend({}, value);
      }

      // Functions should generate an object with, at the very least, an `sql`
      // property. They can optionally generate more (like validators).
      // The function can also be a higher order function that returns a
      // function that does the above.
      if (_.isFunction(value)) {
        var spec = value.higherOrder ? value()(key) : value(key);
        fieldspec[key] = _.extend({}, fieldspec[key], spec);
      }
    });
  },

  // Add validators from `this.validators` if there are any. They should
  // be added at the end of the validation chain.
  addValidators: function () {
    var validators = this.prototype.validators
      , fieldspec = this.fieldspec || {};
    this.fieldspec = fieldspec;
    
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
  },
  
  createTableSql: function () {
    var fieldsql = []
      , keysql = []
    _.each(this.fieldspec, function (value, key) {
      fieldsql.push([
        _.backtick(key),
        value.sql
      ].join(' '))
      
      if (value.keysql) {
        keysql.push(value.keysql);
      }
    })
    
    return [
      _.upcase('create table if not exists'),
      _.backtick(this.prototype.table),
      _.paren(_.union(fieldsql, keysql).join(', ')),
      _.upcase('engine ='),
      this.prototype.engine
    ].join(' ');
  }
});

// Validation Helpers
// ------------------
var ValidationError = function (msg, value, opts) {
  Error.call(this);
  Error.captureStackTrace(this, arguments.callee);
  this.message = msg;
  this.value = value;
  this.name = 'ValidationError';
  _.extend(this, opts||{});
}

ValidationError.prototype.__proto__ = Error.prototype;


Base.Validators = {
  Required: function (value) {
    if (!arguments.length) return arguments.callee;
    if (_.missing(value)) throw new ValidationError('REQUIRED');
  },
  Length: function () {
    var min, max, arg = arguments[0];
    if (String(arg) === '[object Object]') {
      min = arg['min'];
      max = arg['max'];
    } else {
      max = arg;
    }
    var fn = function (value) {
      if (_.missing(value)) return;
      if ((max && value.length > max) || (min && value.length < min)) {
        throw new ValidationError('LENGTH', value, {max: max, min: min});
      }
    }
    fn.meta = { name: 'length', max: max, min: min };
    return fn;
  },
  Serializable: function (serializer) {
    var fn = function (value) {
      if (_.missing(value)) return;
      var string = serializer(value);
      if (!string) throw new ValidationError('SERIALIZABLE', value);
    }
    fn.meta = { name: 'serializable', serializer: serializer };
    return fn;
  },
  Type: {
    Enum: function (valid) {
      var fn = function (value) {  
        if (_.missing(value)) return;
        if (!_.include(valid, value)) {
          throw new ValidationError('TYPE-ENUM', value)
        }
      }
      fn.meta = { name: 'type.enum', valid: valid};
      return fn;
    },
    Number: function (value) {
      if (!arguments.length) return arguments.callee;
      if (_.missing(value)) return;
      if (Number(value) != value) throw new ValidationError('TYPE-NUMBER', value);
    },
    String: function (value) {
      if (!arguments.length) return arguments.callee;
      if (_.missing(value)) return;
      if (!_.isString(value)) throw new ValidationError('TYPE-STRING', value);
    },
    Object: function (value) {
      if (!arguments.length) return arguments.callee;
      if (_.missing(value)) return;
      if (String(value) !== '[object Object]' || _.isString(value)) {
        throw new ValidationError('TYPE-OBJECT');
      }
    }
  },
}
Base.Validators.Required.when = function (opt) {
  var field = opt['field']
    , fieldValue = opt['is'];
  return function (value, attrs) {
    if (attrs[field] && attrs[field] === fieldValue && _.missing(value)) {
      throw new ValidationError('REQUIRED-WHEN', value, opt);
    }
  }
}

// Schema helpers
// --------------
function finishSpec(spec, opts) {
  if (opts.unique === true) {
    if (spec.sql.match(/^(text|blob)/i)) {
      throw new Error('when adding a unique key to an unsized type' +
                      '(text or blob), unique must be set with a' + 
                      'length e.g. { unique: 128 }');
    }
    spec.sql += ' UNIQUE';
  }
  
  if (parseInt(opts.unique)) {
    spec.keysql = 'UNIQUE KEY (' + this.field + '('+opts.unique+'))';
  }
  
  if (opts.null === false || opts.required === true) {
    spec.sql += ' NOT NULL';
    spec.validators.unshift(Base.Validators.Required);
  }
  
  if (opts.default !== undefined) {
    var defval = opts.default;
    spec.sql += ' DEFAULT ';
    if (opts.type.match(/blob|text|char|enum/i)) {
      spec.sql += '"' + defval + '"';
    } else {
      spec.sql += defval;
    }
  }
  return spec;
}

var ff = function (fn) {
  var factory = function (fieldName) {
    return fn.bind({field: fieldName});
  }
  factory.higherOrder = true;
  return factory;
};

Base.Schema = {
  Id: ff(function (opts) {
    return {
      sql: 'BIGINT AUTO_INCREMENT PRIMARY KEY',
      validators: [Base.Validators.Type.Number]
    };
  }),
  
  Number: ff(function (typeOrLength, opts) {
    // #TODO: implement numeric sizes.
    //        e.g. TINYINT(1).
    // #TODO: implement DECIMAL
    if (_.isObject(typeOrLength)) {
      return arguments.callee.call(this, opts, typeOrLength);
    }
    
    function parseArgs(typeOrLength, opts) {
      var lengths = ['tiny', 'small', 'medium', 'big']
        , types = ['int', 'double' , 'float']
        , defaults = { type: 'int', length: '' }
      _.defaults(opts, defaults);
      
      if (!typeOrLength) return;
      
      typeOrLength = typeOrLength.toLowerCase();
      
      if (_.include(lengths, typeOrLength)) {
        opts.length = typeOrLength;
      }
      else if (_.include(types, typeOrLength)) {
        opts.type = typeOrLength;
      }
    }
    
    opts = opts||{}
    
    parseArgs(typeOrLength, opts);
    
    var spec = {
      sql: opts.length + opts.type,
      validators : [Base.Validators.Type.Number]
    };
    
    if (opts.unsigned || opts.signed === false) {
      spec.sql += ' UNSIGNED';
    }
    
    if (opts.signed === true) {
      spec.sql += ' SIGNED';
    }
    
    finishSpec.bind(this)(spec, opts);
    spec.sql = spec.sql.toUpperCase();
    return spec;
  }),
  
  String: ff(function (size, opts) {  
    if (_.isObject(size)) { return arguments.callee.call(this, opts, size) }
    opts = opts||{};
    size = size||opts.size||opts.length;
    
    var spec = { sql: 'TEXT', validators : [Base.Validators.Type.String] }
    var type = opts.type || 'text';
    if (size) {
      if (isNaN(Number(size))) {
        spec.sql = size + type;
      } else {
        type = (opts.type || 'varchar');
        spec.sql = type+'('+size+')';
        spec.validators.push(Base.Validators.Length(size));
      }
    }
    opts.type = type;
    if (type && type.match(/char/i) && !size) {
      throw new Error('type mismatch: ' + type + ' must be set with a size');
    }
    finishSpec.bind(this)(spec, opts);
    spec.sql = spec.sql.toUpperCase();
    return spec;
  }),
  Enum: ff(function (values, opts) {
    if (_.isObject(values)) { return arguments.callee.call(this, opts, values) }
    opts = opts||{};
    _.defaults(opts, { type: 'enum' });
    values = values||opts.values;
    
    function q (v) { return '"'+v+'"' }
    
    var spec = {
      sql: 'ENUM (' + values.map(q).join(', ')+ ')' ,
      validators : [Base.Validators.Type.Enum(values)]
    };
    
    finishSpec.bind(this)(spec, opts);
    return spec;
  }),
  Foreign: ff(function (opts) {
    var spec = opts.model.fieldspec[opts.field]
      , type = spec.sql.split(' ').shift()
      , ftable = opts.model.prototype.table
    return {
      dependsOn: opts.model,
      sql: type,
      keysql: [
        _.upcase("foreign key"),
        _.backtick(opts.model.prototype.table + '_fkey'),
        _.paren(_.backtick(this.field)),
        _.upcase("references"),
        _.backtick(ftable),
        _.paren(_.backtick(opts.field))
      ].join(' ')
    };
  }),
  Document: ff(function (opts) {
    opts = opts||{}
    _.defaults(opts, {serializer: JSON.stringify, deserializer: JSON.parse });
    var spec = {
      sql: _.upcase('blob'),
      mutators: {
        storage: opts['serializer'],
        retrieval: opts['deserializer']
      },
      validators: [Base.Validators.Serializable(opts['serializer'])]
    }
    return finishSpec(spec, opts);
  }),
  Boolean: ff(function (opts) {  
    opts = opts||{}
    _.defaults(opts, { type: 'boolean' });
    var spec = { sql: _.upcase('boolean') };
    return finishSpec(spec, opts);
  }),
  Time: ff(function (opts) {
    opts = opts||{}
    _.defaults(opts, { type: 'timestamp' });
    var spec = { sql: _.upcase(opts.type) };
    return finishSpec(spec, opts);
  }),
  Set: function () {
    // #TODO: implement;
    throw new Error('not implemented');
  },
}
exports.Base = Base;
