'use strict';



var mongoose = require('mongoose'),
jwt = require('jsonwebtoken'),
bcrypt = require('bcrypt');
const TelegramBot = require('node-telegram-bot-api');

const token = '7061820740:AAG-5fpyRDyx__dSSSHTj8UhBs58YatB_Ys';
const bot = new TelegramBot(token);


exports.send_report = async function(req, res) {
  const report = req.body.report
  const apiToken = req.headers['api-token'];
  const uuid = req.headers['uuid'];

  console.log(report);
  
  // Validate and sanitize input
  if (typeof report !== 'string' || report.length > 2000) {
    return res.status(400).send('Invalid report');
  }

  if (apiToken !== process.env.reportKey) {
    return res.status(405);
  }

  let reportData;
  try {
    reportData = JSON.parse(report);
  } catch (e) {
    return res.status(400).send('Report is not valid JSON');
  }

  const keyMap = {
    brief: "Brief description, why it happened?",
    prevent: "What can you do to prevent this?",
    action: "What Positive action you will do now?",
    more_questions: "More questions?",
    stoppers: "What do you think been stopping you from quitting this addiction?",
    sacrifices: "What are you willing to sacrifice in order to overcome this addiction?",
    language: "User's Language",
    reason: "What were the main triggers?",
    feeling: "How do you feel after filling this form?"
  };

  let messageText = '<b>NEW REPORT:</b>\n';
  messageText +=  `<b>uuid: </b>${uuid}\n\n`;

  for (const key in reportData) {
    if (reportData.hasOwnProperty(key) && keyMap[key]) {
      messageText += `<b>${keyMap[key]}: </b>\n${reportData[key]}\n\n`;
    } else {
      messageText += `<b>${key}: </b>\n${reportData[key]}\n\n`;
    }
  }


  bot.sendMessage("1979434110", messageText, { parse_mode: 'HTML' });
  bot.sendMessage("1401236082", messageText, { parse_mode: 'HTML' });

  return res.status(200).send('ok');
};

