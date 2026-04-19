const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

// ══════════════════════════════════════════
//   CONFIGURATION — STREETNOVA
// ══════════════════════════════════════════
const GUILD_ID          = '1432658174967677033';
const CHANNEL_ID        = '1432658603273097216';
const ROLE_REGLEMENT_ID = '1495033427949392013';
const COMMANDE          = '!reglement-streetnova';

// ══════════════════════════════════════════
//   MODULE
// ══════════════════════════════════════════
module.exports = function(client) {

  // ── Commande : envoie l'embed règlement ──
  client.on('messageCreate', async function(message) {
    if (message.guild?.id !== GUILD_ID) return;
    if (message.channel.id !== CHANNEL_ID) return;
    if (message.content !== COMMANDE) return;

    // Supprime le message de la commande immédiatement
    await message.delete().catch(() => {});

    // Vérifie que c'est bien le propriétaire du serveur
    const guild = message.guild;
    if (message.author.id !== guild.ownerId) return;

    const embed = new EmbedBuilder()
      .setTitle('📋 Règlement du Serveur')
      .setDescription(
        '**Bienvenue sur le serveur ! Merci de lire et respecter les règles suivantes :**\n\n' +
        '🟦 **1 Respectez tout le monde**\n' +
        'Aucune insulte, discrimination ou harcèlement ne sera toléré.\n\n' +
        '🟦 **2 Pas de spam**\n' +
        'Évitez les messages répétitifs, les majuscules excessives et les floods.\n\n' +
        '🟦 **3 Pas de publicité**\n' +
        'Toute publicité non autorisée est interdite.\n\n' +
        '🟦 **4 Contenu approprié**\n' +
        'Aucun contenu NSFW, choquant ou illégal ne sera toléré.\n\n' +
        '🟦 **5 Respectez les salons**\n' +
        'Utilisez chaque salon pour son usage prévu.\n\n' +
        '🟦 **6 Pas d\'usurpation d\'identité**\n' +
        'Il est interdit de se faire passer pour un autre membre ou un staff.\n\n' +
        '🟦 **7 Suivez les directives de Discord**\n' +
        'Les [CGU de Discord](https://discord.com/terms) s\'appliquent sur ce serveur.\n\n' +
        '*En cliquant sur le bouton ci-dessous, vous acceptez le règlement et obtenez l\'accès au serveur.*'
      )
      .setColor(0x7C3AED)
      .setFooter({ text: 'Cliquez sur le bouton pour accepter le règlement' })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('accepter_reglement_streetnova')
        .setLabel('✅ Accepter le Règlement')
        .setStyle(ButtonStyle.Success)
    );

    await message.channel.send({ embeds: [embed], components: [row] });
    console.log(`✅ [STREETNOVA] Règlement posté par le propriétaire du serveur.`);
  });

  // ── Interaction : clic sur le bouton ──
  client.on('interactionCreate', async function(interaction) {
    if (!interaction.isButton()) return;
    if (interaction.customId !== 'accepter_reglement_streetnova') return;
    if (interaction.guild?.id !== GUILD_ID) return;

    const member = interaction.member;

    // Déjà le rôle ?
    if (member.roles.cache.has(ROLE_REGLEMENT_ID)) {
      return await interaction.reply({
        content: '❌ Vous avez déjà accepté le règlement !',
        ephemeral: true,
      });
    }

    // Ajout du rôle
    try {
      await member.roles.add(ROLE_REGLEMENT_ID);
      await interaction.reply({
        content: '✅ Vous avez accepté le règlement et obtenu l\'accès au serveur !',
        ephemeral: true,
      });
      console.log(`✅ [STREETNOVA] Règlement accepté par : ${member.user.username}`);
    } catch (error) {
      console.error(`❌ [STREETNOVA] Erreur ajout rôle règlement : ${error.message}`);
      await interaction.reply({
        content: '❌ Une erreur est survenue, contacte un administrateur.',
        ephemeral: true,
      });
    }
  });

};