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
      if (find === null){
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
      console.log("TYPE");
      console.log(type);

      var sub = find.subscription.status;
      
      // checking free premium limits
      if (type === "Public"){
        // check public count 
        var count = find.publicTeams;
        console.log(count);
        console.log(sub);

        if (sub === "null"){
          if (count > 0){
            console.log("LIMIT");
            return res.status(500).json({
              message: "public limit"
            });
          }
        } else {
          if (count > 19){
            return res.status(500).json({
              message: "20 limit"
            });
          }
        }
      } else {
        // check private count 
        var count = find.privateTeams;

        console.log(count);
        console.log(sub);

        if (sub === "null"){
          if (count > 1){
            console.log("LIMIT PRIVATE");

            return res.status(500).json({
              message: "private limit"
            });
          }
        } else {
          if (count > 19){
            return res.status(500).json({
              message: "20 limit"
            });
          }
        }
      }


      let newTeam = new Team({
        ownerID: find.username,
        publicname: (type === "Public") ? publicname : generateTeamName(),
        typeTeam: type,
        metadata: {
          officialUrl: "",
          imageUrl: "",
          description: "",
          title: title,
        },
        members: [user._id]
      });

      var idT = await newTeam.save();

      const updateField = type === 'Public' ? 'publicTeams' : 'privateTeams';

      const updatedUser = await User.findByIdAndUpdate(
        user._id,
        { 
          $push: { communities: idT._id },
          $inc: { [updateField]: 1 }
        },
        
        { new: true }
      );

      if (!updatedUser) {
        return res.status(500).json({
          message: "User not found",
          info: {}
        });
      }

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


exports.editTeam = async function(req, res) {
  const { id, title, description, publicname, url } = req.body;
  
  var user = req.user;

  if (user !== null){

    var find = await User.findOne({ _id: user._id });

    // var valid = validateTeamname(publicname);

    if (find){
      const team = await Team.findById(id);

      if (team.ownerID !== find.username){
        return res.status(500).json({ message: "No permissions" });
      }

      if (!team) {
        return res.status(500).json({ message: "Team not found" });
      }

      // If publicname is provided and different from the current one, validate it
      if (publicname && team.publicname !== publicname && !validateTeamname(publicname)) {
        return res.status(500).json({ message: "Invalid team name" });
      }

      // Prepare the update object based on provided values
      const updates = {};
      if (publicname && team.publicname !== publicname) {
        updates.publicname = publicname;
      }
      if (title && team.metadata.title !== title) {
        updates['metadata.title'] = title;
      }
      if (description && team.metadata.description !== description) {
        updates['metadata.description'] = description;
      }
      if (url && team.metadata.officialUrl !== url) {
        updates['metadata.officialUrl'] = url;
      }

      // Perform the update if there are any changes
      if (Object.keys(updates).length > 0) {
        const updatedTeam = await Team.findByIdAndUpdate(id, { $set: updates }, { new: true });
        return res.status(200).json({
          message: "Team updated successfully",
          team: updatedTeam
        });
      } else {
        return res.status(200).json({
          message: "No changes detected, nothing updated"
        });
      }
      
    } else {
      return res.status(500).json({
        message: "no user found"
      });
    }
  } else {
    return res.status(500).json({
      message: "no token found"
    });
  }
};

exports.getAllTeams = async function(req, res) {
  const user = req.user; 

  if (!user) {
    return res.status(401).json({
      message: "No token found or user is not authenticated",
      teams: []
    });
  }

  try {

    const userId = new mongoose.Types.ObjectId(user._id);

    const teams = await Team.aggregate([
      { $match: { 'members': userId } }, // Match teams where user is a member
      {
        $lookup: {
          from: 'users', // Assuming 'users' is the collection name for User model
          localField: 'members',
          foreignField: '_id',
          as: 'memberDetails'
        }
      },
      { $addFields: { 'membersCount': { $size: '$memberDetails' } } }, // Add count of detailed members
      { $project: { // Define which fields to include
        _id: 1, // Community _id
        title: '$metadata.title',
        priority: 1,
        membersCount: 1,
        typeTeam: 1
      }}
    ]);

    return res.status(200).json({
      message: "ok",
      teams: teams
    });
  } catch (error) {
    console.error('Error retrieving teams:', error);
    return res.status(500).json({
      message: "Failed to retrieve teams",
      taams: []
    });
  }
};

exports.getPublicTeams = async function(req, res) {
  const user = req.user; 

  if (!user) {
    return res.status(401).json({
      message: "No token found or user is not authenticated",
      teams: []
    });
  }

  try {

    const userId = new mongoose.Types.ObjectId(user._id);

    const teams = await Team.aggregate([
      { $match: { 
        members: { $nin: [userId] }, 
        typeTeam: 'Public', 
        dontaccept: false 
      }},
      {
        $lookup: {
          from: 'users', // This should match the actual name of the collection in MongoDB
          localField: 'members',
          foreignField: '_id',
          as: 'memberDetails'
        }
      },
      { $addFields: { 'membersCount': { $size: '$memberDetails' } } },
      { $project: { 
        _id: 1,
        title: '$metadata.title',
        priority: 1,
        membersCount: 1,
      }}
    ]);

    return res.status(200).json({
      message: "ok",
      teams: teams
    });
  } catch (error) {
    console.error('Error retrieving teams:', error);
    return res.status(500).json({
      message: "Failed to retrieve teams",
      taams: []
    });
  }
};

exports.getCommunityInfo = async function(req, res) {
  const { id } = req.body;

  const user = req.user; 

  if (!user) {
    return res.status(401).json({
      message: "No token found or user is not authenticated",
      info: {}
    });
  }

  console.log("ok");

  try {
    const community = await Team.findById(id).select('ownerID publicname typeTeam dontaccept metadata').exec();
    console.log("found?");

    if (!community) {
      return res.status(404).json({ message: "Community not found" });
    }

    return res.status(200).json({
      message: "ok",
      info: community
    });
  } catch (error) {
    console.error('Error retrieving teams:', error);
    return res.status(500).json({
      message: "Failed to retrieve teams",
      info: {}
    });
  }
};

exports.joinToTeam = async function(req, res) {
  const { id } = req.body;

  const user = req.user; 

  if (!user) {
    return res.status(401).json({
      message: "No token found or user is not authenticated",
      info: {}
    });
  }

  console.log("ok join");

  try {
    const userId = new mongoose.Types.ObjectId(user._id);

    const teamUpdate = await Team.findByIdAndUpdate(
      id,
      { $addToSet: { members: userId } },  // $addToSet prevents duplicate entries
      { new: true }  // Returns the updated document
    );

    if (!teamUpdate) {
      return res.status(404).json({
        message: "Team not found",
        info: {}
      });
    }

    const teamId = new mongoose.Types.ObjectId(id);    

    const userUpdate = await User.findByIdAndUpdate(
      user._id,
      { $addToSet: { communities: teamId } }, 
      { new: true } 
    );

    if (!userUpdate) {
      return res.status(404).json({
        message: "User not found",
        info: {}
      });
    }

    return res.status(200).json({
      message: "ok"
    });

  } catch (error) {
    console.error('Error retrieving teams:', error);
    return res.status(500).json({
      message: "Failed to retrieve teams",
      info: {}
    });
  }
};

exports.exitTeam = async function(req, res) {
  const { id } = req.body; // Assuming this is the Team ID

  const user = req.user; 
  if (!user) {
    return res.status(401).json({
      message: "No token found or user is not authenticated",
      info: {}
    });
  }

  try {
    // First, retrieve the team to check if the current user is the owner
    const team = await Team.findById(id);
    if (!team) {
      return res.status(404).json({
        message: "Team not found",
        info: {}
      });
    }

    // Check if the current user is not the owner of the team
    if (team.ownerID !== user.username) {
      return res.status(403).json({
        message: "Unauthorized: Only the team owner can exit the team",
        info: {}
      });
    }

    // Remove user from team members if they are the owner
    const teamUpdate = await Team.findByIdAndUpdate(
      id,
      { $pull: { members: user._id } },  // $pull removes the user from the members array
      { new: true }  // Returns the updated document
    );

    // Remove team from user's communities
    const userUpdate = await User.findByIdAndUpdate(
      user._id,
      { $pull: { communities: id } },  // $pull removes the team from the communities array
      { new: true }
    );

    if (!userUpdate) {
      return res.status(404).json({
        message: "User not found",
        info: {}
      });
    }

    // Both updates were successful
    return res.status(200).json({
      message: "Successfully exited the team"
    });

  } catch (error) {
    console.error('Error exiting team:', error);
    return res.status(500).json({
      message: "Failed to exit team",
      info: {}
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
