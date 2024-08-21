'use strict';



var mongoose = require('mongoose'),
jwt = require('jsonwebtoken'),
Report = mongoose.model('Report');

const { bot }  = require('./telegramBot');


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
    feeling: "How do you feel after filling this form?",
    streak: "⌛️Previous streak",
    time: "🕐 Time"
  };

  let messageText = '<b>🔥NEW REPORT:</b>\n\n';

  for (const key in reportData) {
    console.log(key);
    if (reportData.hasOwnProperty(key) && keyMap[key]) {
      if (key === "time"){
        messageText += `🕐 Time: ${reportData[key]}\n`;

      } else if (key === "streak"){

        const averageMonthSeconds = 28 * 24 * 3600;
        const months = Math.floor(reportData[key] / averageMonthSeconds);
        const days = Math.floor(reportData[key] / (24 * 3600));
        const hours = Math.floor((reportData[key] % (24 * 3600)) / 3600);
        const minutes = Math.floor((reportData[key] % 3600) / 60);

        let resultString = `${months}M ${days}D ${hours}H ${minutes}M`;

        if (hours === 0 && minutes === 0 && days === 0 && months === 0){
          resultString = `${reportData[key]} Seconds`;
        }

        messageText += `⌛️ Previous streak: ${resultString}\n\n`;

        messageText +=  `<b>🪪 uuid: </b>${uuid}\n\n`;

      } else if (key === "language"){
        messageText += `<b>User's Language: </b>${reportData[key]}\n\n`;
      } else if (key === "feeling"){
        messageText += `<b>Feedback: </b>${reportData[key]}\n`;
      } else if (key === "more_questions"){

        const resultString = (reportData[key] == false) ? "❌" : "✅";

        messageText += `<b>More questions: </b>${resultString}\n`;
      } else {
        messageText += `<b>${keyMap[key]}: </b>\n${reportData[key]}\n\n`;
      }
      
    } else {
      messageText += `<b>${key}: </b>\n${reportData[key]}\n\n`;
    }
  }




  bot.sendMessage("1979434110", messageText, { parse_mode: 'HTML' });
  bot.sendMessage("1401236082", messageText, { parse_mode: 'HTML' });

  return res.status(200).send('ok');
};


exports.send_report_token = async function(req, res) {

  var user = req.user;

  const report = req.body.report
  const uuid = req.body.uuid;

  if (typeof report !== 'string' || report.length > 2000) {
    return res.status(400).send('Invalid report');
  }

  const newReport = new Report({
    ownerID: req.user._id,
    data: report, 
    uuid: uuid
  });

  const savedReport = await newReport.save();

  return res.status(200).send('ok');
};
