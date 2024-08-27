'use strict';

var mongoose = require('mongoose'),
bcrypt = require('bcrypt'),
Schema = mongoose.Schema;

var CommentSchema = new Schema({

  ownerID: { type: Schema.Types.ObjectId, ref: 'User' },
  postID: { type: Schema.Types.ObjectId, ref: 'Post' },

  parentID: { type: Schema.Types.ObjectId, ref: 'Comment', default: null },
  
  created: { type: Date, default: Date.now },
  withoutcomments: { type: Boolean, default: false },

  metadata: {
    text: { type: String},
  },

  reportCounts: [{
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    reason: { type: String, required: false }
  }],

  reactionsList: [{
    reactionID: { type: String, required: true },
    users: [{ type: Schema.Types.ObjectId, ref: 'User' }],  // Array of user IDs who reacted
    count: { type: Number, default: 0 }  // Count of reactions
  }]
});

const Comment = mongoose.model('Comment', CommentSchema, "comments");

module.exports = Comment;
