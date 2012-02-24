// Schema helpers
// --------------
var _ = require('underscore');

var Base = { };

// include validators
Base.Validators = require('./validators.js');

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
  var factory = function () {
    var args = [].slice.call(arguments)
      , self = {}
      , newFn;
    
    function applier(memo, arg) {
      return memo.bind(self, arg);
    }
    
    newFn = _.foldl(args, applier, fn);
    
    return function (field) {
      self.field = field;
      return newFn.bind(self).call();
    }
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
  
  // this is a fucking nightmare and needs to be refactored
  String: ff(function (size, opts) {  
    if (_.isObject(size)) { return arguments.callee.call(this, opts, size) }
    
    opts = opts || {};
    
    size = size||opts.size||opts.length;
    
    var spec = { sql: '', validators : [Base.Validators.Type.String] }
    
    if (size) {
      if (isNaN(Number(size))) {
        spec.sql = size + (opts.type || 'text');
      } else {
        opts.type = (opts.type || 'varchar');
        spec.sql = opts.type+'('+size+')';
        spec.validators.push(Base.Validators.Length(size));
      }
    }
    else {
      _.defaults(opts, {type: 'text'});
      spec.sql = opts.type;
    }
    if (opts.type && opts.type.match(/char/i) && !size) {
      throw new Error('type mismatch: ' + opts.type + ' must be set with a size');
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
    opts.model.parseSchema();
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

module.exports = Base.Schema;