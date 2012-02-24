// Validation Helpers
// ------------------
var _ = require('underscore');

var Base = { Validators: {} };

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
  }
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

module.exports = Base.Validators;