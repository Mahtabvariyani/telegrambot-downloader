import { Telegraf } from 'telegraf';
import ytdl from 'ytdl-core';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Initialize the bot using the token from the environment variable
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
      .on('error', (err) => reject(err));
  });
}

// Handle the webhook requests from Telegram (using Next.js API route)
export async function POST(req, res) {
  try {
    const update = req.body;

    if (update.message && update.message.text) {
      const message = update.message;
      const url = message.text;

      // Check if the URL is a valid YouTube URL
      if (ytdl.validateURL(url)) {
        const outputFilePath = path.join('/tmp', `${Date.now()}.mp3`); // Use /tmp for Vercel deployment
        
        // Download and convert to MP3
        await downloadAndConvertToMP3(url, outputFilePath);

        // Send the MP3 file back to the user
        await bot.telegram.sendAudio(message.chat.id, { source: fs.createReadStream(outputFilePath) });

        // Clean up the temporary file after sending it
        fs.unlinkSync(outputFilePath);
      } else {
        await bot.telegram.sendMessage(message.chat.id, 'Please send a valid YouTube URL.');
      }
    }

    res.status(200).send('OK'); // Respond to Telegram with a 200 OK
  } catch (error) {
    console.error('Error processing the webhook:', error);
    res.status(500).send('Internal Server Error');
  }
}
