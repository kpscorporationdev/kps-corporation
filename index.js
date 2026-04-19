const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ],
});

// Chargement des modules
require('./bienvenue-rayuna')(client);
require('./reglement-rayuna')(client);
require('./autoroles-rayuna')(client);
require('./bienvenue-streetnova')(client);

client.once('ready', () => {
  console.log(`✅ Bot connecté en tant que ${client.user.tag}`);
});

client.login(process.env.BOT_TOKEN);
