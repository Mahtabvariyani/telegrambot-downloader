import TelegramBot from 'node-telegram-bot-api';
import ytdl from 'ytdl-core';
import fs from 'fs';
import path from 'path';

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

  if (!ytdl.validateURL(url)) {
    return bot.sendMessage(chatId, '❌ This link is not a valid YouTube URL.');
  }

  bot.sendMessage(chatId, 'Choose format:', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🎥 Video', callback_data: `video|${url}` }],
        [{ text: '❌ Cancel', callback_data: `cancel` }],
      ],
    },
  });
});

bot.on('callback_query', async (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;

  if (data === 'cancel') {
    bot.answerCallbackQuery(callbackQuery.id, { text: 'Cancelled.' });
    return;
  }

  const [type, url] = data.split('|');
  const id = Date.now();
  const filePath = path.join(downloadDir, `${id}.mp4`);

  bot.answerCallbackQuery(callbackQuery.id, { text: 'Downloading...' });

  try {
    const stream = ytdl(url, { quality: '18' }); // 18 = mp4 360p
    const writeStream = fs.createWriteStream(filePath);

    stream.pipe(writeStream);

    writeStream.on('finish', async () => {
      await bot.sendVideo(chatId, filePath);
      fs.unlinkSync(filePath);
    });

    stream.on('error', () => {
      bot.sendMessage(chatId, '❌ Failed to download video.');
    });
  } catch (err) {
    console.error(err);
    bot.sendMessage(chatId, '❌ Error downloading the video.');
  }
});

export default function handler(req, res) {
  res.status(200).send('Telegram bot (YouTube only) is running.');
}
