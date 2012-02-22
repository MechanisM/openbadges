var _ = require('underscore')
  , mysql = require('mysql')

var Base = {};

// Field Helpers
// =============
Base.Field = {
  Id: function () {  },
  Enum: function () {  },
  Foreign: function () {  },
  Text: function () {  },
  Document: function () {  },
  Timestamp: function () {  },
  Number: function () {  }
}

// Validatation Helpers
// ====================
Base.Validate = {}
Base.Validate.Required = function () {  }
Base.Validate.Required.when = function () {  }
Base.Validate.Required.when.is = function () {  }
Base.Validate.Type = {
  Enum: function () {  },
  Number: function () {  },
  Text: function () {  },
  Timestamp: function () {  },
  Object: function () {  }
}
Base.Validate.Serializable = function () {  }
Base.Validate.Length = function () {  }


client
  .select('*')
  .from('badge')
  .innerJoin('user')
  .on('user.id = badge.user_id')
  .where('user.id = 2')

client
  .select({
    'badge.id': 'badge$id',
    'badge.type': 'badge$type',
    'badge.endpoint': 'badge$endpoint',
    'badge.public_key': 'badge$public_key',
    'badge.jwt': 'badge$jwt',
    'badge.image_path': 'badge$image_path',
    'badge.from_demo': 'badge$from_demo',
    'badge.body': 'badge$body',
    'badge.body_hash': 'badge$body_hash',
    'badge.validated_on': 'badge$validated_on',
    'user.id': 'user$id',
    'user.email': 'user$email',
    'user.last_login': 'user$last_login',
    'user.active': 'user$active',
    'user.passwd': 'user$passwd',
    'user.salt': 'user$salt'
  })
  .from('badge, user')
  .where('user.id = badge.user_id')
  