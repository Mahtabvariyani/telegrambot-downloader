// Load environment variables from .env file
require('dotenv').config();

const { Telegraf } = require('telegraf');  // Import Telegraf
const ytdl = require('ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');

// Create your bot instance (replace YOUR_BOT_TOKEN with the environment variable)
const bot = new Telegraf(process.env.BOT_TOKEN);

// Function to download and convert YouTube audio to MP3
async function downloadAndConvertToMP3(url, outputFilePath) {
  return new Promise((resolve, reject) => {
    const stream = ytdl(url, { filter: 'audioonly' });

    ffmpeg(stream)
      .audioCodec('libmp3lame')
      .audioBitrate(192)
      .save(outputFilePath)
      .on('end', () => resolve(outputFilePath))
      .on('error', (err) => reject(err));  // Specify the type for 'err'
  });
}

// Command: /start - Greets the user
bot.start((ctx) => {
  ctx.reply('Hi! Send me a YouTube link and I will convert it to MP3 for you.');
});

// Command: Handle text messages (assuming the text is a YouTube URL)
bot.on('text', async (ctx) => {
  const message = ctx.message;

  // Check if the message is a text message (not an animation or other type)
  if (message && message.text && typeof message.text === 'string') {
    const url = message.text;

    if (ytdl.validateURL(url)) {
      try {
        ctx.reply('Downloading and converting your YouTube video to MP3, please wait...');

        const outputFilePath = path.join(__dirname, 'downloads', `${Date.now()}.mp3`);

        // Download and convert the YouTube audio to MP3
        await downloadAndConvertToMP3(url, outputFilePath);

        // Send the converted MP3 file to the user
        await ctx.replyWithAudio({ source: fs.createReadStream(outputFilePath) });

        // Clean up the file after sending it
        fs.unlinkSync(outputFilePath);

      } catch (error) {
        console.error(error);
        ctx.reply('Sorry, there was an error processing your request.');
      }
    } else {
      ctx.reply('Please send a valid YouTube URL.');
    }
  } else {
    ctx.reply('Please send a valid message with a YouTube URL.');
  }
});

// Start the bot
bot.launch();

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
