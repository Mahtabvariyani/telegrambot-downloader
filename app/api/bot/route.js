const { Bot, webhookCallback } = require('grammy');
const ytdl = require('ytdl-core');
const { PassThrough } = require('stream'); // To convert the stream
const fs = require('fs');

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error('TELEGRAM_BOT_TOKEN environment variable not found.');

const bot = new Bot(token);

// Function to send the main menu with options
const sendMainMenu = async (ctx) => {
  const options = {
    reply_markup: {
      inline_keyboard: [
        [{ text: 'URL to MP3', callback_data: 'mp3' }],
        [{ text: 'URL to Video', callback_data: 'video' }],
        [{ text: 'JPEG to PDF', callback_data: 'jpeg_to_pdf' }],
      ],
    },
  };
  await ctx.reply('Choose an option:', options);
};

// Function to stream YouTube audio (without saving the file)
const streamAudio = (url) => {
  const audioStream = ytdl(url, { filter: 'audioonly' });
  const passthrough = new PassThrough();
  audioStream.pipe(passthrough); // Pipe the audio stream to a pass-through stream
  return passthrough;
};

bot.on('message', async (ctx) => {
  if (ctx.message.text === '/start') {
    await sendMainMenu(ctx); // Show the main menu when the user starts the bot
  }
});

bot.on('callback_query', async (ctx) => {
  const data = ctx.callbackQuery.data;

  if (data === 'mp3') {
    // Prompt the user to send a YouTube URL
    await ctx.reply('Please send a YouTube URL to convert to MP3.');

    // Collect the YouTube URL from the user
    bot.once('message:text', async (ctx) => {
      const youtubeUrl = ctx.message.text; // Get the URL sent by the user
      try {
        await ctx.reply('Processing your request...');

        // Stream the audio directly from YouTube
        const audioStream = streamAudio(youtubeUrl);

        // Send the audio stream directly to the user as MP3
        await ctx.replyWithAudio({
          media: audioStream,
          caption: 'Here is your MP3 file from the YouTube URL.',
        });

        // After sending the audio, show the main menu again
        await sendMainMenu(ctx);
      } catch (error) {
        await ctx.reply('There was an error processing your request: ' + error.message);
      }
    });
  } else if (data === 'video') {
    await ctx.reply('Please send a YouTube URL to download the video.');
    // Handle video download here (similar to MP3 option)
  } else if (data === 'jpeg_to_pdf') {
    await ctx.reply('Please send a JPEG file to convert to PDF.');
    bot.once('message', async (ctx) => {
      // Handle JPEG to PDF conversion here
    });
  }
});

module.exports.POST = webhookCallback(bot, 'std/http');
