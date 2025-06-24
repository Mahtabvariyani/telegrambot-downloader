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
const convertToMP3 = (url) => {
  return new Promise((resolve, reject) => {
    const stream = ytdl(url, { filter: 'audioonly' })
    const tmpFile = path.join(__dirname, 'temp.mp3')

    ffmpeg(stream)
      .audioCodec('libmp3lame')
      .format('mp3')
      .on('end', () => {
        resolve(tmpFile) // Resolving the path to the converted file
      })
      .on('error', (err) => {
        reject(new Error('Error during conversion: ' + err.message))
      })
      .save(tmpFile) // Save the output to a file
  })
}

bot.on('message:text', async (ctx) => {
  const messageText = ctx.message.text
  const youtubeUrlPattern = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+|(?:v|e(?:mbed)?)\/(\S+))|youtu\.be\/(\S+))/g
  const youtubeUrlMatch = messageText.match(youtubeUrlPattern)

  if (youtubeUrlMatch && youtubeUrlMatch[0]) {
    const url = youtubeUrlMatch[0]

    try {
      await ctx.reply('Processing your request, this might take a while...')
      
      // Convert the YouTube video to MP3
      const tmpFile = await convertToMP3(url)

      // Send the MP3 file as a response
      await ctx.replyWithAudio({ media: fs.createReadStream(tmpFile) })
      
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
