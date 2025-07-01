import TelegramBot from 'node-telegram-bot-api';
import ytdlp from 'yt-dlp-exec';
import ffmpegPath from 'ffmpeg-static';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';

ffmpeg.setFfmpegPath(ffmpegPath);

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!global.botInstance) {
  global.botInstance = new TelegramBot(token, { polling: true });
}

const bot = global.botInstance;

const downloadDir = path.resolve('./public/downloads');

if (!fs.existsSync(downloadDir)) {
  fs.mkdirSync(downloadDir, { recursive: true });
}

bot.onText(/^(https?:\/\/[^\s]+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const url = match[1];

  bot.sendMessage(chatId, 'Choose format:', {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🎥 Video', callback_data: `video|${url}` },
          { text: '🎵 MP3', callback_data: `audio|${url}` },
        ],
      ],
    },
  });
});

bot.on('callback_query', async (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const [type, url] = callbackQuery.data.split('|');

  bot.answerCallbackQuery(callbackQuery.id);

  try {
    const outputFile = `${Date.now()}_${type === 'audio' ? 'audio.mp3' : 'video.mp4'}`;
    const filePath = path.join(downloadDir, outputFile);

    if (type === 'video') {
      await ytdlp(url, {
        output: filePath,
        format: 'mp4',
      });

      await bot.sendVideo(chatId, filePath);
    } else if (type === 'audio') {
      const tempVideo = filePath.replace('.mp3', '.temp.mp4');
      await ytdlp(url, {
        output: tempVideo,
        format: 'bestaudio',
      });

      await new Promise((resolve, reject) => {
        ffmpeg(tempVideo)
          .noVideo()
          .audioCodec('libmp3lame')
          .save(filePath)
          .on('end', resolve)
          .on('error', reject);
      });

      await bot.sendAudio(chatId, filePath);
      fs.unlinkSync(tempVideo);
    }

    fs.unlinkSync(filePath); // Delete after sending
  } catch (error) {
    console.error(error);
    bot.sendMessage(chatId, '⚠️ Failed to download or convert the media.');
  }
});

export default function handler(req, res) {
  res.status(200).send('Telegram bot running');
}
