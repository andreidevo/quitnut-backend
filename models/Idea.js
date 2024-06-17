'use strict';

var mongoose = require('mongoose'),
Schema = mongoose.Schema;

const BlockSchema = new Schema({
  label: { type: String, default: '' },
  value: { type: String, required: true },
  bg: { type: String, required: true },
  text: { type: String, required: true }
});

const ProofSchema = new Schema({
  url: { type: String, required: true },
  label: { type: String, required: true }
});

const IdeaSchema = new Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  image: { type: String, required: true },
  blocks: [BlockSchema],
  tags: [{ type: String }],
  url: { type: String, required: true },
  proof: [ProofSchema]
});

const Idea = mongoose.model('Idea', IdeaSchema, "ideas");

module.exports = Idea;