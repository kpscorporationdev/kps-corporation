const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');

// ─────────────────────────────────────────────
//  CONFIGURATION
// ─────────────────────────────────────────────
const GUILD_ID              = '1463264069485068290';
const ARRIVALS_CHANNEL_ID   = '1463496101549047984';
const DEPARTURES_CHANNEL_ID = '1463496203147808909';
const WEBHOOK_ARRIVALS      = process.env.WEBHOOK_RC_ARRIVALS;
const WEBHOOK_GO            = process.env.WEBHOOK_RC_GO;

const REGLEMENT_USER_ID     = '1474131126233731244'; // seul user autorisé à faire !reglement_rc
const REGLEMENT_ROLE_ID     = '1499055628893683822'; // rôle attribué après acceptation

// ─────────────────────────────────────────────
//  UTILITAIRE — Envoi webhook
// ─────────────────────────────────────────────
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

// ─────────────────────────────────────────────
//  MODULE PRINCIPAL
// ─────────────────────────────────────────────
module.exports = (client) => {

  // ───────────────────────────────────────────
  //  ARRIVÉE D'UN MEMBRE
  // ───────────────────────────────────────────
  client.on('guildMemberAdd', async (member) => {
    if (member.guild.id !== GUILD_ID) return;

    const guild       = member.guild;
    const user        = member.user;
    const avatarUrl   = user.displayAvatarURL({ size: 256, dynamic: true });
    const joinedAt    = new Date();
    const memberCount = guild.memberCount;

    const formattedDate = joinedAt.toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

    const embed = {
      color: 0x57F287,
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

  // ───────────────────────────────────────────
  //  DÉPART D'UN MEMBRE
  // ───────────────────────────────────────────
  client.on('guildMemberRemove', async (member) => {
    if (member.guild.id !== GUILD_ID) return;

    const guild       = member.guild;
    const user        = member.user;
    const avatarUrl   = user.displayAvatarURL({ size: 256, dynamic: true });
    const leftAt      = new Date();
    const memberCount = guild.memberCount;

    const formattedDate = leftAt.toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

    const embed = {
      color: 0xED4245,
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

  // ───────────────────────────────────────────
  //  COMMANDE !reglement_rc
  // ───────────────────────────────────────────
  client.on('messageCreate', async (message) => {
    if (message.guild?.id !== GUILD_ID) return;
    if (message.author.id !== REGLEMENT_USER_ID) return;
    if (message.content.trim() !== '!reglement_rc') return;

    // Suppression du message de commande
    try { await message.delete(); } catch {}

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('📋 Règlement — Roblox Community')
      .setDescription(
        'Afin de garantir une bonne ambiance sur le serveur, merci de respecter les règles suivantes :\n\u200b'
      )
      .addFields(
        {
          name: '🔹 1. Respect obligatoire',
          value: 'Tout membre doit être respectueux envers les autres.\n❌ Insultes, harcèlement, propos haineux → interdits.',
        },
        {
          name: '🔹 2. Comportement en jeu (Roblox)',
          value: 'Respectez les règles des jeux et des événements.\n❌ Triche, troll excessif ou anti-jeu → sanctionnable.',
        },
        {
          name: '🔹 3. Spam / Flood',
          value: '❌ Évitez le spam, les messages inutiles ou répétitifs.',
        },
        {
          name: '🔹 4. Publicité',
          value: '❌ Aucune publicité sans autorisation du staff.',
        },
        {
          name: '🔹 5. Contenu interdit',
          value: '❌ Contenu choquant, NSFW ou inapproprié strictement interdit.',
        },
        {
          name: '🔹 6. Activité du serveur',
          value: 'Les membres doivent rester actifs.\n➡️ En cas d\'absence, utilisez le salon prévu à cet effet.',
        },
        {
          name: '🔹 7. Événements',
          value: 'Les événements sont faits pour la communauté.\nMerci de participer et de respecter l\'organisation.',
        },
        {
          name: '🔹 8. Staff',
          value: 'Le staff a toujours le dernier mot.\nRespectez leurs décisions.',
        },
        {
          name: '🔹 9. Sanctions',
          value: 'Toute infraction peut entraîner :\n⚠️ Avertissement\n🚫 Mute / Kick / Ban',
        },
        {
          name: '\u200b',
          value: '✅ En restant sur le serveur, vous acceptez ce règlement.\n\n*Merci à tous et bon jeu sur Roblox Community !* 🔥',
        }
      )
      .setFooter({ text: 'Roblox Community • Règlement officiel' })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rc_accept_reglement')
        .setLabel('✅ Accepter le règlement')
        .setStyle(ButtonStyle.Success)
    );

    await message.channel.send({ embeds: [embed], components: [row] });
  });

  // ───────────────────────────────────────────
  //  BOUTON — Accepter le règlement
  // ───────────────────────────────────────────
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;
    if (interaction.customId !== 'rc_accept_reglement') return;
    if (interaction.guild?.id !== GUILD_ID) return;

    const member = interaction.member;

    // Vérifie si le membre a déjà le rôle
    if (member.roles.cache.has(REGLEMENT_ROLE_ID)) {
      return interaction.reply({
        content: '⚠️ Vous avez déjà accepté le règlement !',
        ephemeral: true,
      });
    }

    try {
      await member.roles.add(REGLEMENT_ROLE_ID);
      await interaction.reply({
        content: '✅ Merci d\'avoir accepté le règlement ! Bon jeu sur **Roblox Community** 🎮🔥',
        ephemeral: true,
      });
    } catch (err) {
      console.error('[Règlement] Erreur lors de l\'ajout du rôle :', err);
      await interaction.reply({
        content: '❌ Une erreur est survenue lors de l\'attribution du rôle. Contacte un membre du staff !',
        ephemeral: true,
      });
    }
  });

};
