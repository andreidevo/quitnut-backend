'use strict';

var mongoose = require('mongoose'),
  bcrypt = require('bcrypt'),
  Schema = mongoose.Schema;

var UserSchema = new Schema({
  email: { type: String, unique: true, lowercase: true, trim: true, required: true },
  hash_password: { type: String },
  created: { type: Date, default: Date.now },
  authProvider: { type: String, required: true },
  accountId: { type: String},
  refreshToken: { type: String },
  name: { type: String },
  newsletter: { type: String, default: "null"},
  subscription: {
    status: { type: String, default: "not paid"}, // e.g., "paid"
    type: { type: String }, // e.g., "lifetime"
    amount: { type: String }, // e.g., "95$"
    date: { type: Date, default: Date.now }, // Subscription date
    email: { type: String } // Email associated with the subscription, if different from user email
  },
  credits: { type: Number, default: 0 },
  unlocked_articles: [String],
  unlocked_ideas: [String],
  credits_history: [
    {
      date: { type: Date, default: Date.now }, 
      credits: { type: Number, default: 0 } 
    }
  ]
});

UserSchema.methods.comparePassword = function(password) {
  return bcrypt.compareSync(password, this.hash_password);
};

const User = mongoose.model('User', UserSchema, "users");

module.exports = User;
