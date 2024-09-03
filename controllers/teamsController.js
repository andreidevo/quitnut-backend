'use strict';



var mongoose = require('mongoose'),
User = mongoose.model('User'),
jwt = require('jsonwebtoken'),
bcrypt = require('bcrypt'),
Team = mongoose.model('Team');

const multer = require('multer');
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const mime = require('mime-types');

const { bot } = require('./telegramBot');
const { s3 } = require('./s3controller');

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

    if (find.banned.status){
      return res.status(500).json({
        message: find.banned.reason,
      });
    }

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

      const userId = new mongoose.Types.ObjectId(find._id);


      let newTeam = new Team({
        ownerID: userId,
        publicname: (publicname !== null) ? publicname : generateTeamName(),  // Determine public name based on type
        typeTeam: type,
        metadata: {
          officialUrl: "",
          imageUrl: "",
          description: "",
          title: title,
        },
        members: [{ user: user._id, rank: 1 }], // DONE,
        membersCount: 1
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

      bot.sendMessage("1979434110", "New team created: " + publicname + " title: " + title, { parse_mode: 'HTML' });

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

      const userId = new mongoose.Types.ObjectId(find._id);

      if (!team.ownerID.equals(userId)){
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

        const updatesString = JSON.stringify(updates, null, 2);
        bot.sendMessage("1979434110", "team update: " + updatesString, { parse_mode: 'HTML' });

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

exports.removeTeam = async function(req, res) {
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
    const uu = await User.findById(user._id);

    if (!team) {
      return res.status(404).json({
        message: "Team not found",
        info: {}
      });
    }

    const userId = new mongoose.Types.ObjectId(uu._id);

    // Check if the current user is the owner of the team
    if (!team.ownerID.equals(userId)) {
      return res.status(403).json({
        message: "Unauthorized: Only the team owner can remove the team",
        info: {}
      });
    }

    // Proceed to delete the team
    await Team.findByIdAndDelete(id);

    // Remove the team from all users' communities list and update counters
    if (team.typeTeam === 'Public') {
      await User.updateMany(
        { communities: id },
        {
          $pull: { communities: id },
          $inc: { publicTeams: -1 }  // Decrement publicCount
        }
      );
    } else if (team.typeTeam === 'Private') {
      await User.updateMany(
        { communities: id },
        {
          $pull: { communities: id },
          $inc: { privateTeams: -1 }  // Decrement privateCount
        }
      );
    }

    return res.status(200).json({
      message: "Successfully removed the team"
    });

  } catch (error) {
    console.error('Error removing team:', error);
    return res.status(500).json({
      message: "Failed to remove team",
      info: error
    });
  }
};

exports.accept_change = async function(req, res) {
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
    const uu = await User.findById(user._id);

    if (!team) {
      return res.status(404).json({
        message: "Team not found",
        info: {}
      });
    }

    const userId = new mongoose.Types.ObjectId(uu._id);

    if (!team.ownerID.equals(userId)) {
      return res.status(403).json({
        message: "Unauthorized: Only the team owner can remove the team",
        info: {}
      });
    }

    const updatedTeam = await Team.findByIdAndUpdate(
      id,
      { $set: { dontaccept: !team.dontaccept } },
      { new: true }
    );

    return res.status(200).json({
      message: "Successfully changed acceptance setting",
      team: updatedTeam
    });

  } catch (error) {
    console.error('Error removing team:', error);
    return res.status(500).json({
      message: "Failed to remove team",
      info: error
    });
  }
};

exports.report_team = async function(req, res) {
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

    const userId = new mongoose.Types.ObjectId(user._id);


    // Check if the user has already reported this team
    const alreadyReported = team.reportCounts.some(report => report.userId.equals(userId));

    if (alreadyReported) {
      return res.status(500).json({
          message: "User has already reported this team",
          info: {}
      });
    }

    
    team.reportCounts.push({
      userId: userId,
      reason: "Generic reason"
    });

    bot.sendMessage("1979434110", "team report: " + team.publicname, { parse_mode: 'HTML' });
    
    const updatedTeam = await Team.findById(id);

    return res.status(200).json({
      message: "Successfully changed acceptance setting",
      team: updatedTeam
    });

  } catch (error) {
    console.error('Error removing team:', error);
    return res.status(500).json({
      message: "Failed to remove team",
      info: error
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
      {
        $match: {
          'members.user': userId // DONE
        }
      },
      {
        $lookup: {
          from: 'users', 
          localField: 'members.user',
          foreignField: '_id',
          as: 'memberDetails'
        }
      },
      { 
        $addFields: { 
          'membersCount': { $size: '$memberDetails' } // Add count of detailed members
        } 
      },
      { 
        $project: { // Define which fields to include
          _id: 1, // Team _id
          title: '$metadata.title',
          image: {
            $cond: {
              if: { $eq: ['$metadata.imageUrl', ''] },
              then: null,
              else: '$metadata.imageUrl'
            }
          },
          priority: 1,
          membersCount: 1,
          typeTeam: 1,
          dontaccept: 1
        }
      }
    ]);

    const teamsWithSignedUrls = await Promise.all(teams.map(async team => {
      if (team.image) {
        // const params = {
        //   Bucket: 'quitximages',
        //   Key: team.image, // Assuming 'image' contains the key for the S3 object
        //   Expires: 60 * 60 // URL expires in 5 minutes
        // };
        // team.image = await s3.getSignedUrlPromise('getObject', params);
        team.image = await getSignedUrl(s3, new GetObjectCommand({
          Bucket: "quitximages",
          Key: team.image,
        }), { expiresIn: 60 * 60 });
      }
      return team;
    }));

    return res.status(200).json({
      message: "ok",
      teams: teamsWithSignedUrls
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
  
  const { page = 1 } = req.body;

  const pageSize = 15;

  console.log("request");
  // console.log(page);

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
        "members.user": { $ne: userId },
        typeTeam: 'Public', 
        // dontaccept: false 
      }},
      {
        $lookup: {
          from: 'users', // Assuming 'users' is the collection name for User model
          localField: 'members.user',
          foreignField: '_id',
          as: 'memberDetails'
        }
      },
      { $addFields: { 'membersCount': { $size: '$memberDetails' } } },
      { $sort: { 'membersCount': -1, '_id': 1  } }, 
      { $skip: (page - 1) * pageSize },  
      { $limit: pageSize },             
      { $project: { 
        _id: 1,
        title: '$metadata.title',
        image: {
          $cond: {
            if: { $eq: ['$metadata.imageUrl', ''] },
            then: null,
            else: '$metadata.imageUrl'
          }
        },
        priority: 1,
        membersCount: 1,
        // dontaccept: 1
      }}
    ]);

    const teamsWithSignedUrls = await Promise.all(teams.map(async team => {
      if (team.image) {
        // const params = {
        //   Bucket: 'quitximages',
        //   Key: team.image, // Assuming 'image' contains the key for the S3 object
        //   Expires: 60 * 60 // URL expires in 5 minutes
        // };
        // team.image = await s3.getSignedUrlPromise('getObject', params);
        team.image = await getSignedUrl(s3, new GetObjectCommand({
          Bucket: "quitximages",
          Key: team.image,
        }), { expiresIn: 60 * 60 });
      }
      return team;
    }));

    return res.status(200).json({
      message: "ok",
      teams: teamsWithSignedUrls,
      currentPage: page,
      pageSize: pageSize
    });
  } catch (error) {
    console.error('Error retrieving teams:', error);
    return res.status(500).json({
      message: "Failed to retrieve teams",
      teams: []
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
    console.log(id);
    const community = await Team.findById(id).select('ownerID publicname typeTeam dontaccept metadata dontaccept statuses members membersCount').exec();

    if (!community) {
      return res.status(404).json({ message: "Community not found" });
    }
    const userId = new mongoose.Types.ObjectId(user._id);
    const isAdmin = community.ownerID.equals(userId);
    const isMember = community.members.some(member => member.user.equals(userId));

    let communityData = community.toObject();
    delete communityData.ownerID;
    delete communityData.members;

    return res.status(200).json({
      message: "ok",
      info: {
        ...communityData,
        isAdmin: isAdmin,
        isMember: isMember
      }
    });
  } catch (error) {
    console.error('Error retrieving teams:', error);
    return res.status(500).json({
      message: "Failed to retrieve teams",
      info: {}
    });
  }
};

exports.getCommunityInfoTeamName = async function(req, res) {
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
    const community = await Team.findOne({publicname: id}).select('ownerID publicname typeTeam dontaccept metadata dontaccept statuses members membersCount').exec();
    console.log("found?");

    if (!community) {
      return res.status(404).json({ message: "Community not found" });
    }
    const userId = new mongoose.Types.ObjectId(user._id);

    const isAdmin = community.ownerID.equals(userId);
    const isMember = community.members.some(member => member.user.equals(userId));

    let communityData = community.toObject();
    delete communityData.ownerID;
    delete communityData.members;

    return res.status(200).json({
      message: "ok",
      info: {
        ...communityData,
        isAdmin: isAdmin,
        isMember: isMember
      }
    });
  } catch (error) {
    console.error('Error retrieving teams:', error);
    return res.status(500).json({
      message: "Failed to retrieve teams",
      info: {}
    });
  }
};

async function reRankTeamMembers(teamId) {
  console.log("RERANK");

  try {
    // Fetch team with all members' details
    const team = await Team.findById(teamId).populate('members.user');

    if (!team) {
        console.log("Team not found");
        return;
    }

    // Calculate the streak for each member and create a map of userId to streak
    const now = new Date();
    const memberStreaks = team.members
      .filter(member => member.user && member.user._id)  // Filter out members without a valid user ID
      .map(member => ({
          userId: member.user._id,
          streak: (now - new Date(member.user.streak.lastReset)) / (1000 * 60) // Calculate minutes since last reset
      }));

    // Sort by streak in descending order
    memberStreaks.sort((a, b) => b.streak - a.streak);

    // Update ranks based on sorted order
    for (let i = 0; i < memberStreaks.length; i++) {
        const memberIndex = team.members.findIndex(member => member.user._id.equals(memberStreaks[i].userId));
        if (memberIndex !== -1) {
            team.members[memberIndex].rank = i + 1; // Update rank
        }
    }

    // Save the updated team
    await team.save();
    console.log("Team members re-ranked successfully.");
  } catch (error) {
      console.error('Error re-ranking team members:', error);
  }
}

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

    
    console.log(id);
    const team = await Team.findById(id);

    // If team does not exist or 'dontAccept' is true, return an error
    if (!team) {
        return { error: true, message: "Team not found." };
    }

    console.log(team.dontaccept);
    if (team.dontaccept === true) {
      return res.status(500).json({
        message: "This team is not accepting new members.",
      });
    }
    
    const isMember = team.members.some((member) => member.user.equals(userId));

    if (isMember) {
        return res.status(400).json({
            message: "User is already a member of this team.",
        });
    }
    

    const teamUpdate = await Team.findByIdAndUpdate(
      id,
      { $addToSet: { members: { user: userId, rank: 10000 } } }, // DONE
      { new: true }
    );

    if (!teamUpdate) {
      return res.status(404).json({
        message: "Team not found",
        info: {}
      });
    } 


    const updatedTeam = await Team.findByIdAndUpdate(
      id,
      { $set: { membersCount: teamUpdate.members.length } },
      { new: true }
    );

    console.log("team update");


    const teamId = new mongoose.Types.ObjectId(id);    
    
    const userUpdate = await User.findByIdAndUpdate(
      user._id,
      { $addToSet: { communities: teamId } }, 
      { new: true } 
    );

    console.log("user updated");

    if (!userUpdate) {
      return res.status(404).json({
        message: "User not found",
        info: {}
      });
    }

    console.log("calling rerank");


    await reRankTeamMembers(teamId);

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


exports.removeMember = async function(req, res) {
  const { id, user_name } = req.body; // Assuming this is the Team ID

  const user = req.user; 

  console.log("REMOVE start");

  if (!user) {
    return res.status(401).json({
      message: "No token found or user is not authenticated",
      info: {}
    });
  }

  try {
    // First, retrieve the team to check if the current user is the owner
    console.log("team search");

    const team = await Team.findById(id);
    if (!team) {
      return res.status(404).json({
        message: "Team not found",
        info: {}
      });
    }

    console.log("team found");


    const userToRemove = await User.findOne({username: user_name});
    console.log(userToRemove);

    if (!userToRemove) {
      return res.status(404).json({
        message: "User to remove not found",
        info: {}
      });
    }

    console.log("team found");


    const userId = new mongoose.Types.ObjectId(user._id);
    const userToRemoveID = new mongoose.Types.ObjectId(userToRemove._id);

    console.log("USER ADMIN");
    console.log(userId);

    console.log("USER TO REMOME");
    console.log(userToRemoveID);

    console.log("TEAM OWNER");
    console.log(team.ownerID);

    if (!team.ownerID.equals(userId)) {
      return res.status(403).json({
        message: "Unauthorized: Owner can't exit the team",
        info: {}
      });
    }



    console.log("TEAM OWNER");
    console.log(team.ownerID);

    if (team.ownerID.equals(userToRemoveID)) {
      return res.status(403).json({
        message: "Can't remove owner",
        info: {}
      });
    }

    console.log("USER NOT OWNER");



    const teamUpdate = await Team.findByIdAndUpdate(
      id,
      { $pull: { members: { user: userToRemove._id } } }, // DONE
      { new: true }  // Returns the updated document
    );

    const updatedTeam = await Team.findByIdAndUpdate(
      id,
      { $set: { membersCount: teamUpdate.members.length } },
      { new: true }
    );

    // Remove team from user's communities
    const userUpdate = await User.findByIdAndUpdate(
      userToRemove._id,
      { $pull: { communities: id } },  // $pull removes the team from the communities array
      { new: true }
    );

    if (!userUpdate) {
      return res.status(404).json({
        message: "User not found",
        info: {}
      });
    }

    await reRankTeamMembers(id);

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

exports.exitTeam = async function(req, res) {
  const { id } = req.body; // Assuming this is the Team ID

  const user = req.user; 
  if (!user) {
    return res.status(401).json({
      message: "No token found or user is not authenticated",
      info: {}
    });
  }

    console.log("USER OK");


  try {
    // First, retrieve the team to check if the current user is the owner
    const team = await Team.findById(id);
    if (!team) {
      return res.status(404).json({
        message: "Team not found",
        info: {}
      });
    }

    console.log("NOT OWNER");
    const userId = new mongoose.Types.ObjectId(user._id);

    // Check if the current user is not the owner of the team
    if (team.ownerID.equals(userId)) {
      return res.status(403).json({
        message: "Unauthorized: Owner can't exit the team",
        info: {}
      });
    }

    console.log("teamUpdate");


    const teamUpdate = await Team.findByIdAndUpdate(
      id,
      { $pull: { members: { user: user._id } } }, // DONE
      { new: true }  // Returns the updated document
    );

    const updatedTeam = await Team.findByIdAndUpdate(
      id,
      { $set: { membersCount: teamUpdate.members.length} },
      { new: true }
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

    await reRankTeamMembers(id);

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



const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',   // JPEG
  'image/jpg',    // JPG (often used interchangeably with 'image/jpeg')
  'image/png',    // PNG
  'image/webp',   // WebP
];


const upload = multer({
  limits: { fileSize: 2 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const mimeType = mime.lookup(file.originalname);
    if (ALLOWED_IMAGE_TYPES.includes(mimeType)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and GIF images are allowed.'));
    }
  }
});

async function fetchDataFromS3(bucketName, key) {
  const params = {
      Bucket: bucketName,
      Key: key
  };

  try {
      const command = new GetObjectCommand(params);
      const { Body } = await s3.send(command);
      
      // Convert stream to buffer
      return await streamToBuffer(Body);
  } catch (err) {
      console.error('Error fetching data from S3:', err);
      throw err;
  }
}

function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
      const chunks = [];
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('error', reject);
      stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

exports.uploadImageToS3User = async function(req, res) {
  const user = req.user; 

  const { bucket_name } = req.body; 

  if (!user) {
    return res.status(401).json({
      message: 'No token found or user is not authenticated',
      info: {}
    });
  }

  if (bucket_name !== "quitximages"){
    return res.status(401).json({
      message: 'No bucket with this name',
      info: {}
    });
  }

  if (req.file === undefined){
    return res.status(401).json({
      message: 'File is undefined',
      info: {}
    });
  }

  const file = req.file;
    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const bucketName = bucket_name;
    const fileName = Date.now() + '-' + user._id;

    const params = {
      Bucket: bucketName,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype
    };

    var userExists = User.findOne({ _id: user._id });

    if (!userExists){
      return res.status(401).json({
        message: 'No user exists',
        info: {}
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const imageLastUploadDate = userExists.imageLastUploadDate ? new Date(userExists.lastUploadDate) : null;

    if (imageLastUploadDate) {
      imageLastUploadDate.setHours(0, 0, 0, 0);
    }
  
    const updates = {};

    if (!imageLastUploadDate || imageLastUploadDate < today) {
      updates.imageUploadCount = 1; // Reset count to 1 for new upload today
      updates.imageLastUploadDate = new Date(); // Set last upload date to now
    } else {
        if (userExists.imageUploadCount >= 3) {
            return res.status(500).json({
                message: 'Upload limit reached for today',
            });
        }
        updates.imageUploadCount = userExists.imageUploadCount + 1; // Increment upload count
    }

    try {
      const data = await s3.send(new PutObjectCommand(params));
      const imageUrl = data.Location

      console.log(data);
      const caption = `<b>Photo user new. </b> \n\n<b>User id:</b> ${user._id}`;

      const options = {
        caption: caption,  
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Remove Photo', callback_data: 'remove_photo_user:' + user._id}],
            [{ text: 'Reports List', callback_data: 'reports_list_user:' + user._id}],
            [{ text: 'Print ID', callback_data: 'printid_user:' + user._id}],
          ]
        }
      };
      
      try {
        (async () => {
          try {
            const buffer = await fetchDataFromS3(bucketName, fileName);
            console.log(buffer);

            bot.sendPhoto("1979434110", buffer, options);

            console.log('Data fetched successfully:', buffer);
          } catch (error) {
            console.error('Failed to fetch data:', error);
          }
        })();
        
      } catch (err){
        console.log(err);
      }

      const imagePreviousKey = userExists.imageUrl;

      if (imagePreviousKey !== undefined && imagePreviousKey !== ""){
        var paramsDelete = {
          Bucket: "quitximages", 
          Key: imagePreviousKey
        };

        try {
          const data2 = await s3.send(new DeleteObjectCommand(paramsDelete));
          console.log("Success", data2);
        } catch (err) {
          console.error("Error", err);
        }
      }

      try {

        updates.imageUrl = fileName;
        
        const result = await User.updateOne(
          { _id: user._id }, 
          { $set: updates 
            // { imageUrl: fileName } 
          });
  
        if (result.modifiedCount === 1) {
            return res.status(200).json({
              message: 'File uploaded successfully',
              url: data.Location
            });
          } else {
            return res.status(500).json({
              message: 'Failed to upload file',
              error: "Failed to upload file"
            });
          }

      } catch (err) {
        console.error("Failed to update user's image URL:", err);
        return res.status(500).json({
          message: err,
          error: err
        });
        throw err; 
      }

      return res.status(200).json({
        message: 'File uploaded successfully',
        url: data.Location
      });
    } catch (uploadError) {
      
      console.error('Error uploading to S3:', uploadError);
      return res.status(500).json({
        message: 'Failed to upload file',
        error: uploadError.message
      });
    }
};

exports.uploadImageToS3Team = async function(req, res) {
  const user = req.user; 

  const { bucket_name, team_id } = req.body; 

  if (!user) {
    return res.status(401).json({
      message: 'No token found or user is not authenticated',
      info: {}
    });
  }

  console.log(bucket_name);
  console.log(team_id);

  if (bucket_name !== "quitximages"){
    return res.status(401).json({
      message: 'No bucket with this name',
      info: {}
    });
  }

  if (req.file === undefined){
    return res.status(401).json({
      message: 'File is undefined',
      info: {}
    });
  }

  if (team_id === undefined){
    return res.status(401).json({
      message: 'Team id is undefined',
      info: {}
    });
  }

  console.log("start teams");

  const file = req.file;

  const bucketName = bucket_name;
  const fileName = Date.now() + '-' + team_id;

  const params = {
    Bucket: bucketName,
    Key: fileName,
    Body: file.buffer,
    ContentType: file.mimetype
  };

  console.log(params);

  const teamIdObject = new mongoose.Types.ObjectId(team_id);
  var teamExists = await Team.findOne({ _id: teamIdObject });

  if (!teamExists){
    return res.status(401).json({
      message: 'Team is not exists',
      info: {}
    });
  }

 

  console.log("team exists");

  const userIdObject = new mongoose.Types.ObjectId(user._id);

  if (!teamExists.ownerID.equals(userIdObject)){
    return res.status(500).json({ message: "No permissions" });
  }
  console.log("Permisiion hay");


  try {
    const data = await s3.send(new PutObjectCommand(params));
    const imageUrl = data.Location

    console.log(data);

    // Ssend to a review 

    const caption = `<b>Photo Team new. </b> \n\n<b>Team id:</b> ${team_id} \n\n<b>User id:</b> ${user._id}`;

    const options = {
      caption: caption,  // Update your caption as needed
      parse_mode: 'HTML',
      reply_markup: {
          inline_keyboard: [
              [{ text: 'Remove Photo', callback_data: 'remove_photo_team:' + team_id}],
              // [{ text: 'Report User', callback_data: 'report_user:' + user._id}],
              [{ text: 'Reports List', callback_data: 'reports_list_user:' + user._id}],
              [{ text: 'Print ID', callback_data: 'printid_user:' + user._id}],
              // [{ text: 'Block User', callback_data: 'block_user:' + user._id}],
              // [{ text: 'Unblock User', callback_data: 'unblock_user:' + user._id}]
          ]
      }
    };
    
    try {
      (async () => {
          try {
              const buffer = await fetchDataFromS3(bucketName, fileName);

              console.log(buffer);

              bot.sendPhoto("1979434110", buffer, options);

              console.log('Data fetched successfully:', buffer);
          } catch (error) {
              console.error('Failed to fetch data:', error);
          }
      })();
      
    } catch (err){
      console.log(err);
    }

    const imagePreviousKey = teamExists.metadata.imageUrl

    if (imagePreviousKey !== undefined && imagePreviousKey !== ""){
      var paramsDelete = {
        Bucket: "quitximages", 
        Key: imagePreviousKey
      };
  
      try {
        const data = await s3.send(new DeleteObjectCommand(paramsDelete));
        console.log("Success", data);
      } catch (err) {
        console.error("Error", err);
      }
    }

    try {
      
      console.log(teamIdObject);
      console.log(imageUrl);
      const result = await Team.updateOne(
        { _id: teamIdObject }, 
        { $set: { 'metadata.imageUrl': fileName } }
      );

      console.log(result);
      console.log("COUNT MODIFIER");
      console.log(result.modifiedCount);


      if (result.modifiedCount === 1) {
          res.status(200).json({
            message: 'File uploaded successfully',
          });
        } else {
          return res.status(500).json({
            message: 'Failed to upload file',
            error: "Failed to upload file"
          });
        }
    } catch (err) {
      return res.status(500).json({
        message: err,
        error: err
      });
      throw err; 
    }

    
  } catch (uploadError) {
    
    console.error('Error uploading to S3:', uploadError);
    return res.status(500).json({
      message: 'Failed to upload file',
      error: uploadError.message
    });
  }
};


exports.deleteAccount = async function(req, res) {
  const user = req.user;
  if (!user) {
    return res.status(401).json({
      message: "No token found or user is not authenticated",
      info: {}
    });
  }

  try {
    const userId = new mongoose.Types.ObjectId(user._id);

    // Remove user from all communities' members lists
    const teams = await Team.find({ "members.user": userId });

    console.log("TEAMS");
    console.log(teams);

    // Remove user from each team and decrement membersCount
    for (let team of teams) {
      console.log("each team");
      console.log(team._id);
      await Team.findByIdAndUpdate(team._id, {
        $pull: { members: { user: userId } }, // Correctly specify the pull condition
        $inc: { membersCount: -1 } // Decrement membersCount
      });
    }

    console.log("teams deleted");

    // Delete all communities where the user is the owner
    await Team.deleteMany({ ownerID: userId });
    console.log("communities deleted");


    // Remove all reports sent by this user
    await Team.updateMany(
      {},
      { $pull: { reportCounts: { userid: userId } } }
    );
    console.log("reports deleted");



    // Finally, delete the user's account
    await User.findByIdAndDelete(userId);
    console.log("user deleted");
    console.log(userId);
    
    bot.sendMessage("1979434110", "Delete account: " + userId, { parse_mode: 'HTML' });

    return res.status(200).json({
      message: "User account deleted successfully"
    });
  } catch (error) {
    console.error('Error deleting user account:', error);
    return res.status(500).json({
      message: "Failed to delete user account",
      info: {}
    });
  }
};



exports.changeStatuses = async function(req, res) {
  const teamId  = req.params.teamId;
  const { updates } = req.body; 
  
  const user = req.user; 
  if (!user) {
    return res.status(401).json({
      message: "No token found or user is not authenticated",
      info: {}
    });
  }

  console.log("USER OK");

  try {
    const team = await Team.findById(teamId);

    if (!team) {
        return res.status(404).json({ message: "Team not found" });
    }

    const userId = new mongoose.Types.ObjectId(user._id);

    if (!team.ownerID.equals(userId)) {
      return res.status(403).json({
        message: "Unauthorized: Owner can't exit the team",
      });
    }


    // Update each status based on the input
    updates.forEach(update => {
        const { Type, streakDays, maxPeople } = update;
        const statusIndex = team.statuses.findIndex(status => status.statusName === Type);
        if (statusIndex !== -1) {
            team.statuses[statusIndex].minStreakDays = streakDays;
            team.statuses[statusIndex].maxRecipients = maxPeople;
        }
    });

    // Save the updated team
    await team.save();

    return res.status(200).json({
        message: "Status thresholds updated successfully",
    });

  } catch (error) {
      console.error('Error updating statuses:', error);
      return res.status(500).json({
          message: "Failed to update statuses",
      });
  }

};

exports.getMembers = async function(req, res) {
  const { id, page = 1, pageSize = 40 } = req.body; // Team ID and pagination options

  if (!req.user) {
    return res.status(401).json({
      message: "No token found or user is not authenticated",
    });
  }

  try {
  
    const team = await Team.findById(id).populate({
      path: 'members.user',
      select: 'username streak.lastReset streak.dateStart'
    });

    if (!team) {
      return res.status(404).json({
        message: "Team not found",
      });
    }



    // Sorting the members array by rank and slicing for pagination
    const sortedMembers = team.members
      .sort((a, b) => a.rank - b.rank)  // Ensure sorting uses the index if possible
      .slice((page - 1) * pageSize, page * pageSize);


    // Map sorted members to include required data
    const now = new Date();
    const result = sortedMembers
    .filter(member => member.user && member.user.username && member.user.streak && member.user.streak.lastReset)
    .map(member => ({
        username: member.user.username,
        differenceInMinutes: (now - new Date(member.user.streak.lastReset)) / (1000 * 60), // Convert difference to minutes
        rank: member.rank,
        dateStart: member.user.streak.dateStart
    }));

    // Return paginated sorted members
    return res.status(200).json({
      message: "Members retrieved successfully",
      members: result,
      currentPage: page,
      totalPages: Math.ceil(team.members.length / pageSize)
    });

  } catch (error) {
    console.error('Error fetching team members:', error);
    return res.status(500).json({
      message: "Failed to retrieve team members",
      info: error
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
