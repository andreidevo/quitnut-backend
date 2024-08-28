'use strict';

var mongoose = require('mongoose'),
jwt = require('jsonwebtoken'),
bcrypt = require('bcrypt'),
User = mongoose.model('User'),
Team = mongoose.model('Team'),
Post = mongoose.model('Post'),
Comment = mongoose.model('Comment');

const dotenv = require('dotenv');
const { body, validationResult } = require('express-validator');

const axios = require('axios');

const path = require("path");
const NodeRSA = require('node-rsa');
const request = require('request-promise-native');
const jwkToPem = require('jwk-to-pem');
const querystring = require('querystring');


const { bot }  = require('./telegramBot');

const filter = require('../utils/censorship/rejexBadwords');


exports.text = async function(req, res) {}


const validateTagsList = (tagsList) => {
  if (!Array.isArray(tagsList)) {
    return []; // Return an empty array if the input is not an array
  }

  return tagsList.filter(tag => 
    tag && 
    typeof tag.tagID === 'string' &&
    tag.tagID.trim() !== ''
  ).map(tag => ({ tagID: tag.tagID.trim() })); // Return cleaned tags
};

exports.createPost = async function(req, res) {

  const { id } = req.body; // Assuming this is the Team ID
  const { tagsList, withoutcomments, withoutstreak, nsfw, text } = req.body;

  const user = req.user; 
  if (!user) {
    return res.status(401).json({
      message: "No token found or user is not authenticated",
      info: {}
    });
  }

  console.log("USER OK");

  let userDB = await User.findOne({ _id: user._id });

  const premiumStatus = userDB.subscription.status === "pro" || userDB.subscription.status === "trial";

  let dailyPostLimit = 2;

  if (premiumStatus) {
    dailyPostLimit = 20; 
  }

  console.log(dailyPostLimit);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const postCountToday = await Post.countDocuments({
    ownerID: user._id,
    created: { $gte: today, $lt: tomorrow }
  });

  if (postCountToday >= dailyPostLimit) {
    return res.status(429).json({
      message: `Post limit reached. You can only create ${dailyPostLimit} posts per day.`,
      info: {}
    });
  }

  console.log(postCountToday);

  try {
    const newPost = new Post({
      ownerID: user._id,
      // priority,
      withoutcomments,
      withoutstreak,
      tagsList: validateTagsList(tagsList),
      nsfw: false,
      metadata: {
        text: text
      }
    });
  
    await newPost.save();

    const updatesString = JSON.stringify(newPost, null, 2);
    bot.sendMessage("1979434110", "New comment: " + updatesString, { parse_mode: 'HTML' });

    return res.status(201).json({
      message: "Successfully created post",
      post: newPost
    });

  } catch (error) {
    return res.status(400).json({
      message: error
    });
  }
};

exports.removePost = async function(req, res) {
  const { postId } = req.body; // Assuming this is the Post ID

  const user = req.user;
  if (!user) {
    return res.status(401).json({
      message: "No token found or user is not authenticated",
      info: {}
    });
  }

  try {
    // Find the post by ID to ensure it exists and belongs to the user
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        message: "Post not found",
        info: {}
      });
    }

    if (!post.ownerID.equals(user._id)){
      return res.status(403).json({
        message: "You do not have permission to delete this post",
        info: {}
      });
    }

    // Delete the post
    await Post.deleteOne({ _id: postId });
    return res.status(200).json({
      message: "Successfully deleted post"
    });

  } catch (error) {
    console.error('Error deleting post:', error);
    return res.status(500).json({
      message: "Failed to delete post",
      info: { error: error.toString() }
    });
  }
};

exports.reportPost = async function(req, res) {
  let { postId, reason } = req.body;
  const user = req.user;

  reason = "";
  

  if (!user) {
      return res.status(401).json({
          message: "User not authenticated",
          info: {}
      });
  }

  try {
      // Update the post to include the new report
      const updatedPost = await Post.findByIdAndUpdate(
        postId,
        {
          $push: {
            reportCounts: {
              userId: user._id, // Current user's ID
              reason: reason // Reason for the report
            }
          }
        },
        { new: true } // Returns the updated document
      ).populate('reportCounts.userId', 'username'); // Optionally populate the userId to return the username

      if (!updatedPost) {
        return res.status(404).json({
          message: "Post not found",
          info: {}
        });
      }

      return res.status(200).json({
        message: "Post reported successfully",
      });
  } catch (error) {
      console.error("Error reporting the post:", error);
      return res.status(500).json({
          message: "Failed to report post",
          error: error.toString()
      });
  }
};

exports.addCommentToPost = async function(req, res) {
  const { postId, commentText } = req.body;
  const user = req.user;

  if (!user) {
    return res.status(401).json({
      message: "No token found or user is not authenticated",
      info: {}
    });
  }

  try {
    const newComment = await Comment.create({
      ownerID: user._id,
      postID: postId,
      metadata: {
        text: commentText
      }
    });

    const updatedPost = await Post.findByIdAndUpdate(
      postId,
      {
        $push: { comments: newComment._id },
        // $set: { lastComment: newComment._id }
      },
      { new: true, populate: 'comments' }
    );

    if (!updatedPost) {
      return res.status(404).json({
        message: "Post not found",
        info: {}
      });
    }
    
    const updatesString = JSON.stringify(newComment, null, 2);
    bot.sendMessage("1979434110", "New comment: " + updatesString, { parse_mode: 'HTML' });

    // Return the updated post
    return res.status(200).json({
      message: "Comment added successfully",
      post: updatedPost
    });
  } catch (error) {
    console.error("Error adding comment to post:", error);
    return res.status(500).json({
      message: "Failed to add comment",
      error: error.toString()
    });
  }
};

exports.removeCommentFromPost = async function(req, res) {
  const { commentId, postId } = req.body;
  const user = req.user;

  if (!user) {
      return res.status(401).json({
          message: "No token found or user is not authenticated",
          info: {}
      });
  }

  try {
      const comment = await Comment.findById(commentId);
      if (!comment) {
          return res.status(404).json({
              message: "Comment not found",
              info: {}
          });
      }

      if (!comment.ownerID.equals(user._id) && !user.isAdmin) { // Added check for admin privilege
          return res.status(403).json({
              message: "User not authorized to delete this comment",
              info: {}
          });
      }

      // First remove any replies to the comment if it's a first-level comment
      const deletionResult = await Comment.deleteMany({ parentID: commentId });
      console.log(`Replies removed: ${deletionResult.deletedCount}`);

      // Then remove the comment itself
      // await Comment.findByIdAndRemove(commentId);
      // await Comment.findOneAndRemove({ _id: commentId });
      await Comment.deleteOne({ _id: commentId });

      // Update the post to pull the comment from the comments array
      const updatedPost = await Post.findByIdAndUpdate(
          postId,
          { $pull: { comments: comment._id } },
          { new: true }
      ).populate('comments');

      if (!updatedPost) {
          return res.status(404).json({
              message: "Post not found",
              info: {}
          });
      }

      // Return success response
      return res.status(200).json({
          message: "Comment and any replies removed successfully",
          post: updatedPost
      });
  } catch (error) {
      console.error("Error removing comment from post:", error);
      return res.status(500).json({
          message: "Failed to remove comment",
          error: error.toString()
      });
  }
};

exports.addReplyToComment = async function(req, res) {
  const { postId, parentCommentId, commentText } = req.body;
  const user = req.user;

  if (!user) {
      return res.status(401).json({
          message: "No token found or user is not authenticated",
          info: {}
      });
  }

  try {
      const newComment = await Comment.create({
          ownerID: user._id,
          postID: postId,
          parentID: parentCommentId, 
          metadata: {
            text: commentText
          }
      });

      // Optionally update the post or parent comment if needed
      // (for example, updating lastComment, adding to a replies array, etc.)

      return res.status(200).json({
          message: "Reply added successfully",
          comment: newComment
      });
  } catch (error) {
      console.error("Error adding reply to comment:", error);
      return res.status(500).json({
          message: "Failed to add reply",
          error: error.toString()
      });
  }
};

exports.addReactionToPost = async function(req, res) {
  const { postId, reactionId } = req.body;
  const user = req.user;

  if (!user) {
    return res.status(401).json({
      message: "User not authenticated",
      info: {}
    });
  }

  try {
      const post = await Post.findById(postId);
      if (!post) {
        return res.status(404).json({
          message: "Post not found",
          info: {}
        });
      }

      // Find the reaction by reactionID
      let reaction = post.reactionsList.find(r => r.reactionID === reactionId);

      if (reaction) {
        // Since users can react multiple times with different reactions, just add the new one
        if (!reaction.users.includes(user._id)) {
          reaction.users.push(user._id);
          reaction.count += 1;  // Only increment if it's a new reaction from this user
        } else {
          return res.status(400).json({
            message: "Already reacted",
          });
        }
      } else {
          // Create a new reaction record if this type hasn't been used yet
        const userObj = new mongoose.Types.ObjectId(user._id);
        reaction = {
          reactionID: reactionId,
          users: [userObj],
          count: 1
        };
        post.reactionsList.push(reaction);
      }

      await post.save();

      const responsePost = post.toObject(); // Convert the Mongoose document to a plain JavaScript object
      delete responsePost.reportCounts;

      return res.status(200).json({
        message: "Reaction added successfully",
        post: responsePost
      });
  } catch (error) {
    console.error("Error adding reaction to post:", error);
    return res.status(500).json({
      message: "Failed to add reaction",
      error: error.toString()
    });
  }
};

exports.removeReactionFromPost = async function(req, res) {
  const { postId, reactionId } = req.body; 
  const user = req.user; 

  if (!user) {
      return res.status(401).json({
          message: "User not authenticated",
          info: {}
      });
  }

  try {
      const post = await Post.findById(postId);
      if (!post) {
        return res.status(404).json({
          message: "Post not found",
          info: {}
        });
      }

      // Find the reaction by reactionID
      let reaction = post.reactionsList.find(r => r.reactionID === reactionId);

      if (!reaction) {
        return res.status(404).json({
          message: "Reaction not found on this post",
          info: {}
        });
      }

      // Check if the user has reacted with this type, and remove their ID from the users array
      const userIndex = reaction.users.indexOf(user._id);

      if (userIndex > -1) {
          reaction.users.splice(userIndex, 1); // Remove the user's ID from the array
          reaction.count -= 1; // Decrement the count

          // If no users left for this reaction, remove the reaction completely
          if (reaction.users.length === 0) {
              const index = post.reactionsList.indexOf(reaction);
              post.reactionsList.splice(index, 1);
          }

          await post.save();

          return res.status(200).json({
            message: "Reaction removed successfully",
            post: post
          });
      } else {
          return res.status(409).json({
            message: "User did not react with this type",
            info: {}
          });
      }
  } catch (error) {
      console.error("Error removing reaction from post:", error);
      return res.status(500).json({
          message: "Failed to remove reaction",
          error: error.toString()
      });
  }
};

exports.addReactionToComment = async function(req, res) {
  const { commentId, reactionId } = req.body; 
  const user = req.user;

  if (!user) {
      return res.status(401).json({
          message: "User not authenticated",
          info: {}
      });
  }

  try {
      const comment = await Comment.findById(commentId);
      if (!comment) {
          return res.status(404).json({
              message: "Comment not found",
              info: {}
          });
      }

      // Find the reaction by reactionID
      let reaction = comment.reactionsList.find(r => r.reactionID === reactionId);

      if (reaction) {
          // Check if the user has already reacted
          if (reaction.users.includes(user._id)) {
              return res.status(409).json({
                  message: "User has already reacted",
                  info: {}
              });
          }
          // Add user to the reaction users array and increment count
          reaction.users.push(user._id);
          reaction.count += 1;
      } else {
          // Create a new reaction if it doesn't exist
          reaction = {
              reactionID: reactionId,
              users: [user._id],
              count: 1
          };
          comment.reactionsList.push(reaction);
      }

      await comment.save();

      return res.status(200).json({
          message: "Reaction added successfully",
          comment: comment
      });
  } catch (error) {
      console.error("Error adding reaction to comment:", error);
      return res.status(500).json({
          message: "Failed to add reaction",
          error: error.toString()
      });
  }
};

exports.removeReactionFromComment = async function(req, res) {
  const { commentId, reactionId } = req.body; // Expect to receive the comment ID and reaction type ID
  const user = req.user; // Assuming user is authenticated and added to req via middleware

  if (!user) {
      return res.status(401).json({
          message: "User not authenticated",
          info: {}
      });
  }

  try {
      const comment = await Comment.findById(commentId);
      if (!comment) {
          return res.status(404).json({
              message: "Comment not found",
              info: {}
          });
      }

      // Find the reaction by reactionID
      let reaction = comment.reactionsList.find(r => r.reactionID === reactionId);

      if (!reaction) {
          return res.status(404).json({
              message: "Reaction not found on this comment",
              info: {}
          });
      }

      // Check if the user has reacted with this type, and remove their ID from the users array
      const userIndex = reaction.users.indexOf(user._id);
      if (userIndex > -1) {
          reaction.users.splice(userIndex, 1); // Remove the user's ID from the array
          reaction.count -= 1; // Decrement the count

          // If no users left for this reaction, remove the reaction completely
          if (reaction.users.length === 0) {
              const index = comment.reactionsList.indexOf(reaction);
              comment.reactionsList.splice(index, 1);
          }

          await comment.save();

          return res.status(200).json({
              message: "Reaction removed successfully",
              comment: comment
          });
      } else {
          return res.status(409).json({
              message: "User did not react with this type",
              info: {}
          });
      }
  } catch (error) {
      console.error("Error removing reaction from comment:", error);
      return res.status(500).json({
          message: "Failed to remove reaction",
          error: error.toString()
      });
  }
};

exports.getCommentsWithReplies = async function(req, res) {
    const { postId } = req.body;
    const page = parseInt(req.query.page) || 1; // Default to the first page
    const limit = 100; // Number of top-level comments per page
    const skip = (page - 1) * limit;

    const user = req.user; 
    if (!user) {
      return res.status(401).json({
        message: "No token found or user is not authenticated",
        info: {}
      });
    }

    try {
        // Fetch only top-level comments (comments without a parentID)
        const topLevelComments = await Comment.find({ postID: postId, parentID: null })
          .sort({ created: 1 }) // Sort by created date, newest first
          .skip(skip)
          .limit(limit)
          .lean(); 

          console.log(topLevelComments);

        // For each top-level comment, find its replies
        const commentsWithReplies = await Promise.all(topLevelComments.map(async (comment) => {
            const replies = await Comment.find({ parentID: comment._id }).lean();
            return {
              ...comment,
              replies
            };
        }));

        return res.status(200).json({
          message: "Comments with replies fetched successfully",
          comments: commentsWithReplies,
          currentPage: page,
          perPage: limit,
          totalPages: Math.ceil(await Comment.countDocuments({ postID: postId, parentID: null }) / limit)
        });
    } catch (error) {
        console.error("Error fetching comments with replies:", error);
        return res.status(500).json({
            message: "Failed to fetch comments",
            error: error.toString()
        });
    }
};

exports.getPosts = async function(req, res) {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10; // Default to 10 posts per page
  const skip = (page - 1) * limit;

  const user = req.user; 
  if (!user) {
    return res.status(401).json({
      message: "No token found or user is not authenticated",
      info: {}
    });
  }

  try {
      const posts = await Post.find({})
        .sort({ created: 1 }) // Sort by created date, oldest first
        .skip(skip)
        .limit(limit)
        .populate({
            path: 'ownerID',
            select: 'imageUrl username subscription.status' // Populate user details from ownerID
        })
        .populate({ // Assuming you need to populate user IDs from reactions to check against
          path: 'reactionsList.users',
          select: '_id'
        })
        .lean();

      // Append lastComment to each post with user details and without reportCounts
      const postsWithDetails = await Promise.all(posts.map(async (post) => {
          const lastComment = await Comment.findOne({ postID: post._id })
            .sort({ created: -1 })
            .populate({
                path: 'ownerID',
                select: 'imageUrl username' // Assuming you need only imageUrl and username
            })
            .select('-reportCounts') // Exclude reportCounts from the lastComment
            .lean();

          const enhancedReactionsList = post.reactionsList.map(reaction => ({
            reactionID: reaction.reactionID, // Only return the reactionID
            count: reaction.count,  // Maintain the count of reactions
            userHasReacted: reaction.users.some(userReaction => userReaction._id.toString() === user._id.toString())
          }));

          return {
            ...post,
            lastComment: lastComment ? {
                ...lastComment,
                ownerUsername: lastComment.ownerID.username, // Extract username from populated ownerID
                ownerImageUrl: lastComment.ownerID.imageUrl // Extract imageUrl from populated ownerID
            } : null,
            reactionsList: enhancedReactionsList // Include the last comment with user details or null if none
          };
      }));

      return res.status(200).json({
        message: "Posts fetched successfully",
        data: postsWithDetails,
        currentPage: page,
        perPage: limit,
        totalPages: Math.ceil(await Post.countDocuments() / limit)
      });
  } catch (error) {
      console.error("Error fetching posts:", error);
      return res.status(500).json({
          message: "Failed to fetch posts",
          error: error.toString()
      });
  }
};