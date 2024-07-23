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

      const userId = new mongoose.Types.ObjectId(find._id);


      let newTeam = new Team({
        ownerID: userId,
        publicname: (type === "Public") ? publicname : generateTeamName(),  // Determine public name based on type
        typeTeam: type,
        metadata: {
          officialUrl: "",
          imageUrl: "",
          description: "",
          title: title,
        },
        members: [{ user: user._id, rank: 1 }] // DONE
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

      if (team.ownerID !== find._id){
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

    console.log(team.ownerID);

    // Check if the current user is the owner of the team
    if (team.ownerID !== uu._id) {
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

    if (team.ownerID !== uu._id) {
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
          priority: 1,
          membersCount: 1,
          typeTeam: 1
        }
      }
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
        "members.user": { $ne: userId }, // DONE
        typeTeam: 'Public', 
        dontaccept: false 
      }},
      {
        $lookup: {
          from: 'users', // This should match the actual name of the collection in MongoDB
          localField: 'members.user',
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

    console.log(teams);


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
    const community = await Team.findById(id).select('ownerID publicname typeTeam dontaccept metadata dontaccept statuses').exec();
    console.log("found?");

    if (!community) {
      return res.status(404).json({ message: "Community not found" });
    }
    const userId = new mongoose.Types.ObjectId(user._id);

    console.log(userId);
    console.log(community.ownerID);

    const isAdmin = community.ownerID.equals(userId);

    let communityData = community.toObject();
    delete communityData.ownerID;

    return res.status(200).json({
      message: "ok",
      info: {
        ...communityData,
        isAdmin: isAdmin        
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
    const memberStreaks = team.members.map(member => ({
        userId: member.user._id,
        streak: (now - new Date(member.user.streak.lastReset)) / (1000 * 60) // Minutes since last reset
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

    // Check if the current user is not the owner of the team
    if (team.ownerID === user._id) {
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

exports.getMembers = async function(req, res) {
  const { id, page = 1, pageSize = 50 } = req.body; // Team ID and pagination options

  if (!req.user) {
    return res.status(401).json({
      message: "No token found or user is not authenticated",
    });
  }

  try {
  
    const team = await Team.findById(id).populate({
      path: 'members.user',
      select: 'username streak.lastReset'
    });

    if (!team) {
      return res.status(404).json({
        message: "Team not found",
      });
    }

    console.log(team);

    // Sorting the members array by rank and slicing for pagination
    const sortedMembers = team.members
      .sort((a, b) => a.rank - b.rank)  // Ensure sorting uses the index if possible
      .slice((page - 1) * pageSize, page * pageSize);

    console.log(sortedMembers);

    // Map sorted members to include required data
    const now = new Date();
    const result = sortedMembers.map(member => ({
      username: member.user.username,
      differenceInMinutes: (now - new Date(member.user.streak.lastReset)) / (1000 * 60), // Convert difference to minutes
      rank: member.rank
    }));

    console.log(result);

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
