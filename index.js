const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildInvites,
  ],
});

// Chargement des modules
require('./rayuna')(client);
require('./street-nova')(client);
require('./topia-fr');

client.once('ready', () => {
  console.log(`✅ Bot connecté en tant que ${client.user.tag}`);
});

client.login(process.env.BOT_TOKEN);
