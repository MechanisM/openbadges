var vows = require('vows')
  , assert = require('assert')
  , should = require('should')
  , mysql = require('../lib/mysql')
  , client = mysql.client
  , Base = mysql.Base
  , _ = require('underscore')

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
    'models have access to client' : function () {
      var M = Base.extend({});
      assert.isFunction(M.client.query);
    },
    'instances have access to client' : function () {
      var M = Base.extend({})
        , m = new M;
      assert.isFunction(m.client.query);
    },
    '.parseSchema should': {
      'error on missing schema': function () {
        var M = Base.extend({});
        assert.throws(function () {
          M.parseSchema();
        }, /schema/);
      },
      'error on invalid schema type': function () {
        var M = Base.extend({schema: 'hey yo'});
        assert.throws(function () {
          M.parseSchema();
        }, /schema/);
      },
      'handle strings as raw sql': function () {
        var M = Base.extend({
          schema: { id: 'BIGINT AUTO_INCREMENT PRIMARY KEY' }
        });
        M.parseSchema();
        spec(M).id.sql.should.equal('BIGINT AUTO_INCREMENT PRIMARY KEY');
      },
      'pass through objects': function () {
        var M = Base.extend({
          schema: { id: { sql: 'BIGINT AUTO_INCREMENT PRIMARY KEY' } }
        });
        M.parseSchema();
        spec(M).id.sql.should.equal('BIGINT AUTO_INCREMENT PRIMARY KEY');
      },
      'treat functions as generating objects': function () {
        var M = Base.extend({
          schema: { id: function (k) { return {
            keysql: 'unique key (id)',
            validators: [],
            sup: true
          } } }
        });
        M.parseSchema();
        spec(M).id.sup.should.equal(true);
        spec(M).id.keysql.should.equal('unique key (id)');
      },
      'handle higher order functions': function () {
        var hdlr = function () { return function () { return { sql: 'ya' } } };
        hdlr.higherOrder = true;
        var M = Base.extend({
          schema: { id: hdlr }
        });
        M.parseSchema();
        spec(M).id.sql.should.equal('ya');
      },
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
          fieldspec: { id: { validators: ['sup']} }
        });
        M.addValidators();
        spec(M).id.validators.should.have.lengthOf(3);
        spec(M).id.validators[0].should.equal('sup');
        spec(M).id.validators[1].should.equal('new');
        spec(M).id.validators[2].should.equal('another');
      }
    },
    'validator helpers': {
      topic: Base.Validators,
      'Base.Validators.Require': function (v) {
        v.Require(null).name.should.equal('required');
        should.not.exist(v.Require('rad'));
        assert.isFunction(v.Require()()())
      },
      'Base.Validators.Require.when': function (v) {
        var test = v.Require.when({field:'type', is:'signed'})
          , o = {type: 'signed'}
        test(null, o).name.should.equal('required-when');
        should.not.exist(test(true, o));
      },
      'Base.Validators.Length (positional)' : {
        topic: function (v) { return v.Length(4) },
        'invalid things should return an object' : function (test) {
          function $ (e) { e.name.should.equal('length') }
          $(test('12345'));
        },
        'valid things should return nothing' : function (test) {
          function $ (e) { should.not.exist(e) }
          $(test('123'));
          $(test(undefined));
        }
      },
      'Base.Validators.Length (named)' : {
        topic: function (v) { return v.Length({min: 2, max: 4}) },
        'invalid things should return an object' : function (test) {
          function $ (e) { e.name.should.equal('length') }
          $(test('12345'));
          $(test('1'));
        },
        'valid things should return nothing' : function (test) {
          function $ (e) { should.not.exist(e) }
          $(test('1234'));
          $(test('12'));
          $(test(undefined));
        }
      },
      'Base.Validators.Serializable' : {
        topic: function (v) { return v.Serializable(JSON.stringify) },
        'invalid things should return an object' : function (test) {
          function $ (e) { e.name.should.equal('serializable') }
          $(test(function(){}));
        },
        'valid things should return nothing' : function (test) {
          function $ (e) { should.not.exist(e) }
          $(test({ a: 1, b: function(){} }))
          $(test(undefined));
        }
      },
      'Base.Validators.Type.Enum' : {
        topic: function (v) { return v.Type.Enum(['lame', 'sauce']) },
        'invalid things should return an object' : function (test) {
          function $ (e) { e.name.should.equal('type.enum') }
          $(test('jackrabbit'));
          $(test('blargh'));
        },
        'valid things should return nothing' : function (test) {
          function $ (e) { should.not.exist(e) }
          $(test('sauce'));
          $(test(undefined));
        }
      },
      'Base.Validators.Type.Number' : {
        topic: function (v) { return v.Type.Number },
        'invalid things should return an object' : function (test) {
          function $ (e) { e.name.should.equal('type.number') }
          $(test(function(){})),
          $(test([1,2,3])),
          $(test('nopenopenope')),
          $(test(NaN))
        },
        'valid things should return nothing' : function (test) {
          function $ (e) { should.not.exist(e) }
          $(test(10))
          $(test('10'))
          $(test('10e1'))
          $(test(10e1))
          $(test(10.10921))
          $(test(undefined))
        },
        'should return itself until given a value': function (test) {
          test.should.equal(test()()());
        }
      },
      'Base.Validators.Type.String' :{
        topic: function (v) { return v.Type.String },
        'invalid things should return object' : function (test) {
          function $ (thing) { thing.name.should.equal('type.string') }
          $(test({}));
          $(test(['l','o','l']));
        },
        'valid things should return nothing' : function (test) {
          function $ (e) { should.not.exist(e) }
          $(test('lol'));
          $(test(String({})));
        },
        'should return itself until given a value' : function (test) {
          test.should.equal(test()()());
        }
      },
      'Base.Validators.Type.Object' : {
        topic: function (v) { return v.Type.Object },
        'invalid things should return object' : function (test) {
          function $ (thing) { thing.name.should.equal('type.object') }
          $(test(['l','o','l']));
          $(test('just some string'));
          $(test(function(){}));
        },
        'valid things should return nothing' : function (test) {
          function $ (e) { should.not.exist(e) }
          $(test({}));
          $(test(undefined));
        },
        'should return itself until given a value' : function (test) {
          test.should.equal(test()()());
        }
      },
      'Base.Validators.Regexp' : {
        topic: function (v) { return v.Regexp(/blargh/) },
        'invalid things should return object' : function (test) {
          function $ (thing) { thing.name.should.equal('regexp') }
          $(test('roas'))
          $(test('roaioajsds'))
        },
        'valid things should return nothing' : function (test) {
          function $ (e) { should.not.exist(e) }
          $(test(undefined));
          $(test('blargh'));
          $(test('superblargh'));
        },
        'invalid regexp should throw' : function () {
          assert.throws(function () {
            Base.Validators.Regexp({})
          }, /invalid/);
        },
      },
      'Base.Validators.Email' : {
        topic: function (v) { return v.Email },
        'invalid things should return object' : function (test) {
          function $ (thing) { thing.name.should.equal('email') }
          $(test('roas'))
          $(test('roaioajsds'))
        },
        'valid things should return nothing' : function (test) {
          function $ (e) { should.not.exist(e) }
          $(test('blargh@rad.com'));
          $(test('superblargh@awesome.org'));
        },
        'should return itself until given a value' : function (test) {
          test.should.equal(test()()());
        }
      },
      'Base.Validators.Require.all': {
        'precedes all validators with Require': function (v) {
          var validators = {
            one: [],
            two: v.Email,
            three: v.Doc({
              four: v.Email
            })
          }
          v.Require.all(validators);
          assert.include(validators.one, v.Require);
          assert.include(validators.two, v.Require);
          validators.two[0].should.equal(v.Require);
          validators.three.meta.name.should.equal('doc');
        },
      },
      'Base.Validators.Doc' : {
        'if an entry is required, parent is required' : function (v) {
          var test = v.Doc({
            thing: v.Require
          })
          test({}).name.should.equal('doc');
          test({}).errors[0].name.should.equal('required');
          should.not.exist(test({thing: false}));
        },
        'can handle array of validators' : function (v) {
          var test = v.Doc({
            thing: [v.Require, v.Email]
          })
          test({}).name.should.equal('doc');
          test({}).errors[0].name.should.equal('required');
          should.not.exist(test({thing: 'wut@lol.com'}));
        },
        'can be nested' : function (v) {
          var test = v.Doc({
            thing: v.Doc({
              otherThing: v.Doc({
                oneMoreThing: [v.Require, v.Email]
              })
            })
          })
          var empty = test({});
          empty.name.should.equal('doc');
          empty.errors[0].name.should.equal('doc');
          empty.errors[0].errors[0].name.should.equal('doc');
          empty.errors[0].errors[0].errors[0].name.should.equal('required');
          
          var t = test({thing: {otherThing: {oneMoreThing: 'yep@rad.org'}}});
          should.not.exist(t);
        },
        'errors on subs get the right field name' : function (v) {
          var test = v.Doc({
            thing: v.Doc({
              otherThing: v.Doc({
                oneMoreThing: v.Require()
              })
            })
          })
          test({}).name.should.equal('doc');
          test({}).errors[0].name.should.equal('doc');
          test({}).errors[0].errors[0].name.should.equal('doc');
          test({}).errors[0].errors[0].field.should.equal('otherThing');
          test({}).errors[0].errors[0].errors[0].field.should.equal('oneMoreThing');
        },
        'can get real complicated' : {
          topic: function (v) {
            var test = v.Doc({
              recipient: [v.Require, v.Email],
              evidence: v.Regexp(/w/),
              expires: v.Regexp(/w/),
              issued_on: v.Regexp(/w/),
              badge: v.Doc(v.Require.all({
                version: v.Regexp(/w/),
                name: v.Length(128),
                description: v.Length(128),
                image: v.Regexp(/w/),
                criteria: v.Regexp(/w/),
                issuer: v.Doc({
                  origin: [v.Require, v.Regexp(/w/)],
                  name: [v.Require, v.Length(128)],
                  org: v.Length(128),
                  contact: v.Email
                })
              }))
            });
            return test;
          },
          'can fail and have all proper failures' : function (test) {
            function findby(f) { return function(o){ return o.field === f } }
            function testFor(a, f) { return _.any(a, function (v) { return v.field === f }); }
            var empty = test({})
              , level1 = empty.errors
              , level2 = _.find(level1, findby('badge')).errors
              , level3 = _.find(level2, findby('issuer')).errors
            assert.ok(testFor(level1, 'recipient'));
            assert.ok(testFor(level1, 'badge'));
            assert.ok(testFor(level2, 'version'));
            assert.ok(testFor(level2, 'name'));
            assert.ok(testFor(level2, 'description'));
            assert.ok(testFor(level2, 'image'));
            assert.ok(testFor(level2, 'criteria'));
            assert.ok(testFor(level2, 'issuer'));
            assert.ok(testFor(level3, 'origin'));
            assert.ok(testFor(level3, 'name'));
          },
          'can pass' : function (test) {
            var err = test({
              recipient: 'y@y.com',
              evidence: 'w',
              badge: {
                version: 'w',
                name: 'w',
                description: 'w',
                image: 'w',
                criteria: 'w',
                issuer: {
                  origin: 'w',
                  name: 'w'
                }
              }
            })
            should.not.exist(err);
          }
        }
      }
    },
    'schema helpers': {
      topic: Base.Schema,
      'Base.Schema.Id' : function (f) {
        var spec = f.Id()('id');
        assert.include(spec, 'sql');
        spec.sql.should.equal('BIGINT AUTO_INCREMENT PRIMARY KEY');
        assert.include(spec, 'validators');
        assert.include(spec.validators, Base.Validators.Type.Number);
      },
      'Base.Schema.Number' : {
        'standard fare': function (s) {
          var spec = s.Number()();
          spec.sql.should.equal('INT');
          assert.include(spec, 'validators');
          assert.include(spec.validators, Base.Validators.Type.Number);
        },
        'big ones': function (s) {
          var spec = s.Number('big')();
          spec.sql.should.equal('BIGINT');
        },
        'small ones': function (s) {
          var spec = s.Number('small')();
          spec.sql.should.equal('SMALLINT');
        },
        'floats': function (s) {
          var spec = s.Number('float')();
          spec.sql.should.equal('FLOAT');
        },
        'doubles': function (s) {
          var spec = s.Number('dOuBlE')();
          spec.sql.should.equal('DOUBLE');
          
          spec = s.Number({type: 'dOuBlE'})();
          spec.sql.should.equal('DOUBLE');
        },
        'signed/unsigned': function (s) {
          var spec = s.Number('small', { unsigned: true })();
          spec.sql.should.equal('SMALLINT UNSIGNED');
          
          spec = s.Number('small', { signed: false })();
          spec.sql.should.equal('SMALLINT UNSIGNED');
          
          spec = s.Number('small', { signed: true })();
          spec.sql.should.equal('SMALLINT SIGNED');
        },
        'unique': function (s) {
          var spec = s.Number('small', { signed: false, unique: true })();
          spec.sql.should.equal('SMALLINT UNSIGNED UNIQUE');
        },
        'null/not null': function (s) {
          var spec = s.Number('small', { null: false })();
          spec.sql.should.equal('SMALLINT NOT NULL');
          // #TODO: file bug with should.js about should.include not supporting objects
          spec.validators.should.include(Base.Validators.Require);
          
          spec = s.Number('small', { required: true })();
          spec.sql.should.equal('SMALLINT NOT NULL');
          spec.validators.should.include(Base.Validators.Require);
        },
        'default': function (s) {
          var spec = s.Number({ default: 10 })();
          spec.sql.should.equal('INT DEFAULT 10');
        },
      },
      'Base.Schema.String' : {
        'standard fare': function (s) {
          var spec = s.String()();
          spec.sql.should.equal('TEXT');
          assert.include(spec, 'validators');
          assert.include(spec.validators, Base.Validators.Type.String);
        },
        'varchar, positional': function (s) {
          var spec = s.String(28)();
          spec.sql.should.equal('VARCHAR(28)');
          assert.include(spec, 'validators');
          assert.include(spec.validators, Base.Validators.Type.String);
          spec.validators.should.have.lengthOf(2);
          spec.validators[1].meta.name.should.equal('length');
          spec.validators[1].meta.max.should.equal(28);
        },
        'varchar, named': function (s) {
          var spec = s.String({size: 28})();
          spec.sql.should.equal('VARCHAR(28)');
        },
        'char': function (s) {
          var spec = s.String({size: 28, type: 'char'})();
          spec.sql.should.equal('CHAR(28)');
        },
        'blob': function (s) {
          var spec = s.String({type: 'blob'})();
          spec.sql.should.equal('BLOB');
        },
        'char without size throws error': function (s) {
          assert.throws(function () {
            s.String({type: 'char'})();
          }, /type mismatch.*/);
        },
        'longtext': function (s) {
          var spec = s.String({size: 'long', type: 'text'})();
          spec.sql.should.equal('LONGTEXT');
          
          spec = s.String({size: 'long'})();
          spec.sql.should.equal('LONGTEXT');
          
          spec = s.String('long')();
          spec.sql.should.equal('LONGTEXT');
        },
        'tinytext': function (s) {
          var spec = s.String({size: 'tiny', type: 'text'})();
          spec.sql.should.equal('TINYTEXT');
          spec = s.String({size: 'tiny'})();
          spec.sql.should.equal('TINYTEXT');
          spec = s.String('tiny')();
          spec.sql.should.equal('TINYTEXT');
        },
        'unique with length': function (s) {
          var spec = s.String(21, {unique: true})('t');
          spec.sql.should.equal('VARCHAR(21) UNIQUE');
          
          assert.throws(function () {
            s.String({unique: true})('t');
          }, /key/)
          
          spec = s.String({ unique: 128 })('t');
          assert.include(spec, 'keysql');
          spec.keysql.should.equal('UNIQUE KEY (t(128))');
        },
        'null/not null': function (s) {
          var spec = s.String('small', { null: false })();
          spec.sql.should.equal('SMALLTEXT NOT NULL');
          
          spec = s.String({ required: true })();
          spec.sql.should.equal('TEXT NOT NULL');
          spec.validators.should.include(Base.Validators.Require);
        }
      },
      'Base.Schema.Enum' : {
        'standard fare': function (s) {
          var spec = s.Enum(['green', 'eggs', 'ham'])();
          spec.sql.should.equal('ENUM ("green", "eggs", "ham")');
          assert.include(spec, 'validators');
          spec.validators[0].meta.name.should.equal('type.enum');
          
          spec = s.Enum({ values: ['bold'] })();
          spec.sql.should.equal('ENUM ("bold")');
        },
        'null/not null': function (s) {
          var spec = s.Enum(['yo', 'la', 'tengo'], { required: true })();
          assert.include(spec, 'validators');
          spec.validators[0].should.equal(Base.Validators.Require);
        },
        'default': function (s) {
          var spec = s.Enum(['yo', 'la', 'tengo'], { default: 'tengo' })();
          spec.sql.should.equal('ENUM ("yo", "la", "tengo") DEFAULT "tengo"');
        }
      },
      'Base.Schema.Foreign' : {
        'basic test' : function (s) {
          var User = Base.extend({
            table: 'user',
            schema: { id : 'BIGINT AUTO_INCREMENT PRIMARY KEY' }
          })
          User.parseSchema();
          
          var ss = s.Foreign({
            model: User,
            field: 'id'
          })('user_id');
          
          var correct = {
            dependsOn: User,
            sql: "BIGINT",
            keysql: "FOREIGN KEY `user_fkey` (`user_id`) REFERENCES `user` (`id`)"
          };
          ss.dependsOn.should.equal(correct.dependsOn);
          ss.sql.should.equal(correct.sql);
          ss.keysql.should.equal(correct.keysql);
        },
      },
      'Base.Schema.Document': {
        'basic test' : function (s) {
          function intta (v) { return v; }
          function outta (v) { return v; }
          var ss = s.Document({
            serializer:   intta,
            deserializer: outta
          })();
          var correct = {
            sql: "BLOB",
            validators: [Base.Validators.Serializable(intta)],
            mutators: { storage: intta, retrieval: outta }
          };
          ss.sql.should.equal(correct.sql);
          should.exist(ss.mutators);
          ss.mutators.storage.should.equal(correct.mutators.storage);
          ss.mutators.retrieval.should.equal(correct.mutators.retrieval);
          ss.validators[0].meta.name.should.equal('serializable');
          ss.validators[0].meta.serializer.should.equal(correct.mutators.storage);
        },
        'should default to JSON' : function (s) {
          var ss = s.Document()();
          ss.mutators.storage.should.equal(JSON.stringify);
          ss.mutators.retrieval.should.equal(JSON.parse);
          ss.validators[0].meta.name.should.equal('serializable');
          ss.validators[0].meta.serializer.should.equal(JSON.stringify);
        },
        'null/not null' : function (s) {
          var ss = s.Document({required: true})();
          ss.sql.should.match(/not null/i);
          ss.validators[0].should.equal(Base.Validators.Require);
        },
      },
      'Base.Schema.Boolean': {
        'basic' : function (s) {
          var ss = s.Boolean()();
          ss.sql.should.match(/^boolean$/i)
        },
        'should respect defaults' : function (s) {
          var ss = s.Boolean({ default: 1 })();
          ss.sql.should.match(/default 1/i)
        }
      },
      'Base.Schema.Timestamp': {
        'basic' : function (s) {
          var ss = s.Time()();
          ss.sql.should.match(/^timestamp$/i)
        },
        'should respect defaults' : function (s) {
          var ss = s.Time({ default: 'CURRENT_TIMESTAMP' })();
          ss.sql.should.match(/current_timestamp/i)
        },
        'should respect type' : function (s) {
          var ss = s.Time({ type: 'datetime' })();
          ss.sql.should.match(/^datetime$/i)
        }
      }
    },
    '.createTableSql()': {
      'fails when there is no table': function () {
        var M = Base.extend({ engine: 'rad'}, { fieldspec: { id: { sql: '1' } } });
        assert.throws(function () {
          M.createTableSql();
        }, /table/);
      },
      'combines things in the correct order': function () {
        var M = Base.extend({
          table: 'stuff',
          engine: 'rad'
        }, {
          fieldspec: {
            id: { sql: '1' },
            email: { sql: '2' },
            passwd: { sql: '3' },
            rel: { sql: '4', keysql: 'related' },
            rel2: { sql: '5', keysql: 'other related' }
          }
        });
        var sql = M.createTableSql();
        sql.should.equal('CREATE TABLE IF NOT EXISTS `stuff` (`id` 1, `email` 2, `passwd` 3, `rel` 4, `rel2` 5, related, other related) ENGINE = rad');
      }
    },
    '.makeTable': {
      'simple schema' : {
        topic: function () {
          var M = Base.extend({
            table: 'tesstsajo',
            schema: { id: Base.Schema.Id, name: Base.Schema.String('long') }
          });
          return M;
        },
        'can be saved ': {
          topic: function (M) {
            M.prototype.table = 'wuskj';
            M.makeTable(this.callback);
          },
          'without erroring': function (err, result) {
            assert.ifError(err);
          }
        }
      },
      'complicated schema' : {
        topic: function () {
          var User = Base.extend({
            schema: {
              id: Base.Schema.Id,
              email: Base.Schema.String({ length: 255, unique: true, required: true }),
              last_login: Base.Schema.Number({ null: true }),
              active: Base.Schema.Boolean({ default: 1 }),
              passwd: Base.Schema.String({ length: 255 }),
              salt: Base.Schema.String({ type: 'blob', length: 'tiny' })
            }
          });
          return User;
        },
        'can be saved ': {
          topic: function (M) {
            M.prototype.table = 'wuskjjklasd';
            M.makeTable(this.callback);
          },
          'without erroring': function (err, result) {
            assert.ifError(err);
          }
        }
      },
      'foreign constrained schema' : {
        topic: function () {
          var User = Base.extend({
            table: 'jlakj9',
            schema: {
              id: Base.Schema.Id,
              email: Base.Schema.String({ length: 255, unique: true, required: true })
            }
          });
          var Badge = Base.extend({
            schema: {
              id: Base.Schema.Id,
              user_id: Base.Schema.Foreign({
                model: User,
                field : 'id'
              }),
              type: Base.Schema.Enum(['hosted', 'signed'], { null: false })
            }
          })
          return Badge;
        },
        'can be saved ': {
          topic: function (M) {
            M.prototype.table = 'ohsup';
            M.parseSchema();
            M.makeTable(this.callback);
          },
          'without erroring': function (err, result) {
            assert.ifError(err);
          }
        }
      }
    }
  }
}).addBatch({
  'Base model instances, saving': {
    'a basic model' : {
      topic: function () {
        var M = Base.extend({
          table: 'ljsaf',
          schema: { id: Base.Schema.Id, name: Base.Schema.String }
        });
        M.makeTable();
        return M;
      },
      'attributes exist' : function (M) {
        var x = new M({what: 'lol'})
        should.exist(x.attributes);
      },
      'can get attributes' : function (M) {
        var x = new M({what: 'lol'})
        x.get('what').should.equal('lol');
      },
      'can set attributes' : function (M) {
        var x = new M({what: 'lol'})
        x.set('what', 'rad')
        x.get('what').should.equal('rad');
      },
      'can save': {
        topic: function (M) {
          var x = new M({name: 'yaaaaaaaaaa'});
          var self = this;
          x.save(function (err, inst) {
            inst.save(function (err, inst) {
              inst.save(self.callback);
            });
          });
        },
        'and id gets assigned': function (err, result) {
          assert.isNumber(result.get('id'));
        }
      }
    }
  }
}).addBatch({
  'Base model, finding': {
    topic: function () {
      var self = this;
      var M = Base.extend({
        table: 'findtest',
        schema: {
          id: Base.Schema.Id,
          email: Base.Schema.String,
          eggs: Base.Schema.String
        }
      })
      M.makeTable();
      var x = new M({email: 'hey'});
      var y = new M({email: 'yo', other: 'garbage', ruining: 'everything'});
      var z = new M({email: 'sup', eggs: 'lots'});
      
      var callback = _.after(3, function () {
        self.callback(null, M);
      });
      
      x.save(callback);
      y.save(callback);
      z.save(callback);
    },
    '.find, simple' : {
      topic: function (M) {
        M.find({email: 'yo'}, this.callback);
      },
      'totally works': function (err, results) {
        assert.ifError(err);
        results.should.have.lengthOf(1);
        results[0].get('email').should.equal('yo');
      }
    },
    '.find, advanced' : {
      topic: function (M) {
        M.find({email: 'sup', eggs: 'lots'}, this.callback);
      },
      'totally works': function (err, results) {
        assert.ifError(err);
        results.should.have.lengthOf(1);
        results[0].get('email').should.equal('sup');
      }
    },
    '.findOne' : {
      topic: function (M) {
        M.findOne({email: 'yo'}, this.callback);
      },
      'totally works': function (err, res) {
        assert.ifError(err);
        res.get('email').should.equal('yo');
      }
    },
    '.findById' : {
      topic: function (M) {
        M.findById(1, this.callback);
      },
      'totally works': function (err, res) {
        assert.ifError(err);
        res.get('email').should.equal('hey');
      }
    },
    '.findAll' : {
      topic: function (M) {
        M.findAll(this.callback);
      },
      'totally works': function (err, results) {
        assert.ifError(err);
        results.should.have.lengthOf(3);
        results[0].get('email').should.equal('hey');
      }
    },
  }
}).addBatch({
  'Instance validation': {
    topic: function () {
      var M = Base.extend({
        schema: { email: Base.Schema.String({required: true }) },
        validators: {
          email: [
            function beginWithH(v) { if (!v.match(/^h/)) return { message: 'must begin with h', name: 'begins-with-h' } },
            function contains(v) { if (!v.match(/sy0/)) return { message: 'must contain sy0', name: 'contains' } },
            function contains(v) { if (!v.match(/cl1/)) return { message: 'must contain cl1', name: 'contains' } },
            function contains(v) { if (!v.match(/@/)) return { message: 'must contain @', name: 'contains' } },
            function endWithIo(v) { if (!v.match(/io$/)) return { message: 'must end with io', name: 'end-with-io' } }
          ]
        }
      })
      return M;
    },
    'model#validate' : {
      'fail early' : function (M) {
        var m = new M({});
        var errors = m.validate();
        should.exist(errors);
        assert.include(errors, 'email');
      },
      'run all the tests': function (M) {
        var m = new M({email: 'hsy0cl1@what.xxx'});
        var errors = m.validate();
        should.exist(errors);
        assert.ok(errors);
        assert.include(errors, 'email');
        errors.email.name.should.equal('end-with-io');
      },
      'possible to pass' : function (M) {
        var m = new M({email: 'hsy0cl1@what.io'});
        var errors = m.validate();
        should.not.exist(errors);
      }
    },
    'validate on save' : {
      topic: function (M) {
        var m = new M({email: 'hsy0cl1@what.xxx'});
        m.save(this.callback);
      },
      'does a fine ass job': function (err, result) {
        should.exist(err);
        assert.include(err, 'validation');
        err.validation.email.name.should.equal('end-with-io');
      }
    }
  }
}).addBatch({
  'Instance mutators': {
    topic: function () {
      var M = Base.extend({ schema: { id: Base.Schema.Id, doc: Base.Schema.Document() } })
      return M;
    },
    'model#mutate' : {
      'should mutate' : function (M) {
        var m = new M({ doc: { one: 1, two: 2 } });
        var mattr = m.mutate();
        should.exist(mattr);
        mattr.doc.should.equal(JSON.stringify({ one: 1, two: 2 }));
        m.get('doc').one.should.equal(1);
      }
    },
    'model#demutate' : {
      'should demutate': function (M) {
        var m = new M({ doc: { one: 1, two: 2 } });
        var attr = m.demutate(m.mutate());
        should.exist(attr);
        attr.doc.one.should.equal(1);
        attr.doc.two.should.equal(2);
      }
    }
  }
}).addBatch({
  'Pro saving': {
    topic: function () {
      var M = Base.extend({
        table: 'prosavetest',
        schema: { id: Base.Schema.Id, doc: Base.Schema.Document() }
      })
      M.makeTable();
      return M;
    },
    'a document-laden instance': {
      topic: function (M) {
        var bands = new M({ doc: {pollard: 'GBV', shields: 'MBV'}})
        bands.save(this.callback);
      },
      'can be saved just fine': function (err, bands) {
        bands.get('id').should.equal(1);
      },
      'can be retrieved': {
        topic: function (m) {
          var M = m.constructor;
          M.findById(1, this.callback);
        },
        'with correct data' : function (err, bands) {
          bands.get('doc').pollard.should.equal('GBV');
          bands.get('doc').shields.should.equal('MBV');
        }
      }
    }
  }
}).addBatch({
  'Getters and setters': {
    topic: function () {
      var M = Base.extend({
        getters: {
          money: function (v) { return 'banking' },
          half: function (v) { return v/2 }
        },
        setters: {
          nums: function (v) { this.attributes.nums = '12345'; }
        }
      })
      return M;
    },
    'getters get get get': function (M) {
      var m = new M({ money: 'yah', half: 20 });
      m.get('money').should.equal('banking');
      m.get('half').should.equal(10);
    },
    'setters set set set': function (M) {
      var m = new M({});
      m.set('nums');
      m.get('nums').should.equal('12345');
    },
  }
}).export(module);
