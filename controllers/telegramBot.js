const TelegramBot = require('node-telegram-bot-api');
const token = process.env.TGKEY;
const bot = new TelegramBot(token, { polling: false });
var mongoose = require('mongoose'),
User = mongoose.model('User'),
Team = mongoose.model('Team');

const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');


const { s3 } = require('./s3controller');

// bot.setWebHook('https://quitnut.app/botWebhook');

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const resp = "Welcome to your bot!"; // Your welcome message
  bot.sendMessage(chatId, resp);
});

// Matches "/help"
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  const resp = "How can I assist you?"; // Help message
  bot.sendMessage(chatId, resp);
});

// Example of a command with a parameter, e.g., "/echo [message]"
bot.onText(/\/echo (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const resp = match[1]; // The captured "message" after /echo
  bot.sendMessage(chatId, resp);
});

function formatReportCounts(reportCounts) {
  if (!reportCounts || reportCounts.length === 0) {
    return "No reports";
  }

  return reportCounts.map((report, index) => {
    return `${index + 1} - Reason: ${report.reason}`;
  }).join('\n');
}


const handleCommands = async (req, res) => {

  res.status(200).send('OK');

  if (req.body.callback_query) {
    return handleInlineButtons(req);
  } else {
    console.log("COMMAND TEXT OAOAOAAOAOAOA");
    console.log(req.body);
    console.log(req.body.message.text);

    if (req.body && req.body.message.text) {
      const tg_id = req.body.message.from.id;
      const first_name = req.body.message.from.first_name;
      console.log("LOL WE");

      if (!(tg_id.toString() === "1979434110" && first_name.toString() === "Andrei")){
        return;
      }

      console.log("LOL WE HERE");


      const text = req.body.message.text.trim().split(' ')[0];  // Get command part before any space
      console.log(text);
      
    // Handle different commands
      switch (text) {
        case '/reportuser':
          const idJoint = req.body.message.text.trim().split(' ')[1];
          const id = idJoint.split(':')[0];

          console.log(id);

          const reason = req.body.message.text.trim().split(':')[1]; 
          const user_reported = new mongoose.Types.ObjectId("66a2031c66d2046ac00fd3ef")

          console.log(user_reported);

          const updatedUser = await User.findByIdAndUpdate(
            id, 
            { $push: { reportCounts: {
              userId: user_reported,
              reason: reason
            } } },
            { new: true, safe: true } 
          );

          bot.sendMessage("1979434110", `${id} reported: ${reason}`);
          break;
        case '/reportteam':
          bot.sendMessage("1979434110", "How can I help you? You can use /start to get started.");
          break;
        case '/banuser':
          const idJoint2 = req.body.message.text.trim().split(' ')[1];
          const id2 = idJoint2.split(':')[0];

          console.log(id2);

          const reason2 = req.body.message.text.trim().split(':')[1]; 
          const user_reported2 = new mongoose.Types.ObjectId("66a2031c66d2046ac00fd3ef")

          console.log(user_reported);

          const updatedUser = await User.findByIdAndUpdate(
            id2, 
            { $set: {
              'banned.status': true,
              'banned.reason': reason2
            } },
            { new: true, safe: true } 
          );

          bot.sendMessage("1979434110", `${id2} banned: ${reason2}`);
          break;
        default:
          bot.sendMessage("1979434110", "Sorry, I didn't understand that command.");
          break;
      }
    }
  }

}

const handleInlineButtons = async (callbackQuery) => {

  console.log("HANDLER");
  // console.log(data);


  // console.log(callbackQuery);
  // console.log("HANDLER2");

  // console.log(callbackQuery.body);
  // console.log("FROM");
  // console.log(callbackQuery.body.callback_query.from);
  // console.log("MESSAGE");
  // console.log(callbackQuery.body.callback_query.message);

  const tg_id = callbackQuery.body.callback_query.from.id;
  const first_name = callbackQuery.body.callback_query.from.first_name;

  const button = callbackQuery.body.callback_query.data; // remove_photo:66702b9a51b3c8d532202972

  console.log(tg_id);
  console.log(first_name);
  console.log(button);

  if (button !== undefined && tg_id.toString() === "1979434110" && first_name.toString() === "Andrei"){

    const button_tag =  button.split(":")[0];
    console.log(button_tag);

    const id_user =  button.split(":")[1];

    console.log(id_user);

    switch(button_tag) {
      case 'remove_photo_user':
          try {
            var userFound = await User.findOne({ _id: id_user });
            console.log(userFound);
            const imageKey = userFound.imageUrl;

            var params = {
              Bucket: "quitximages", 
              Key: imageKey
            };
      
            try {
              const data = await s3.send(new DeleteObjectCommand(params));
              console.log("Success", data);
            } catch (err) {
              console.error("Error", err);
              bot.sendMessage("1979434110", `${err} can't delete photo from s3`);
            }

          } catch (error) {
            console.log(error);
            bot.sendMessage("1979434110", `${error} can't delete photo from s3`);
          }
          
          try {
            await User.updateOne({ _id: id_user }, { $set: { imageUrl: "" } });
          } catch (error) {
            bot.sendMessage("1979434110", `${id_user} can't remove photo`);
          }

          bot.sendMessage("1979434110", `${id_user} removed photo`);
          break;
      // case 'block_user':

      //     try {
      //       // var userFound = await User.findOne({ _id: id_user });
      //       // console.log(userFound);
              
      //       await User.updateOne({ _id: id_user }, { $set: { imageUrl: "" } });

      //     } catch (error) {
      //       console.log(error);
      //       bot.sendMessage("1979434110", `${error} can't block user`);
      //     }

      //     bot.sendMessage("1979434110", `${id_user} block user`);
      //     break;
      case 'reports_list_user':
        var userFound = await User.findOne({ _id: id_user });

        const message = formatReportCounts(userFound.reportCounts);

        try {
          await bot.sendMessage("1979434110", message);
        } catch (error) {
          console.error('Failed to send message:', error);
          await bot.sendMessage("1979434110", error);
        }

        // bot.sendMessage("1979434110", `${id_user} unblock user`);
        break;
      case 'printid_user':
          var userFound = await User.findOne({ _id: id_user });
          
          if (userFound !== undefined){
            await bot.sendMessage("1979434110", id_user);
          } else {
            await bot.sendMessage("1979434110", "No user found");
          }

          break;
    }
  }
};


module.exports = {
  bot,
  handleInlineButtons,
  handleCommands
};