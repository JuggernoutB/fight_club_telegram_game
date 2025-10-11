'''
from telegram import ReplyKeyboardMarkup, KeyboardButton, WebAppInfo
from telegram.ext import Application, CommandHandler

# Replace with your actual bot token from BotFather
BOT_TOKEN = "7590324798:AAFG7smBZ7NHpskMt3wbeXy721xzuHn5Ho8"

# Command handler for /start
async def start(update, context):
    keyboard = [
        [KeyboardButton("📲 Open WebApp", web_app=WebAppInfo(url="https://2e5f-185-67-82-210.ngrok-free.app"))]
    ]
    reply_markup = ReplyKeyboardMarkup(keyboard, resize_keyboard=True, one_time_keyboard=True)
    await update.message.reply_text("Click the button to open the WebApp!", reply_markup=reply_markup)

# Main application entry point
if __name__ == '__main__':
    app = Application.builder().token(BOT_TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    print("Bot is running...")
    app.run_polling()
'''


import telebot
from telebot import types

# Replace this with your real bot token
bot = telebot.TeleBot('7590324798:AAFG7smBZ7NHpskMt3wbeXy721xzuHn5Ho8')

@bot.message_handler(commands=['start'])
def startHandler(message):
    markup = types.InlineKeyboardMarkup()
    web_app_info = types.WebAppInfo("https://9a92e6192ea9.ngrok-free.app")  # <-- your ngrok URL
    web_app_button = types.InlineKeyboardButton("🎮 Open Game", web_app=web_app_info)
    markup.add(web_app_button)

    bot.send_message(message.chat.id, f"Hello {message.from_user.first_name}! Press the button below to open the game:", reply_markup=markup)

bot.polling(none_stop=True)



