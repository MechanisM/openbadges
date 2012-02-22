var User = require('./user.js')
var Badge = Base.extend({
  table: 'badge',
  
  // default
  driver: 'mysql',
  
  //default
  engine: 'InnoDB',
  
  //-----------------------------------------------------------------------
  //        (sec 1.a)  strings are passed through as raw sql
  //-----------------------------------------------------------------------
  
  schema: {
    id: "BIGINT AUTO_INCREMENT PRIMARY KEY",
    user_id: "BIGINT",
    type: "ENUM('hosted', 'signed') NOT NULL",
    endpoint: "TINYTEXT",
    public_key: "TEXT",
    jwt: "TEXT",
    image_path: "VARCHAR(255) NOT NULL",
    rejected: "BOOLEAN DEFAULT 0",
    body: "MEDIUMBLOB NOT NULL",
    body_hash: "VARCHAR(255) UNIQUE NOT NULL",
    validated_on: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
  },
  
  //-----------------------------------------------------------------------
  //           (sec 1.b)  or the helper methods can be used 
  //-----------------------------------------------------------------------
  
  schema: {
    id:           Base.Field.Id,
    user_id:      Base.Field.Foreign({
      model: User,
      field : 'id',
      virtual: 'user' // creates a virtual field
    }),
    type:         Base.Field.Enum(['hosted', 'signed'], { null: false }),
    endpoint:     Base.Field.Text('tiny'),
    public_key:   Base.Field.Text,
    jwt:          Base.Field.Text,
    image_path:   Base.Field.Text(255, { null: false }),
    from_demo:    Base.Field.Boolean({ default: 0 }),
    body:         Base.Field.Document({
      serialize:   JSON.stringify, //default
      deserialize: JSON.parse, // default
      required: true // same thing as null: false
    }),
    body_hash:    Base.Field.Text(255, { unique: true, null: false }),
    validated_on: Base.Field.Timestamp({ default: "CURRENT_TIMESTAMP" })
  },

  validators: {
    endpoint: Base.Validate.Required.when({field: "type", is: "hosted"}),
    jwt: Base.Validate.Required.when({field: "type", is: "signed"}),
    public_key: Base.Validate.Required.when({field: "type", is: "signed"}),
    body: [
      Base.Validate.Type.Object,
      Badge.Validate.Body
    ]
  },
  
  //==============================================================================
  //  (sec 2) the above (sec 1.b) should generate the the following after
  //  everything is processed. nobody SHOULD be forced to write this, but
  //  they should be able to.
  //==============================================================================

  _fields: {
    id: {
      sql: "BIGINT AUTO_INCREMENT PRIMARY KEY",
      validators: [Base.Validate.Type.Number]
    },
    user_id: {
      dependsOn: User,  // triggers schema creation on User.
      sql: "BIGINT",
      keySql: "FOREIGN KEY user_fkey (user_id) REFERENCES `user`(id)",
      validators: [Base.Validate.Type.Number]
    },
    type: {
      sql: "ENUM('hosted', 'signed') NOT NULL",
      validators: [
        Base.Validate.Required,
        Base.Validate.Type.Enum(['hosted', 'signed'])
      ]
    },
    endpoint: {
      sql: "TINYTEXT",
      validators: [
        Base.Validate.Required.when({field: "type", is: "hosted"}),
        Base.Validate.Type.Text
      ]
    },
    public_key: {
      sql: "TEXT",
      validators: [Base.Validate.Required.when({field: "type", is: "signed"})]
    },
    jwt: {
      sql: "TEXT",
      validators: [Base.Validate.Required.when({field: "type", is: "signed"})]
    },
    image_path: {
      sql: "VARCHAR(255) NOT NULL",
      validators: [
        Base.Validate.Required,
        Base.Validate.Type.Text,
        Base.Validate.Length({max: 255})
      ]
    },
    from_demo: {
      sql: "BOOLEAN DEFAULT 0",
      validators: []
    },
    body: {
      sql: "MEDIUMBLOB NOT NULL",
      validators: [
        Base.Validate.Required,
        Base.Validate.Serializable(JSON.stringify, JSON.parse),
        Base.Validate.Type.Object,
        Badge.Validate.Body
      ],
      mutators: {
        storage: JSON.stringify,
        retrieval: JSON.parse
      }
    },
    body_hash: {
      sql: "VARCHAR(255) UNIQUE NOT NULL",
      validators: [
        Base.Validate.Required,
        Base.Validate.Type.Text,
        Base.Validate.Length({max: 255})
      ]
    },
    validated_on: {
      sql: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
      validators: [
        Base.Validate.Type.Timestamp
      ]
    }
  }
});