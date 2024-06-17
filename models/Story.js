'use strict';

var mongoose = require('mongoose'),
Schema = mongoose.Schema;

var StorySchema = new Schema({
  id: { type: String },
  content: { type: mongoose.Schema.Types.Mixed },
  free: { type: mongoose.Schema.Types.Mixed }
});

const Story = mongoose.model('Story', StorySchema, "stories");

module.exports = Story;