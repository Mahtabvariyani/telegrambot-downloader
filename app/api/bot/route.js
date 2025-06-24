const { Bot, webhookCallback } = require('grammy');
const ytdl = require('ytdl-core');
const { PassThrough } = require('stream'); // To convert the stream

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error('TELEGRAM_BOT_TOKEN environment variable not found.');

const bot = new Bot(token);

// Function to stream YouTube audio (without saving the file)
const streamAudio = (url) => {
  const audioStream = ytdl(url, { filter: 'audioonly' }); // Stream audio only
  const passthrough = new PassThrough();
  audioStream.pipe(passthrough); // Pipe the audio stream to a pass-through stream
  return passthrough;
};

bot.on('message:text', async (ctx) => {
  const messageText = ctx.message.text;
  const youtubeUrlPattern = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+|(?:v|e(?:mbed)?)\/(\S+))|youtu\.be\/(\S+))/g;
  const youtubeUrlMatch = messageText.match(youtubeUrlPattern);

  if (youtubeUrlMatch && youtubeUrlMatch[0]) {
    const url = youtubeUrlMatch[0];

    try {
      await ctx.reply('Processing your request, this might take a while...');

      // Stream the audio directly from YouTube
      const audioStream = streamAudio(url);

      // Send the audio stream directly to the user as MP3
      await ctx.replyWithAudio({ media: audioStream });

    } catch (error) {
      await ctx.reply('There was an error processing your request: ' + error.message);
    }
  } else {
    await ctx.reply('Please send a valid YouTube URL.');
  }
});

module.exports.POST = webhookCallback(bot, 'std/http');
