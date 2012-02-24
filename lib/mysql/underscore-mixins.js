var _ = require('underscore')
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
