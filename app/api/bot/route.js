export const dynamic = 'force-dynamic'

export const fetchCache = 'force-no-store'

import { Bot, webhookCallback } from 'grammy'
import ytdl from 'ytdl-core'
import ffmpeg from 'fluent-ffmpeg'
import fs from 'fs'
import path from 'path'
import { pipeline } from 'stream/promises'

const token = process.env.TELEGRAM_BOT_TOKEN

if (!token) throw new Error('TELEGRAM_BOT_TOKEN environment variable not found.')

const bot = new Bot(token)

// Function to convert YouTube URL to MP3
const convertToMP3 = async (url) => {
  const stream = ytdl(url, { filter: 'audioonly' })
  const output = new (require('stream')).Readable()
  ffmpeg(stream)
    .audioCodec('libmp3lame')
    .format('mp3')
    .on('error', (err) => {
      throw new Error('Error during conversion: ' + err.message)
    })
    .pipe(output, { end: true })
  return output
}

bot.on('message:text', async (ctx) => {
  const messageText = ctx.message.text
  const youtubeUrlPattern = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+|(?:v|e(?:mbed)?)\/(\S+))|youtu\.be\/(\S+))/g
  const youtubeUrlMatch = messageText.match(youtubeUrlPattern)

  if (youtubeUrlMatch && youtubeUrlMatch[0]) {
    const url = youtubeUrlMatch[0]

    try {
      await ctx.reply('Processing your request, this might take a while...')
      const mp3Stream = await convertToMP3(url)

      // You can save the MP3 to a temporary file or send the stream directly
      const tmpFile = path.join(__dirname, 'temp.mp3')
      const writableStream = fs.createWriteStream(tmpFile)
      await pipeline(mp3Stream, writableStream)

      // Send the MP3 file as a response
      await ctx.replyWithAudio({ media: tmpFile })
      
      // Optionally clean up the temporary file after sending
      fs.unlinkSync(tmpFile)

    } catch (error) {
      await ctx.reply('There was an error processing your request: ' + error.message)
    }
  } else {
    await ctx.reply('Please send a valid YouTube URL.')
  }
})

export const POST = webhookCallback(bot, 'std/http')
