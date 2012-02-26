var _ = require('underscore')
  , mysql = require('mysql')
  , conf = require('../configuration.js').get('database')
  , client = mysql.createClient(conf)

var parseSpecification = function (spec) {
  var result = {}
  _.each(spec, function (value, key) {
    if (_.isString(value)) {
      return result[key] = _.extend({}, { sql: value });
    }

    if (_.isObject(value)) {
      return result[key] = _.extend({}, value);
    }

    if (_.isFunction(value)) {
      var completed = value.higherOrder ? value()(key) : value(key);
      return result[key] = completed;
    }
  });
  return result;
};

var Migration = function BaseMigration (Model) {
  return _.extend(Migration, { model: Model, table: Model.prototype.table });
  console.dir(Model.prototype.table);
  return x;
};



var sqlgen = {}
sqlgen['change'] = sqlgen['add'] = function (spec, method) {
  var statements = parseSpecification(spec)
    , values = _.values(statements).pop()
    , sql = values.sql
    , keysql = values.keysql
    , column = _.keys(statements).pop()
    , results = [_.strjoin([
      _.upcase(method),
      _.backtick(column),
      _.upcase(sql)
    ])]
  if (keysql) results.push(_.strjoin(['ADD', keysql]));
  return results;
};
sqlgen['drop'] = function (column) {
  return _.strjoin([ _.upcase('drop'), _.backtick(column) ]);
};
sqlgen['engine'] = function (engine) {
  return _.strjoin([ _.upcase('engine ='), engine ]);
};
sqlgen['add key'] = function (opt) {
  var column = _.keys(opt).pop()
    , keyopt = _.values(opt).pop()
    , type = keyopt['type']
    , length = keyopt['length']
    , name = keyopt['name']
  return _.strjoin([
    _.upcase('add'),
    _.upcase(type),
    _.upcase('key'),
    _.backtick(column),
    _.paren(_.strjoin([
      _.backtick(name||column),
      _.paren(length)
    ]))
  ]);
};

_.extend(Migration, {
  getAlterSql: function getAlterSql (spec, method) {
    function arrayify (o) { return _.isArray(o) ? o : [o] }
    var statements = arrayify(sqlgen[method](spec, method));
  
    return _.map(statements, function (sql) {
      return _.strjoin([ _.upcase('alter table'), _.backtick(this.table), sql ])
    }.bind(this))
  },

  addColumn: function (spec, callback) {
    var sql = this.getAlterSql(spec, 'add');
    console.dir(sql);
    callback('wut', 1);
  }
});

module.exports = Migration;
