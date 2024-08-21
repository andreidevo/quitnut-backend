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
  const data = callbackQuery.data;
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;

  console.log("HANDLER");
  console.log(data);
  console.log(chatId);
  console.log(messageId);

  if (chatId === "1979434110"){
    switch(data) {
      case 'remove_photo':
          bot.sendMessage("1979434110", 'remove_photo pressed');
          break;
      case 'block_user':
          bot.sendMessage("1979434110", 'block_user pressed');
          break;
    }
  }
};


module.exports = {
  bot,
  handleInlineButtons 
};