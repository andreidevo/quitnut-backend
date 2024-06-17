'use strict';


const Resource = require('../models/Content');
const Story = require('../models/Story');
const Newsletter = require('../models/Newsletter');
const Blog = require('../models/Blog');
const User = require('../models/User')
const Idea = require('../models/Idea')

var mongoose = require('mongoose'),
jwt = require('jsonwebtoken'),

bcrypt = require('bcrypt');
// Resource = mongoose.model('Resource');
// const asyncHandler = require('express-async-handler');

exports.ideas = async function(req, res) {
  const token = req.cookies.accessToken; // Access the cookie
  // console.log(token);
  
  if (!token) {
    return res.sendStatus(401); // Unauthorized if no token
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403); // Forbidden if token is invalid
  });

  res.status(200).json({
    "status": "ok"
  });
};

exports.getAllResources = async function(req, res) {
  // console.log("get recources ok");
  
  const id = req.user._id
  const user = await User.findById(id);

  if (!user) {
    return res.status(200).json("No");
  }

  const resources = await Resource.find({});

  if (user.subscription.status !== "paid"){
    try {
      const modifiedResources = resources.map(resource => {

        const resourceObj = resource.toObject();

        if (resourceObj.free === false) {

          if (Array.isArray(resourceObj.formats)) {
            resourceObj.formats.forEach(format => {
              format.url = ""; 
            });
          } else {
            resourceObj.formats.url = "";
          }
        }
        
        return resourceObj;
      });


      return res.status(200).json({
        "premium": false,
        "data": modifiedResources
      });

    } catch (error) {
      return res.status(500).send(error.toString());
    }
  } else {
    try {

      const resources = await Resource.find({});
      return res.status(200).json({
        "premium": true,
        "data": resources
      });
    } catch (error) {
      return res.status(500).send(error.toString());
    }
  }
};


exports.articleLoadMore = async function(req, res) {
  // console.log("load more start");
  
  const id = req.user._id
  const user = await User.findById(id);

  if (!user) {
    return res.status(200).json({
      premium: false,
      unlocked: false,
      credits: 0
    });
  }

  console.log(user.subscription.status);
  console.log(user.email);

  if (user.subscription.status !== "paid"){

    // check if article in unlocked_articles 
    
    const articleId = req.query.id;

    console.log("NO PREMiUM -> Checking unlocked articles");
    
    if (Array.isArray(user.unlocked_articles) && user.unlocked_articles.includes(articleId)){
      const article = await Story.findOne({ id: articleId });

      console.log("Article Found");

      return res.status(200).json({
        premium: false,
        unlocked: true,
        credits: user.credits,
        data: article.content
      });
    }

    console.log("Article Haven't Found in unlocked_credits");
    console.log(user.unlocked_articles);
    console.log(user.credits);

    return res.status(200).json({
      premium: false,
      unlocked: false,
      credits: user.credits
      });
    } else {


      const articleId = req.query.id;
      // console.log(articleId);
      const article = await Story.findOne({ id: articleId });
      // console.log(article);

      // const data = JSON.parse(article.content);

      return res.status(200).json({
        premium: true,
        unlocked: true,
        credits: user.credits,
        data: article.content
      });
    }
};

exports.blogLoadMore = async function(req, res) {
  
  const id = req.user._id
  const user = await User.findById(id);

  if (!user) {
    return res.status(200).json({
      premium: false,
      credits: 0
    });
  }

  if (user.subscription.status !== "paid"){

    const blogId = req.query.id;

    if (Array.isArray(user.unlocked_articles) && user.unlocked_articles.includes(blogId)){
      const blog = await Blog.findOne({ id: blogId });

      console.log("Blog Found");

      return res.status(200).json({
        premium: false,
        unlocked: true,
        credits: user.credits,
        data: blog.content
      });
    }

    console.log("Article Haven't Found in unlocked_credits");

    return res.status(200).json({
      premium: false,
      unlocked: false,
      credits: user.credits
    });
  } else {


    const blogId = req.query.id;
    const blog = await Blog.findOne({ id: blogId });

    return res.status(200).json({
      premium: true,
      unlocked: true,
      credits: user.credits,
      data: blog.content
    });
  }
};

exports.unlock_article = async function(req, res) {
  
  const id = req.user._id
  const article_id = req.body.article_id

  console.log("UNLOCK ARTICLE");
  console.log(article_id);


  const user = await User.findById(id);

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  console.log(user.credits);

  if (user.credits > 14) {
      const updateResult = await User.findByIdAndUpdate(id, {
          $inc: { credits: -15 }, 
          $addToSet: { unlocked_articles: article_id } 
      }, { new: true }); // Returns the updated document

    return res.status(200).json({ message: "Article unlocked successfully", credits: user.credits });
  } else {
    return res.status(400).json({ message: "Insufficient credits", credits: 0 });
  }
};

exports.unlock_idea = async function(req, res) {
  
  const id = req.user._id
  const idea_id = req.body.idea_id

  console.log("UNLOCK IDEA");
  console.log(idea_id);

  const user = await User.findById(id);

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  console.log(user.credits);

  if (user.credits > 0) {
      const updateResult = await User.findByIdAndUpdate(id, {
          $inc: { credits: -1 }, 
          $addToSet: { unlocked_ideas: idea_id } 
      }, { new: true }); 

    return res.status(200).json({ message: "Idea unlocked successfully", credits: user.credits });
  } else {
    return res.status(400).json({ message: "Insufficient credits", credits: 0 });
  }
};


exports.getAllIdeas = async function(req, res) {
  
  const id = req.user._id
  const user = await User.findById(id);

  if (!user) {
    return res.status(200).json("No");
  }

  console.log("Get all ideas");


  if (user.subscription.status !== "paid"){
    const ideas = await Idea.find({});
    var unlocked_ideas = user.unlocked_ideas;
    console.log(ideas.length);
    console.log(unlocked_ideas);
    try {
      const modifiedIdeas = ideas.map(idea => {
        if (!unlocked_ideas.includes(idea.id)) {
          idea.url = "";
          idea.image = "";
          idea.proof = [];
        }
        return idea;
      });

      console.log("Modified ideas");
      console.log(modifiedIdeas);

      return res.status(200).json({
        "premium": false,
        "data": modifiedIdeas,
        "credits": user.credits
      });

    } catch (error) {
      return res.status(500).send(error.toString());
    }
  } else {
    try {

      const ideas = await Idea.find({});
      return res.status(200).json({
        "premium": true,
        "data": ideas,
        "credits": user.credits
      });
    } catch (error) {
      return res.status(500).send(error.toString());
    }
  }
};



exports.getResource = async function(req, res) {
  // console.log("get recources ok");
  
  const url = "";
  
  return res.status(200).json({ "url": url});
  // res.status(200).json({
  //   "status": "ok"
  // });
};

