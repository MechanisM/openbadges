var vows = require('vows')
  , assert = require('assert')
  , should = require('should')
  , mysql = require('../lib/mysql')
  , client = mysql.client
  , Base = mysql.Base

var qs = function (s) { return s.qs.join(' ') };
var spec = function (m) { return m.fieldspec };

mysql.prepareTesting();
vows.describe('testing mysql').addBatch({
  'client select basics': {
    'exists' : function () {
      assert.isFunction(client.select);
    },
    'gives back an object': function () {
      assert.isObject(client.select());
    },
    'is chainable': function () {
      var S = client.select();
      assert.isObject(S.where());
      assert.equal(S, S.where());
    },
    'multiple do not interfere': function () {
      var s1 = client.select('wut')
        , s2 = client.select('lol')
      qs(s1).should.equal('SELECT wut');
      qs(s2).should.equal('SELECT lol');
    },
  },
  'client#select' : {
    'can take a string' : function () {
      qs(client.select('*')).should.equal('SELECT *');
    },
    'can take an array': function () {
      qs(client.select(['ham', 'bones']), 'SELECT ham,bones');
    },
    'can take a hash': function () {
      qs(client.select({ham: 'pig', bones: 'carbon'}))
        .should.equal('SELECT ham AS pig,bones AS carbon');
    }
  },
  'client#from' : {
    topic: function () { return function () { return client.select('*') } },
    'can take a string': function (sfn) {
      qs(sfn().from('animals'))
        .should.equal('SELECT * FROM animals')
    },
    'can take an array': function (sfn) {
      
      qs(sfn().from(['animals', 'anatomy']))
        .should.equal('SELECT * FROM animals,anatomy')
    },
    'can take a hash': function (sfn) {
      qs(sfn().from({animals: 'mals', anatomy: 'tomy'}))
        .should.equal('SELECT * FROM animals AS mals,anatomy AS tomy')
    },
  },
  'client#join' : {
    topic: function () {
      return function () { return client.select('*').from('a'); }
    },
    'can take a string': function (sfn) {
      qs(sfn().join('inner', 'bears'))
        .should.equal('SELECT * FROM a INNER JOIN bears')
    },
    'can take an array': function (sfn) {
      qs(sfn().join('inner', ['wolves', 'bears']))
        .should.equal('SELECT * FROM a INNER JOIN wolves,bears');
    },
    'can take a hash': function (sfn) {
      qs(sfn().join('inner', {wolves: 'w', bears:'b'}))
        .should.equal('SELECT * FROM a INNER JOIN wolves AS w,bears AS b')
    }
  },
  'client#innerJoin' : {
    topic: function () {
      return function () { return client.select('*').from('a'); }
    },
    'is equivalent to client#join(inner, ...)': function (sfn) {
      var s1 = sfn(), s2 = sfn();
      s1.join('inner', 'bears');
      s2.innerJoin('bears');
      qs(s1).should.equal(qs(s2));
    },
  },
  'client#outerJoin' : {
    topic: function () {
      return function () { return client.select('*').from('a'); }
    },
    'is equivalent to client#join(inner, ...)': function (sfn) {
      var s1 = sfn(), s2 = sfn();
      s1.join('outer', 'bears');
      s2.outerJoin('bears');
      qs(s1).should.equal(qs(s2));
    },
  },
  'client#on': {
    topic: function () {
      return function () { return client.select('*').from('a').innerJoin('b'); }
    },
    'can take a string': function (sfn) {
      qs(sfn().on('a.id = b.id'))
        .should.equal('SELECT * FROM a INNER JOIN b ON a.id = b.id')
    },
    'can take a string and multiple values': function (sfn) {
      var s = sfn()
      qs(s.on('a.id = ? AND b.id = ?', 10, 50))
        .should.equal('SELECT * FROM a INNER JOIN b ON a.id = ? AND b.id = ?')
      s.values.should.have.lengthOf(2);
      s.values[0].should.equal(10);
      s.values[1].should.equal(50);
    },
    'can take a string and an array of values': function (sfn) {
      var s = sfn()
      qs(s.on('a.id = ? AND b.id = ?', [10, 50]))
        .should.equal('SELECT * FROM a INNER JOIN b ON a.id = ? AND b.id = ?')
      s.values.should.have.lengthOf(2);
      s.values[0].should.equal(10);
      s.values[1].should.equal(50);
    }
  },
  'client#where': {
    topic: function () {
      return function () { return client.select('*').from('a'); }
    },
    'can take a string': function (sfn) {
      qs(sfn().where('a.id = b.id'))
        .should.equal('SELECT * FROM a WHERE a.id = b.id')
    },
    'can take a string and multiple values': function (sfn) {
      var s = sfn()
      qs(s.where('a.id = ? AND b.id = ?', 10, 50))
        .should.equal('SELECT * FROM a WHERE a.id = ? AND b.id = ?')
      s.values.should.have.lengthOf(2);
      s.values[0].should.equal(10);
      s.values[1].should.equal(50);
    },
    'can take a string and an array of values': function (sfn) {
      var s = sfn()
      qs(s.where('a.id = ? AND b.id = ?', [10, 50]))
        .should.equal('SELECT * FROM a WHERE a.id = ? AND b.id = ?')
      s.values.should.have.lengthOf(2);
      s.values[0].should.equal(10);
      s.values[1].should.equal(50);
    }
  },
  'client#and': {
    topic: function () {
      return function () { return client.select('*').from('a').where('1=1'); }
    },
    'adds an AND statement': function (sfn) {
      qs(sfn().and('2=2')).should.equal('SELECT * FROM a WHERE 1=1 AND 2=2');
    }
  },
  'client#limit': {
    topic: function () {
      return function () { return client.select('*').from('a').where('1=1'); }
    },
    'can take just a row count': function (sfn) {
      qs(sfn().limit(1)).should.equal('SELECT * FROM a WHERE 1=1 LIMIT 1');
    },
    'can take an offset and row count': function (sfn) {
      qs(sfn().limit(10, 5)).should.equal('SELECT * FROM a WHERE 1=1 LIMIT 10,5');
    },
    'can take an object': function (sfn) {
      qs(sfn().limit({count: 10, offset: 5}))
        .should.equal('SELECT * FROM a WHERE 1=1 LIMIT 5,10');
      qs(sfn().limit({offset: 5})).should.equal('SELECT * FROM a WHERE 1=1 LIMIT 5,0');
      qs(sfn().limit({count: 10})).should.equal('SELECT * FROM a WHERE 1=1 LIMIT 10');
    }
  },
  'client#go': {
    topic: function () {
      client
        .select({'1': 'awesome', '2': 'great'})
        .go(this.callback)
    },
    'executes the chain': function (err, res) {
      res.should.have.lengthOf(1);
      res[0].should.have.property('awesome');
      res[0].should.have.property('great');
    }
  },
}).addBatch({
  'Base': {
    'exists': function () { should.exist(Base) },
    '.extend': {
      'exists and is function': function () {
        should.exist(Base.extend);
        assert.isFunction(Base.extend);
      },
      'creates a new function': function () {
        var M = Base.extend({});
        assert.isFunction(M);
        assert.isFunction((new M).save)
      },
      'stores stuff': function () {
        var m = new (Base.extend({hey: 'sup'}));
        m.hey.should.equal('sup');
      },
    },
    'default': {
      'driver is mysql': function () {
        var m = new (Base.extend({}));
        m.driver.should.equal('mysql');
      
        m = new (Base.extend({driver: 'postgres'}))
        m.driver.should.equal('postgres');
      },
      'engine is InnoDB': function () {
        var m = new (Base.extend({}));
        m.engine.should.equal('InnoDB');
      }
    },
    '.parseSchema should': {
      'error on missing schema': function () {
        var m = new (Base.extend({}));
        assert.throws(function () {
          m._parseSchema();
        }, Error);
      },
      'error on invalid schema type': function () {
        var m = new (Base.extend({schema: 'hey yo'}));
        assert.throws(function () {
          m._parseSchema();
        }, TypeError);
      },
      'handle strings as raw sql': function () {
        var M = Base.extend({
          schema: { id: 'BIGINT AUTO_INCREMENT PRIMARY KEY' }
        });
        M.parseSchema();
        spec(M).id.sql.should.equal('BIGINT AUTO_INCREMENT PRIMARY KEY');
      },
      'treat functions as generating objects': function () {
        var M = Base.extend({
          schema: {
            id: function () { return {sql: 'ya', validators: [], sup: true }; }
          }
        });
        M.parseSchema();
        spec(M).id.sup.should.equal(true);
        spec(M).id.sql.should.equal('ya');
      },
      'handle higher order functions': function () {
        var hdlr = function () { return function () { return {sql: 'ya' } } };
        hdlr.higherOrder = true;
        var M = Base.extend({
          schema: { id: hdlr }
        });
        M.parseSchema();
        spec(M).id.sql.should.equal('ya');
      }
    },
    '.addValidators should' : {
      'exit gracefully when there are no validators' : function () {
        var M = Base.extend({}, {
          fieldspec: { id: { validators: ['sup']} }
        });
        M.addValidators();
        spec(M).id.validators.should.include('sup');
      },
      'handle array of validators' : function () {
        var M = Base.extend({
          validators: { id: ['zero', 'one'] }
        });
        M.addValidators();
        spec(M).id.validators[0].should.equal('zero');
        spec(M).id.validators[1].should.equal('one');
      },
      'handle a single validators' : function () {
        var M = Base.extend({ validators: { id: 'zero' } });
        M.addValidators();
        spec(M).id.validators[0].should.equal('zero');
      },
      'add new validators at the end' : function () {
        var M = Base.extend({
          validators: { id: ['new', 'another'] }
        }, {
          fieldspec: {id: { validators: ['sup']}}
        });
        M.addValidators();
        spec(M).id.validators.should.have.lengthOf(3);
        spec(M).id.validators[0].should.equal('sup');
        spec(M).id.validators[1].should.equal('new');
        spec(M).id.validators[2].should.equal('another');
      }
    }
  }
  
}).export(module);
