var vows = require('vows')
  , assert = require('assert')
  , should = require('should')
  , mysql = require('../../lib/mysql')
  , client = mysql.client
  , Base = mysql.Base
  , _ = require('underscore')

vows.describe('testing migrations').addBatch({
  'Test some migrations, yo' : {
    topic: function () {
      mysql.prepareTesting();
      var User = Base.extend({table: 'user'});
      return User;
    },
    // 'getCreateTable': function () {
    //   var t = Base.Migration(User);
    // },
    'getAlterSql': {
      topic: function (User) { return Base.Migration(User) },
      'add' : function (t) {
        var sql = t.getAlterSql({ yam: Base.Schema.Text }, 'add');
        sql[0].should.equal('ALTER TABLE `user` ADD `yam` TEXT');
      },
      'change': {
        'takes a spec' :function (t) {
          var sql = t.getAlterSql({ beets: Base.Schema.Number() }, 'change');
          sql[0].should.equal('ALTER TABLE `user` CHANGE `beets` INT');
        },
        'takes a straaaaang': function (t) {
          var sql = t.getAlterSql({ clams: 'TASTY CLAMS' }, 'change');
          sql[0].should.equal('ALTER TABLE `user` CHANGE `clams` TASTY CLAMS');
        },
        'handles unique intelligently': function (t) {
          var sql = t.getAlterSql({ clams: Base.Schema.Text({unique: 128}) }, 'change');
          sql.should.have.lengthOf(2);
          sql[1].should.equal('ALTER TABLE `user` ADD UNIQUE KEY `clams` (`clams` (128))');
        }
      },
      'drop': function (t) {
        var sql = t.getAlterSql('words', 'drop');
        sql[0].should.equal('ALTER TABLE `user` DROP `words`');
      },
      'engine': function (t) {
        var sql = t.getAlterSql('MyISAM', 'engine');
        sql[0].should.equal('ALTER TABLE `user` ENGINE = MyISAM');
      },
      // 'rename': function (t) {
      //   var sql = t.getAlterSql({what: 'lol'}, 'rename');
      //   sql.should.equal('ALTER TABLE `user` CHANGE `what` `lol`');
      // },
      'add key': function (t) {
        var sql = t.getAlterSql({yeah: { type: 'unique' }}, 'add key')
        sql[0].should.equal('ALTER TABLE `user` ADD UNIQUE KEY `yeah` (`yeah`)');
        
        sql = t.getAlterSql({yeah: { type: 'unique', name: 'yo' }}, 'add key')
        sql[0].should.equal('ALTER TABLE `user` ADD UNIQUE KEY `yeah` (`yo`)');
        
        sql = t.getAlterSql({yeah: { type: 'unique', name: 'yo', length: 128 }}, 'add key')
        sql[0].should.equal('ALTER TABLE `user` ADD UNIQUE KEY `yeah` (`yo` (128))');
      }
    }
  }
}).export(module);

