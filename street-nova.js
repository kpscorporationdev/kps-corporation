const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const https = require('https');
const http  = require('http');

// ══════════════════════════════════════════
//   CONFIGURATION — STREETNOVA
// ══════════════════════════════════════════
const GUILD_ID          = '1432658174967677033';
const CHANNEL_ID        = '1432658603273097216';
const ROLE_REGLEMENT_ID = '1502685338307661935';
const COMMANDE          = '!reglement-streetnova';

// ══════════════════════════════════════════
//   UTILITAIRE WEBHOOK
// ══════════════════════════════════════════
function sendWebhook(webhookUrl, payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const url  = new URL(webhookUrl);
    const lib  = url.protocol === 'https:' ? https : http;

    const req = lib.request({
      hostname : url.hostname,
      path     : url.pathname + url.search,
      method   : 'POST',
      headers  : {
        'Content-Type'   : 'application/json',
        'Content-Length' : Buffer.byteLength(body),
      },
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ══════════════════════════════════════════
//   MODULE
// ══════════════════════════════════════════
module.exports = function(client) {

  // ── Cache des invitations au démarrage ──
  const inviteCache = new Map();

  client.on('ready', async () => {
    const guild = client.guilds.cache.get(GUILD_ID);
    if (!guild) return;
    const invites = await guild.invites.fetch().catch(() => null);
    if (invites) invites.forEach(inv => inviteCache.set(inv.code, inv.uses));
    console.log(`✅ [STREETNOVA] ${invites?.size ?? 0} invitation(s) mise(s) en cache.`);
  });

  client.on('inviteCreate', invite => {
    if (invite.guild?.id !== GUILD_ID) return;
    inviteCache.set(invite.code, invite.uses);
  });

  client.on('inviteDelete', invite => {
    if (invite.guild?.id !== GUILD_ID) return;
    inviteCache.delete(invite.code);
  });

  // ── Bienvenue via webhook ──
  client.on('guildMemberAdd', async member => {
    if (member.guild.id !== GUILD_ID) return;

    const webhookUrl = process.env.WEBHOOK_SN_ARRIVALS;
    if (!webhookUrl) {
      console.error('❌ [STREETNOVA] Variable WEBHOOK_SN_ARRIVALS manquante.');
      return;
    }

    let methode = `***une méthode inconnue*** ❓`;

    try {
      const newInvites = await member.guild.invites.fetch().catch(() => null);

      if (newInvites) {
        const usedInvite = newInvites.find(inv => {
          const cached = inviteCache.get(inv.code) ?? 0;
          return inv.uses > cached;
        });

        // Met à jour le cache
        newInvites.forEach(inv => inviteCache.set(inv.code, inv.uses));

        if (usedInvite) {
          if (usedInvite.inviter) {
            methode = `***une invitation de*** **${usedInvite.inviter.username}** *(${usedInvite.uses})* 🔥`;
          } else {
            methode = `***le lien d'invitation personnalisé du serveur*** 🔗`;
          }
        } else if (member.guild.vanityURLCode) {
          methode = `***le lien d'invitation personnalisé du serveur*** 🔗`;
        }
      }
    } catch (err) {
      console.error(`❌ [STREETNOVA] Erreur détection invitation : ${err.message}`);
    }

    const mention = `<@${member.user.id}>`;
    const payload = {
      content:
        `🛹 ***Bienvenue*** ${mention} ***sur Street Nova !***\n` +
        `╰➤ 🔗 __A rejoint via__ ${methode}`,
      allowed_mentions: { users: [member.user.id] },
    };

    try {
      await sendWebhook(webhookUrl, payload);
      console.log(`✅ [STREETNOVA] Bienvenue envoyé pour : ${member.user.username}`);
    } catch (err) {
      console.error(`❌ [STREETNOVA] Erreur envoi webhook : ${err.message}`);
    }
  });

  // ── Boost via webhook ──
  client.on('guildMemberUpdate', async (oldMember, newMember) => {
    if (newMember.guild.id !== GUILD_ID) return;

    const aBoosté = !oldMember.premiumSince && newMember.premiumSince;
    if (!aBoosté) return;

    const webhookUrl = process.env.WEBHOOK_SN_BOOST;
    if (!webhookUrl) {
      console.error('❌ [STREETNOVA] Variable WEBHOOK_SN_BOOST manquante.');
      return;
    }

    const mention = `<@${newMember.user.id}>`;
    const payload = {
      content: `🛹 ***Merci*** ${mention} ***d'avoir boosté le serveur Street Nova !***`,
      allowed_mentions: { users: [newMember.user.id] },
    };

    try {
      await sendWebhook(webhookUrl, payload);
      console.log(`✅ [STREETNOVA] Boost détecté pour : ${newMember.user.username}`);
    } catch (err) {
      console.error(`❌ [STREETNOVA] Erreur envoi webhook boost : ${err.message}`);
    }
  });

  // ── Commande règlement ──
  client.on('messageCreate', async function(message) {
    if (message.guild?.id !== GUILD_ID) return;
    if (message.channel.id !== CHANNEL_ID) return;
    if (message.content !== COMMANDE) return;

    await message.delete().catch(() => {});

    if (message.author.id !== message.guild.ownerId) return;

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

  // ── Bouton règlement ──
  client.on('interactionCreate', async function(interaction) {
    if (!interaction.isButton()) return;
    if (interaction.customId !== 'accepter_reglement_streetnova') return;
    if (interaction.guild?.id !== GUILD_ID) return;

    const member = interaction.member;

    if (member.roles.cache.has(ROLE_REGLEMENT_ID)) {
      return await interaction.reply({
        content: '❌ Vous avez déjà accepté le règlement !',
        ephemeral: true,
      });
    }

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
