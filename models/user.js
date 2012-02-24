var crypto = require('crypto')
  , bcrypt = require('bcrypt')
  , regex = require('../lib/regex')
  , mysql = require('../lib/mysql')
  , Base = mysql.Base
  , Schema = Base.Schema

var User = Base.extend({
  table: 'user',
  schema: {
    id: Schema.Id,
    email: Schema.String({type: 'varchar', length: 255, unique: true, required: true}),
    last_login: Schema.Number,
    active: Schema.Boolean,
    passwd: Schema.String({type: 'varchar', length: 255}),
    salt: Schema.String({type: 'tinyblob'})
  },
  
  validators: {
    email: function (value, attr) {
      var msg = "invalid value for required field `email`"
      if (!regex.email.test(value)) return { name: 'email', message: msg, value: value };
    }
  },
  
  setters: {
    'login_date': function () {
      this.attributes['last_login'] =  Math.floor(Date.now()/1000);
    }
  }
});

User.findOrCreate = function (email, callback) {
  var newUser = new User({email: email});
  User.findOne({email: email}, function (err, user) {
    if (err)  return callback(err);
    if (user) return callback(null, user);
    else      return newUser.save(callback);
  })
}

module.exports = User;
