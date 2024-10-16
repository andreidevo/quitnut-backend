'use strict';

var mongoose = require('mongoose'),
bcrypt = require('bcrypt'),
Schema = mongoose.Schema;

var UserSchema = new Schema({

  // BASICS
  email: { type: String, lowercase: true, trim: true},
  email_verified: { type: Boolean, default: false },
  hash_password: { type: String },
  name: { type: String },
  created: { type: Date, default: Date.now },
  authProvider: { type: String, required: true }, // types: Google, Apple, email 
  authId: { type: String, required: true}, // getting id from Apple/Google
  refreshToken: { type: String },
  username: { type: String, unique: true, required: true}, // <---- UNIQUE 
  usernameChanged: { type: Boolean, default: false },
  subscription: {
    status: { type: String, default: "null"}, // null, sub, lifetime
    history: { type: String, default: ""}, // just adding json here like: "lifetime: Date, sub: Date"
  },

  imageUrl: { type: String }, // IMAGE
  imageUploadCount: { type: Number, default: 0 },
  imageLastUploadDate: { type: Date },


  // TEAMS
  communities: [{ type: Schema.Types.ObjectId, ref: 'Team' }],
  publicTeams: { type: Number, default: 0},
  privateTeams: { type: Number, default: 0},

  // STREAK
  streak: {
    lastReset: { type: String, default: ""},
    dateStart: { type: String, default: ""},
  },

  reportCounts: [{
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    reason: { type: String, required: true }
  }],

  achievements: { type: String, default: ""},

  // CONTESTS
  challenges: [{ type: Schema.Types.ObjectId, ref: 'Challenge' }],

  posts: [{ type: Schema.Types.ObjectId, ref: 'Post' }],
  
  comments: [{ type: Schema.Types.ObjectId, ref: 'Comment' }],

  saved: [{ type: Schema.Types.ObjectId, ref: 'Post' }],

  globalrank: {
    score: { type: Number, default: 0 },
    history: [{
      from: { type: String, required: true  },
      score: { type: Number, required: true },
      date: { type: Date, default: Date.now },
    }]
  },

  banned: {
    status: { type: Boolean, default: false },
    reason: { type: String, default: ""},
  }, // can't create groups, can't change username

  lastActive: { type: Date, default: Date.now },

  test: { type: String, default: ""},

  notification: [{
    date: { type: Date, default: Date.now  },
    title: { type: String },
    description: { type: String }, 
    link: { type: String, default: null },
    button_text: { type: String, default: null },
    is_read: { type: Boolean, default: false },
    type: { type: String, default: 'info' },
    priority: {  type: Number, default: 3 },
  }]
});

UserSchema.methods.comparePassword = function(password) {
  return bcrypt.compareSync(password, this.hash_password);
};

const User = mongoose.model('User', UserSchema, "users");

module.exports = User;
