const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const mongoose = require('mongoose');

// Replace with your bot token from @BotFather
const BOT_TOKEN = '8244070630:AAHR90BB9vmy76DQDKL0ovbqwEDSo7fipx8';
const WEBAPP_URL = 'https://subway-game-pearl.vercel.app/'; // Will be your deployed game URL

// MongoDB connection (replace with your MongoDB Atlas connection string)
const MONGODB_URI = 'mongodb+srv://gamebot:<Imronbek06>@cluster0.lvew5ce.mongodb.net/';

// Initialize bot
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// Initialize express app for webhooks (optional)
const app = express();
app.use(express.json());

// Connect to MongoDB
mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Connected to MongoDB');
}).catch(err => {
    console.error('MongoDB connection error:', err);
});

// User score schema
const UserSchema = new mongoose.Schema({
    telegramId: { type: String, unique: true, required: true },
    username: String,
    firstName: String,
    highScore: { type: Number, default: 0 },
    totalCoins: { type: Number, default: 0 },
    gamesPlayed: { type: Number, default: 0 },
    lastPlayed: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);

// Bot commands
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const user = msg.from;

    try {
        // Save or update user
        await User.findOneAndUpdate(
            { telegramId: user.id.toString() },
            {
                username: user.username,
                firstName: user.first_name,
                $inc: { gamesPlayed: 0 } // Don't increment on start
            },
            { upsert: true, new: true }
        );

        const welcomeMessage = `
🚇 *Welcome to Subway Surfers Bot Game!*

Hey ${user.first_name}! Ready to surf the rails?

🎮 *How to Play:*
• Swipe or use arrow buttons to move
• Jump to avoid obstacles
• Collect coins for points
• Beat your high score!

🏆 *Commands:*
/play - Start the game
/stats - View your statistics
/leaderboard - See top players
/help - Show this help message

Let's start surfing! 🏃‍♂️💨
        `;

        const keyboard = {
            inline_keyboard: [
                [{ text: '🎮 Play Game', web_app: { url: WEBAPP_URL } }],
                [
                    { text: '📊 Stats', callback_data: 'stats' },
                    { text: '🏆 Leaderboard', callback_data: 'leaderboard' }
                ]
            ]
        };

        await bot.sendMessage(chatId, welcomeMessage, {
            parse_mode: 'Markdown',
            reply_markup: keyboard
        });

    } catch (error) {
        console.error('Error in /start command:', error);
        bot.sendMessage(chatId, 'Sorry, there was an error. Please try again!');
    }
});

bot.onText(/\/play/, async (msg) => {
    const chatId = msg.chat.id;

    const keyboard = {
        inline_keyboard: [
            [{ text: '🚇 Launch Game', web_app: { url: WEBAPP_URL } }]
        ]
    };

    await bot.sendMessage(chatId, '🎮 *Ready to surf?*\n\nClick the button below to start playing!', {
        parse_mode: 'Markdown',
        reply_markup: keyboard
    });
});

bot.onText(/\/stats/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();

    try {
        const user = await User.findOne({ telegramId: userId });

        if (!user) {
            return bot.sendMessage(chatId, 'No stats found! Play the game first with /play');
        }

        const statsMessage = `
📊 *Your Game Statistics*

👤 Player: ${user.firstName || 'Anonymous'}
🏆 High Score: ${user.highScore.toLocaleString()}
🪙 Total Coins: ${user.totalCoins.toLocaleString()}
🎮 Games Played: ${user.gamesPlayed}
📅 Last Played: ${user.lastPlayed.toLocaleDateString()}

Keep playing to improve your stats! 🚀
        `;

        const keyboard = {
            inline_keyboard: [
                [{ text: '🎮 Play Again', web_app: { url: WEBAPP_URL } }],
                [{ text: '🏆 Leaderboard', callback_data: 'leaderboard' }]
            ]
        };

        await bot.sendMessage(chatId, statsMessage, {
            parse_mode: 'Markdown',
            reply_markup: keyboard
        });

    } catch (error) {
        console.error('Error getting stats:', error);
        bot.sendMessage(chatId, 'Error retrieving stats. Please try again!');
    }
});

bot.onText(/\/leaderboard/, async (msg) => {
    const chatId = msg.chat.id;

    try {
        const topUsers = await User.find()
            .sort({ highScore: -1 })
            .limit(10);

        if (topUsers.length === 0) {
            return bot.sendMessage(chatId, 'No players yet! Be the first to play! 🚀');
        }

        let leaderboardMessage = '🏆 *TOP 10 PLAYERS* 🏆\n\n';

        topUsers.forEach((user, index) => {
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
            leaderboardMessage += `${medal} ${user.firstName || 'Anonymous'}\n`;
            leaderboardMessage += `   Score: ${user.highScore.toLocaleString()}\n`;
            leaderboardMessage += `   Coins: ${user.totalCoins.toLocaleString()}\n\n`;
        });

        const keyboard = {
            inline_keyboard: [
                [{ text: '🎮 Beat Their Score!', web_app: { url: WEBAPP_URL } }]
            ]
        };

        await bot.sendMessage(chatId, leaderboardMessage, {
            parse_mode: 'Markdown',
            reply_markup: keyboard
        });

    } catch (error) {
        console.error('Error getting leaderboard:', error);
        bot.sendMessage(chatId, 'Error loading leaderboard. Please try again!');
    }
});

bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;

    const helpMessage = `
🚇 *Subway Surfers Bot Game Help*

🎮 *Commands:*
/play - Start the game
/stats - View your statistics
/leaderboard - See top players
/help - Show this help

🕹️ *Game Controls:*
• ← → Arrow buttons to move left/right
• ↑ Button to jump
• Or swipe on mobile!

🎯 *Gameplay:*
• Avoid obstacles by moving or jumping
• Collect coins for extra points
• Game speed increases over time
• Beat your high score!

🏆 *Scoring:*
• +10 points for passing obstacles
• +50 points for each coin
• Bonus points for long runs

Good luck surfing! 🏃‍♂️💨
    `;

    const keyboard = {
        inline_keyboard: [
            [{ text: '🎮 Play Now', web_app: { url: WEBAPP_URL } }]
        ]
    };

    bot.sendMessage(chatId, helpMessage, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
    });
});

// Handle callback queries
bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;
    const userId = query.from.id.toString();

    try {
        await bot.answerCallbackQuery(query.id);

        switch (data) {
            case 'stats':
                // Trigger stats command
                bot.emit('message', {
                    chat: { id: chatId },
                    from: query.from,
                    text: '/stats'
                });
                break;

            case 'leaderboard':
                // Trigger leaderboard command
                bot.emit('message', {
                    chat: { id: chatId },
                    text: '/leaderboard'
                });
                break;
        }
    } catch (error) {
        console.error('Error handling callback query:', error);
    }
});

// Handle web app data (game scores)
bot.on('web_app_data', async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    
    try {
        const gameData = JSON.parse(msg.web_app_data.data);
        const { score, coins } = gameData;

        // Update user stats
        const user = await User.findOneAndUpdate(
            { telegramId: userId },
            {
                $max: { highScore: score }, // Only update if new score is higher
                $inc: { 
                    totalCoins: coins,
                    gamesPlayed: 1 
                },
                lastPlayed: new Date(),
                username: msg.from.username,
                firstName: msg.from.first_name
            },
            { upsert: true, new: true }
        );

        // Check if it's a new high score
        const isNewHighScore = score >= user.highScore;
        
        let resultMessage = `🎮 *Game Over!*\n\n`;
        resultMessage += `📊 Your Score: ${score.toLocaleString()}\n`;
        resultMessage += `🪙 Coins Earned: ${coins.toLocaleString()}\n`;
        
        if (isNewHighScore) {
            resultMessage += `\n🎉 *NEW HIGH SCORE!* 🎉\n`;
        } else {
            resultMessage += `\n🏆 High Score: ${user.highScore.toLocaleString()}\n`;
        }
        
        resultMessage += `💰 Total Coins: ${user.totalCoins.toLocaleString()}\n`;
        resultMessage += `🎯 Games Played: ${user.gamesPlayed}`;

        const keyboard = {
            inline_keyboard: [
                [{ text: '🔄 Play Again', web_app: { url: WEBAPP_URL } }],
                [
                    { text: '📊 Stats', callback_data: 'stats' },
                    { text: '🏆 Leaderboard', callback_data: 'leaderboard' }
                ]
            ]
        };

        await bot.sendMessage(chatId, resultMessage, {
            parse_mode: 'Markdown',
            reply_markup: keyboard
        });

    } catch (error) {
        console.error('Error processing game data:', error);
        bot.sendMessage(chatId, 'Error saving your score. Please try again!');
    }
});

// Error handling
bot.on('error', (error) => {
    console.error('Bot error:', error);
});

// Start express server (for webhooks if needed)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Bot server running on port ${PORT}`);
});

console.log('Subway Surfers Bot is running...');
