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


const handleCommands = async (update) => {
  if (update.body.callback_query) {
    return handleInlineButtons(update);
  } else {
    console.log("COMMAND TEXT OAOAOAAOAOAOA");
    console.log(update.body);
    console.log(update.body.message.text);

    if (update.body && update.body.message.text) {
      const tg_id = update.body.message.from.id;
      const first_name = update.body.message.from.first_name;
      
      if (!(tg_id.toString() === "1979434110" && first_name.toString() === "Andrei")){
        return;
      }


      const text = update.body.message.text.trim().split(' ')[0];  // Get command part before any space
      
    // Handle different commands
      switch (text) {
        case '/reportuser':
          bot.sendMessage("1979434110", "Welcome to the bot!");
          break;
        case '/reportteam':
          bot.sendMessage("1979434110", "How can I help you? You can use /start to get started.");
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