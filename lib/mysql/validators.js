// Validation Helpers
// ------------------
var _ = require('underscore');

var Base = { Validators: {} };

Base.Validators = {
  Required: function (value) {
    if (!arguments.length) return arguments.callee;
    if (_.missing(value)) return { name: 'required', value: value };
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
        return { name: 'length', value: value, max: max, min: min };
      }
    }
    fn.meta = { name: 'length', max: max, min: min };
    return fn;
  },
  Serializable: function (serializer) {
    var fn = function (value) {
      if (_.missing(value)) return;
      var string = serializer(value);
      if (!string) return { name: 'serializable', value: value };
    }
    fn.meta = { name: 'serializable', serializer: serializer };
    return fn;
  },
  Regexp: function (regexp) {
    return function (value) {
      if(!regexp.test(value)) {
        return { name: 'regexp', value: value, regexp: regexp }
      }
    }
  },
  Email: function (value) {
    if (!arguments.length) return arguments.callee;
    var re = /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/;
    var err = Base.Validators.Regexp(re)(value);
    if (err) { err.name = 'email'; return err }
  },
  
  Doc: function (validators) {
    return function (value) {
      var errors = [];
      value = value || {};
      
      _.each(validators, function (v, field) {
        var err = v(value[field]);
        if (err) err.field = field;
        errors.push(err);
      });
      
      errors = _.reject(errors, _.isUndefined);
      if (errors.length) {
        return { name: 'doc', errors: errors }
      };
    }
  },
  
  Type: {
    Enum: function (valid) {
      var fn = function (value) {  
        if (_.missing(value)) return;
        if (!_.include(valid, value)) {
          return { name: 'type.enum', value: value };
        }
      }
      fn.meta = { name: 'type.enum', valid: valid};
      return fn;
    },
    Number: function (value) {
      if (!arguments.length) return arguments.callee;
      if (_.missing(value)) return;
      if (Number(value) != value) return { name: 'type.number', value: value };
    },
    String: function (value) {
      if (!arguments.length) return arguments.callee;
      if (_.missing(value)) return;
      if (!_.isString(value)) return { name: 'type.string', value: value };
    },
    Object: function (value) {
      if (!arguments.length) return arguments.callee;
      if (_.missing(value)) return;
      if (String(value) !== '[object Object]' || _.isString(value)) {
        return { name: 'type.object', value: value };
      }
    }
  }
}

Base.Validators.Required.when = function (opt) {
  var field = opt['field']
    , fieldValue = opt['is'];
  return function (value, attrs) {
    if (attrs[field] && attrs[field] === fieldValue && _.missing(value)) {
      return _.extend({ name: 'required-when', value: value }, opt);
    }
  }
}

module.exports = Base.Validators;