'use strict';



var mongoose = require('mongoose'),
User = mongoose.model('User'),
jwt = require('jsonwebtoken'),
bcrypt = require('bcrypt'),
Team = mongoose.model('Team');


function validateTeamname(username) {
  // Regular expression to check valid characters (letters, numbers, underscores)
  const isValid = /^[a-zA-Z0-9_]+$/.test(username);

  // Check the length of the username
  const isLengthValid = username.length <= 30;

  // List of prohibited words
  const badWords = ['dick', 'suck', 'pussy', "fuck", "sex", "porno", "penis", "boobs", "jerking"];

  // Function to check for bad words
  const containsBadWords = (username) => {
    return badWords.some(badWord => username.toLowerCase().includes(badWord));
  };

  // Check if username contains any bad words
  const isContentValid = !containsBadWords(username);

  return isValid && isLengthValid && isContentValid;
}

exports.publicname_check = async function(req, res) {
  const { publicname } = req.body;
  var user = req.user;

  if (user !== null){
    var valid = validateTeamname(publicname);

    if (valid){
      var find = await Team.findOne({ publicname: publicname });
      if (find == null){
        return res.status(200).json({
          message: "ok"
        });
      } else {
        return res.status(500).json({
          message: "already exists"
        });
      }
    } else {
      return res.status(500).json({
        message: "not valid"
      });
    }
  } else {
    return res.status(500).json({
      message: "no token found"
    });
  }
};

function generateTeamName() {
  const adjectives = ["squad", "soldiers", "fighters", "legends"];
  const number = Math.floor(Math.random() * 100000);
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  return `${adjective}_${number}`;
}

exports.create = async function(req, res) {
  const { type, publicname, title } = req.body;
  var user = req.user;

  if (user !== null){

    var find = await User.findOne({ _id: user._id });

    var valid = validateTeamname(publicname);

    if (valid && find){
      
      console.log("IDDD");
      console.log(find.username);
      
      let newTeam = new Team({
        ownerID: find.username,
        publicname: (type == "public") ? publicname : generateTeamName(),
        typeTeam: type,
        metadata: {
          officialUrl: "",
          imageUrl: "",
          description: "",
          title: title,
        },
      });

      await newTeam.save();

      return res.status(200).json({
        message: "ok"
      });

      
    } else {
      return res.status(500).json({
        message: "not valid"
      });
    }
  } else {
    return res.status(500).json({
      message: "no token found"
    });
  }
};

exports.generateName = async function(req, res) {
  var user = req.user;

  if (user !== null){

    return res.status(200).json({
      message: "ok",
      teamname: generateTeamName()
    });
  } else {
    return res.status(500).json({
      message: "no token found"
    });
  }
};
