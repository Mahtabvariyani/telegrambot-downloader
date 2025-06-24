const { Bot, webhookCallback } = require('grammy');
const ytdl = require('ytdl-core');
const fs = require('fs');
const path = require('path');

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error('TELEGRAM_BOT_TOKEN environment variable not found.');

const bot = new Bot(token);

// Function to download YouTube audio (without ffmpeg)
const downloadAudio = async (url) => {
  const audioStream = ytdl(url, { filter: 'audioonly' }); // Stream audio only
  const tmpFile = path.join('/tmp', 'temp.webm'); // Save to '/tmp' for serverless environments

  // Save the stream to a file
  const writeStream = fs.createWriteStream(tmpFile);
  audioStream.pipe(writeStream);

  return new Promise((resolve, reject) => {
    writeStream.on('finish', () => resolve(tmpFile));
    writeStream.on('error', reject);
  });
};

bot.on('message:text', async (ctx) => {
  const messageText = ctx.message.text;
  const youtubeUrlPattern = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+|(?:v|e(?:mbed)?)\/(\S+))|youtu\.be\/(\S+))/g;
  const youtubeUrlMatch = messageText.match(youtubeUrlPattern);

  if (youtubeUrlMatch && youtubeUrlMatch[0]) {
    const url = youtubeUrlMatch[0];

    try {
      await ctx.reply('Processing your request, this might take a while...');

      // Download the YouTube audio as a .webm file
      const tmpFile = await downloadAudio(url);

      // Send the downloaded audio file back to the user
      await ctx.replyWithAudio({ media: fs.createReadStream(tmpFile) });

      // Optionally clean up the temporary file after sending
      fs.unlinkSync(tmpFile);
    } catch (error) {
      await ctx.reply('There was an error processing your request: ' + error.message);
    }
  } else {
    await ctx.reply('Please send a valid YouTube URL.');
  }
});

module.exports.POST = webhookCallback(bot, 'std/http');
