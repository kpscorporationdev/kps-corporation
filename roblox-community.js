const { EmbedBuilder } = require('discord.js');

const GUILD_ID = '1463264069485068290';
const ARRIVALS_CHANNEL_ID = '1463496101549047984';
const DEPARTURES_CHANNEL_ID = '1463496203147808909';

const WEBHOOK_ARRIVALS = process.env.WEBHOOK_RC_ARRIVALS;
const WEBHOOK_GO = process.env.WEBHOOK_RC_GO;

/**
 * Envoie un embed via webhook
 * @param {string} webhookUrl
 * @param {Object} payload
 */
async function sendWebhook(webhookUrl, payload) {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(`[Webhook] Erreur HTTP ${response.status} : ${await response.text()}`);
    }
  } catch (err) {
    console.error('[Webhook] Erreur lors de l\'envoi :', err);
  }
}

module.exports = (client) => {
  // ───────────────────────────────────────────────
  //  ARRIVÉE D'UN MEMBRE
  // ───────────────────────────────────────────────
  client.on('guildMemberAdd', async (member) => {
    if (member.guild.id !== GUILD_ID) return;

    const guild = member.guild;
    const user = member.user;
    const avatarUrl = user.displayAvatarURL({ size: 256, dynamic: true });
    const joinedAt = new Date();
    const memberCount = guild.memberCount;

    const formattedDate = joinedAt.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const embed = {
      color: 0x57F287, // Vert Discord
      author: {
        name: `${user.username} vient de rejoindre ! 🎉`,
        icon_url: avatarUrl,
      },
      thumbnail: { url: avatarUrl },
      description: [
        `> 👋 Bienvenue sur le serveur **Roblox Community**, <@${user.id}> !`,
        `> Toute la communauté te souhaite la bienvenue — nous sommes vraiment ravis de t'avoir parmi nous ! 🎮✨`,
        `> N'hésite pas à explorer le serveur, à te présenter et à profiter de l'ambiance !`,
      ].join('\n'),
      fields: [
        {
          name: '📅 Date d\'arrivée',
          value: formattedDate,
          inline: true,
        },
        {
          name: '👥 Membres',
          value: `Nous sommes désormais **${memberCount}** membres !`,
          inline: true,
        },
      ],
      footer: {
        text: 'Roblox Community • Bienvenue !',
        icon_url: guild.iconURL({ dynamic: true }) || undefined,
      },
      timestamp: joinedAt.toISOString(),
    };

    await sendWebhook(WEBHOOK_ARRIVALS, {
      content: `<@${user.id}>`,
      embeds: [embed],
      allowed_mentions: { users: [user.id] },
    });
  });

  // ───────────────────────────────────────────────
  //  DÉPART D'UN MEMBRE
  // ───────────────────────────────────────────────
  client.on('guildMemberRemove', async (member) => {
    if (member.guild.id !== GUILD_ID) return;

    const guild = member.guild;
    const user = member.user;
    const avatarUrl = user.displayAvatarURL({ size: 256, dynamic: true });
    const leftAt = new Date();
    const memberCount = guild.memberCount;

    const formattedDate = leftAt.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const embed = {
      color: 0xED4245, // Rouge Discord
      author: {
        name: `${user.username} a quitté le serveur... 😔`,
        icon_url: avatarUrl,
      },
      thumbnail: { url: avatarUrl },
      description: [
        `> 💔 Non... Malheureusement, **${user.username}** vient de quitter **Roblox Community**.`,
        `> Toute la communauté lui souhaite néanmoins une excellente continuation et beaucoup de succès dans ses aventures ! 🍀`,
      ].join('\n'),
      fields: [
        {
          name: '📅 Date de départ',
          value: formattedDate,
          inline: true,
        },
        {
          name: '👥 Membres restants',
          value: `Il nous reste **${memberCount}** membres.`,
          inline: true,
        },
      ],
      footer: {
        text: 'Roblox Community • Au revoir...',
        icon_url: guild.iconURL({ dynamic: true }) || undefined,
      },
      timestamp: leftAt.toISOString(),
    };

    await sendWebhook(WEBHOOK_GO, {
      embeds: [embed],
    });
  });
};