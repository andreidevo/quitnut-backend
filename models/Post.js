'use strict';

var mongoose = require('mongoose'),
bcrypt = require('bcrypt'),
Schema = mongoose.Schema;

var PostSchema = new Schema({

  ownerID: { type: Schema.Types.ObjectId, ref: 'User' },

  created: { type: Date, default: Date.now },
  priority: { type: Number},
  withoutcomments: { type: Boolean, default: false },
  withoutstreak: { type: Boolean, default: false },
  nsfw: { type: Boolean, default: false },

  locale: { type: String, default: "en" },

  metadata: {
    text: { type: String},
    imageUrl: { type: String},
  },

  // TEAMS
  comments: [{ type: Schema.Types.ObjectId, ref: 'Comment' }],

  reportCounts: [{
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    reason: { type: String, required: false }
  }],

  reactionsList: [{
    reactionID: { type: String, required: true },
    users: [{ type: Schema.Types.ObjectId, ref: 'User' }],  // Array of user IDs who reacted
    count: { type: Number, default: 0 }  // Count of reactions
  }],

  tagsList: [{
    tagID: { type: String, required: true } // "no", "heart", "fire", "swag"
  }],

});

const Post = mongoose.model('Post', PostSchema, "posts");

module.exports = Post;
