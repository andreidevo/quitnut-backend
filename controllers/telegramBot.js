const TelegramBot = require('node-telegram-bot-api');
const token = process.env.TGKEY;
const bot = new TelegramBot(token, { polling: false });



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

  if (button !== undefined && tg_id === "1979434110"){

    const button_tag =  button.split(":")[0];
    const id_user =  button.split(":")[1];


    switch(button_tag) {
      case 'remove_photo_user':
          bot.sendMessage("1979434110", `${id_user} remove photo`);
          break;
      case 'block_user':
          bot.sendMessage("1979434110", `${id_user} block user`);
          break;
      case 'unblock_user':
        bot.sendMessage("1979434110", `${id_user} unblock user`);
        break;
    }
  }
};


module.exports = {
  bot,
  handleInlineButtons 
};