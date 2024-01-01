require("dotenv").config();
const { PineconeClient } = require("@pinecone-database/pinecone");
const TelegramBot = require('node-telegram-bot-api');
const { queryPineconeVectorStoreAndQueryLLM } = require("./utils");
const bot1 = new TelegramBot(process.env.BOT1_TOKEN, { polling: true });
const bot2 = new TelegramBot(process.env.BOT2_TOKEN, { polling: true });
const bot3 = new TelegramBot(process.env.BOT3_TOKEN, { polling: true });
const { indexName, BASE_PROMPT1, BASE_PROMPT2, BASE_PROMPT3, BASE_DELAY } = require("./config");

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const triggered = false;

let data1
let data2
let data3

const getdata = async () => {
  data1 = await bot1.getMe()
  data2 = await bot2.getMe()
  data3 = await bot3.getMe()
}

getdata()

const askQuestion = async (prompt, basePrompt, name, reply = null) => {
  try {
    const client = new PineconeClient()
    await client.init({
      apiKey: process.env.PINECONE_API_KEY || '',
      environment: process.env.PINECONE_ENVIRONMENT || ''
    })
    const answer = await queryPineconeVectorStoreAndQueryLLM(client, indexName, prompt, `${basePrompt} ${name} : ${prompt} ${reply ? `in reply to your previous response of ${reply}` : ""}`)
    return answer
  } catch (error) {
    return null
  }
}

const replyToBot3Message = async (question, reply_to_message_id, chat_id) => {
  try {
    const answer = await askQuestion(question, BASE_PROMPT1, data3.first_name)
    const messageSentByBot1 = await bot1.sendMessage(chat_id, answer)
    await sleep(BASE_DELAY)
    await replyToBot1Message(answer, messageSentByBot1.message_id, chat_id)
  } catch (error) {
    console.log(error.message, error.stack)
  }
}

const replyToBot2Message = async (question, reply_to_message_id, chat_id) => {
  try {
    const answer = await askQuestion(question, BASE_PROMPT3, data2.first_name)
    const messageSentByBot3 = await bot3.sendMessage(chat_id, answer)
    await sleep(BASE_DELAY)
    await replyToBot3Message(answer, messageSentByBot3.message_id, chat_id)
  } catch (error) {
    console.log(error.message, error.stack)
  }
}

const replyToBot1Message = async (question, reply_to_message_id, chat_id) => {
  try {
    const answer = await askQuestion(question, BASE_PROMPT2, data1.first_name)
    const messageSentByBot2 = await bot2.sendMessage(chat_id, answer)
    await sleep(BASE_DELAY)
    await replyToBot2Message(answer, messageSentByBot2.message_id, chat_id)
  } catch (error) {
    console.log(error.message, error.stack)
  }
}

bot1.on("message", async (message) => {
  try {

    if (message.reply_to_message) {
      const reply_to_message = message.reply_to_message;
      const replied_to_id = reply_to_message.from.id;
      if (replied_to_id === data1.id) {
        await sleep(BASE_DELAY)
        const answer = await askQuestion(message.text, BASE_PROMPT1, message.from.first_name, reply_to_message.text)
        const message2 = await bot1.sendMessage(message.chat.id, answer, { reply_to_message_id: message.message_id })
      }
      else if (replied_to_id === data2.id) {
        await sleep(BASE_DELAY)
        const answer = await askQuestion(message.text, BASE_PROMPT2, message.from.first_name, reply_to_message.text)
        const message2 = await bot2.sendMessage(message.chat.id, answer, { reply_to_message_id: message.message_id })
      }
      else if (replied_to_id === data3.id) {
        await sleep(BASE_DELAY)
        const answer = await askQuestion(message.text, BASE_PROMPT3, message.from.first_name, reply_to_message.text)
        const message2 = await bot3.sendMessage(message.chat.id, answer, { reply_to_message_id: message.message_id })
      }
    }

    if (triggered === true) return
    if (message.text.toLowerCase().includes("honey") || message.text.toLowerCase().includes("nft") || message.text.toLowerCase().includes("bees")) {
      await sleep(BASE_DELAY)
      const answer = await askQuestion(message.text, BASE_PROMPT1, message.from.first_name)
      const message2 = await bot1.sendMessage(message.chat.id, answer, { reply_to_message_id: message.message_id });
      await replyToBot1Message(answer, message2.message_id, message.chat.id)
      triggered = true
    }
  } catch (error) {

  }
})


bot1.on("message", (message) => {
  console.log("bot1")
})
bot2.on("message", (message) => {
  console.log("bot2")
})
bot2.on("message", (message) => {
  console.log("bot3")
})