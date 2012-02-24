var _ = require('underscore')

_.mixin({
  isObject: function (value) {
    return (String(value) === '[object Object]' && !_.isString(value))
  },
  missing : function (value){
    return (undefined === value || null === value);
  },
  getter: function (o) { return function (v) { return o[v] } },
  zippo: function (a1, a2) {
    var a1a2 = _.zip(a1, a2)
    , oneFieldTwoValue = function(m, a) { m[a[0]] = a[1]; return m }
    return _.reduce(a1a2, oneFieldTwoValue, {});
  },
})
  
// string helpers
// --------------
_.mixin({
  strwrp: function (c, str) { return c + str + c },
  sstrwrp: function (l, r, str) { return l + str + r }
})

// string methods
// --------------
_.mixin({
  paren: _.sstrwrp.bind(null, '(', ')'),
  quote: _.strwrp.bind(null, '"'),
  squote: _.strwrp.bind(null, "'"),
  backtick: _.strwrp.bind(null, "`"),
  upcase: function (str) { return str.toUpperCase() },
  downcase: function (str) { return str.toLowerCase() }
});
