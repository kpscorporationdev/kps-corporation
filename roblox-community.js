const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');

// ─────────────────────────────────────────────
//  CONFIGURATION
// ─────────────────────────────────────────────
const GUILD_ID               = '1463264069485068290';
const ARRIVALS_CHANNEL_ID    = '1463496101549047984';
const DEPARTURES_CHANNEL_ID  = '1463496203147808909';
const WEBHOOK_ARRIVALS       = process.env.WEBHOOK_RC_ARRIVALS;
const WEBHOOK_GO             = process.env.WEBHOOK_RC_GO;

const REGLEMENT_USER_ID      = '1474131126233731244';
const REGLEMENT_ROLE_ID      = '1499055628893683822';

// ── Service ──────────────────────────────────
const CMD_CHANNEL_ID         = '1491714863234551970'; // salon des commandes !ServiceOn/Off
const LOG_CHANNEL_ID         = '1491716031574446090'; // salon de l'embed "en service"
const SERVICE_LOG_CHANNEL_ID = '1500596907628695632'; // salon des logs de service
const TIERLIST_CHANNEL_ID    = '1500612654627295382'; // salon pour !tierlist_service
const SERVICE_ROLE_ID        = '1500275387672821912'; // rôle "En service"

// ─────────────────────────────────────────────
//  STATE
// ─────────────────────────────────────────────
let embedMessageId = null;                   // ID du message embed "animateurs en service"
const serviceSessionStart = new Map();       // userId → timestamp début session (ms)
let weeklyStats = {};                        // userId → minutes totales cette semaine

// ─────────────────────────────────────────────
//  UTILITAIRES
// ─────────────────────────────────────────────

// Formate des minutes en "Xh Ym"
function formatDuration(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}min`;
  if (h > 0) return `${h}h`;
  return `${m}min`;
}

// Formate une Date en FR (fuseau Europe/Paris)
function formatDate(date) {
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Europe/Paris',
  });
}

// Envoie un webhook Discord
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
//  EMBED — "Animateurs en service"
// ─────────────────────────────────────────────
async function updateServiceEmbed(guild) {
  try {
    await guild.members.fetch();

    const role = guild.roles.cache.get(SERVICE_ROLE_ID);
    if (!role) return console.error('[Service Embed] Rôle introuvable.');

    const onDuty = role.members.filter(m => !m.user.bot);

    const description = onDuty.size === 0
      ? '*Aucun animateur en service pour le moment.*'
      : onDuty.map(m => `<@${m.id}>`).join('\n');

    const embed = {
      color: onDuty.size > 0 ? 0x57F287 : 0xED4245,
      title: '🎙️ Animateur(s) en service',
      description,
      footer: { text: `${onDuty.size} animateur(s) actif(s) • Roblox Community` },
      timestamp: new Date().toISOString(),
    };

    const channel = guild.channels.cache.get(LOG_CHANNEL_ID);
    if (!channel) return console.error('[Service Embed] Salon introuvable.');

    if (embedMessageId) {
      try {
        const existing = await channel.messages.fetch(embedMessageId);
        await existing.edit({ embeds: [embed] });
        return;
      } catch {
        embedMessageId = null; // supprimé manuellement → on recrée
      }
    }

    const sent = await channel.send({ embeds: [embed] });
    embedMessageId = sent.id;

  } catch (err) {
    console.error('[Service Embed] Erreur :', err);
  }
}

// ─────────────────────────────────────────────
//  LOG — Envoi d'un log dans le salon de logs
// ─────────────────────────────────────────────
async function sendServiceLog(guild, user, type, sessionMinutes = null, forcedBy = null) {
  const logChannel = guild.channels.cache.get(SERVICE_LOG_CHANNEL_ID);
  if (!logChannel) return console.error('[Service Log] Salon de logs introuvable.');

  const avatarUrl = user.displayAvatarURL({ size: 64, dynamic: true });
  const now = new Date();

  let embed;

  if (type === 'on') {
    embed = new EmbedBuilder()
      .setColor(0x57F287)
      .setTitle('🟢 Prise de service')
      .setThumbnail(avatarUrl)
      .addFields(
        { name: '👤 Animateur', value: `<@${user.id}> (${user.username})`, inline: true },
        { name: '🕐 Heure de prise', value: formatDate(now), inline: true },
      )
      .setFooter({ text: 'Roblox Community • Logs de service' })
      .setTimestamp();
  } else if (type === 'force') {
    // Log spécifique pour un arrêt forcé par le staff
    embed = new EmbedBuilder()
      .setColor(0xFF8C00)
      .setTitle('🛑 Fin de service forcée')
      .setThumbnail(avatarUrl)
      .addFields(
        { name: '👤 Animateur',         value: `<@${user.id}> (${user.username})`,                     inline: true },
        { name: '🔨 Forcé par',         value: forcedBy ? `<@${forcedBy.id}> (${forcedBy.username})` : 'Staff', inline: true },
        { name: '🕐 Heure de fin',      value: formatDate(now),                                        inline: true },
        { name: '⏱️ Durée de session',  value: sessionMinutes !== null ? formatDuration(sessionMinutes) : 'Inconnue', inline: true },
        { name: '📊 Total semaine',     value: formatDuration(weeklyStats[user.id] || 0),               inline: true },
      )
      .setFooter({ text: 'Roblox Community • Logs de service' })
      .setTimestamp();
  } else {
    embed = new EmbedBuilder()
      .setColor(0xED4245)
      .setTitle('🔴 Fin de service')
      .setThumbnail(avatarUrl)
      .addFields(
        { name: '👤 Animateur', value: `<@${user.id}> (${user.username})`, inline: true },
        { name: '🕐 Heure de fin', value: formatDate(now), inline: true },
        { name: '⏱️ Durée de la session', value: sessionMinutes !== null ? formatDuration(sessionMinutes) : 'Inconnue', inline: true },
        { name: '📊 Total semaine', value: formatDuration(weeklyStats[user.id] || 0), inline: true },
      )
      .setFooter({ text: 'Roblox Community • Logs de service' })
      .setTimestamp();
  }

  await logChannel.send({ embeds: [embed] });
}

// ─────────────────────────────────────────────
//  TIERLIST — Classement hebdomadaire
// ─────────────────────────────────────────────
async function sendTierlist(message) {
  try { await message.delete(); } catch {}

  const guild = message.guild;
  const channel = guild.channels.cache.get(TIERLIST_CHANNEL_ID);
  if (!channel) return;

  const sorted = Object.entries(weeklyStats)
    .filter(([, mins]) => mins > 0)
    .sort(([, a], [, b]) => b - a);

  const medals = ['🥇', '🥈', '🥉'];

  let description;
  if (sorted.length === 0) {
    description = '*Aucune activité enregistrée cette semaine.*';
  } else {
    description = sorted.map(([userId, mins], index) => {
      const pos = medals[index] ?? `**#${index + 1}**`;
      return `${pos} <@${userId}> — ${formatDuration(mins)}`;
    }).join('\n');
  }

  const nextReset = getNextMondayParis();

  const embed = new EmbedBuilder()
    .setColor(0xF1C40F)
    .setTitle('🏆 Tierlist des animateurs — Semaine en cours')
    .setDescription(description)
    .addFields({ name: '🔄 Prochain reset', value: formatDate(nextReset), inline: false })
    .setFooter({ text: 'Reset automatique le lundi à 00:01 • Roblox Community' })
    .setTimestamp();

  await channel.send({ embeds: [embed] });
}

// ─────────────────────────────────────────────
//  RESET hebdomadaire — chaque lundi à 00:01 heure Paris
// ─────────────────────────────────────────────

// Calcule le timestamp UTC du prochain lundi à 00:01 heure de Paris
function getNextMondayParis() {
  const now = new Date();

  const fmt = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', weekday: 'short',
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(now).map(p => [p.type, p.value]));

  const year    = parseInt(parts.year,  10);
  const month   = parseInt(parts.month, 10) - 1;
  const day     = parseInt(parts.day,   10);
  const weekday = ['dim','lun','mar','mer','jeu','ven','sam'].indexOf(parts.weekday.slice(0,3).toLowerCase());

  const daysUntil = weekday === 1 ? 7 : (8 - weekday) % 7;

  const targetParis = new Date(year, month, day + daysUntil, 0, 1, 0, 0);

  const utcNow   = Date.UTC(year, month, day, parseInt(parts.hour,10), parseInt(parts.minute,10));
  const offsetMs = utcNow - now.getTime();

  return new Date(targetParis.getTime() - offsetMs);
}

function scheduleWeeklyReset() {
  const nextReset    = getNextMondayParis();
  const msUntilReset = nextReset.getTime() - Date.now();

  console.log(`[Tierlist] Prochain reset lundi 00:01 Paris dans ${Math.round(msUntilReset / 1000 / 60)} min — ${formatDate(nextReset)}.`);

  setTimeout(() => {
    weeklyStats = {};
    serviceSessionStart.clear();
    console.log('[Tierlist] Stats hebdomadaires réinitialisées.');
    scheduleWeeklyReset();
  }, msUntilReset);
}

// ─────────────────────────────────────────────
//  HELPER — Logique commune de fin de service
// ─────────────────────────────────────────────
async function stopService(guild, targetMember, forcedBy = null) {
  await targetMember.roles.remove(SERVICE_ROLE_ID);

  let sessionMinutes = 0;
  if (serviceSessionStart.has(targetMember.id)) {
    const elapsed = Date.now() - serviceSessionStart.get(targetMember.id);
    sessionMinutes = Math.round(elapsed / 1000 / 60);
    serviceSessionStart.delete(targetMember.id);
  }

  weeklyStats[targetMember.id] = (weeklyStats[targetMember.id] || 0) + sessionMinutes;

  await updateServiceEmbed(guild);
  await sendServiceLog(guild, targetMember.user, forcedBy ? 'force' : 'off', sessionMinutes, forcedBy);

  return sessionMinutes;
}

// ─────────────────────────────────────────────
//  MODULE PRINCIPAL
// ─────────────────────────────────────────────
module.exports = (client) => {

  // ── Prêt ──────────────────────────────────
  client.once('ready', async () => {
    console.log('[Roblox Community] Module chargé. Initialisation…');
    scheduleWeeklyReset();
    try {
      const guild = client.guilds.cache.get(GUILD_ID);
      if (guild) await updateServiceEmbed(guild);
    } catch (err) {
      console.error('[Service] Erreur au démarrage :', err);
    }
  });

  // ── Arrivée d'un membre ────────────────────
  client.on('guildMemberAdd', async (member) => {
    if (member.guild.id !== GUILD_ID) return;

    const guild       = member.guild;
    const user        = member.user;
    const avatarUrl   = user.displayAvatarURL({ size: 256, dynamic: true });
    const joinedAt    = new Date();

    const embed = {
      color: 0x57F287,
      author: { name: `${user.username} vient de rejoindre ! 🎉`, icon_url: avatarUrl },
      thumbnail: { url: avatarUrl },
      description: [
        `> 👋 Bienvenue sur le serveur **Roblox Community**, <@${user.id}> !`,
        `> Toute la communauté te souhaite la bienvenue — nous sommes vraiment ravis de t'avoir parmi nous ! 🎮✨`,
        `> N'hésite pas à explorer le serveur, à te présenter et à profiter de l'ambiance !`,
      ].join('\n'),
      fields: [
        { name: '📅 Date d\'arrivée', value: formatDate(joinedAt), inline: true },
        { name: '👥 Membres', value: `Nous sommes désormais **${guild.memberCount}** membres !`, inline: true },
      ],
      footer: { text: 'Roblox Community • Bienvenue !', icon_url: guild.iconURL({ dynamic: true }) || undefined },
      timestamp: joinedAt.toISOString(),
    };

    await sendWebhook(WEBHOOK_ARRIVALS, {
      content: `<@${user.id}>`,
      embeds: [embed],
      allowed_mentions: { users: [user.id] },
    });
  });

  // ── Départ d'un membre ─────────────────────
  client.on('guildMemberRemove', async (member) => {
    if (member.guild.id !== GUILD_ID) return;

    const guild     = member.guild;
    const user      = member.user;
    const avatarUrl = user.displayAvatarURL({ size: 256, dynamic: true });
    const leftAt    = new Date();

    const embed = {
      color: 0xED4245,
      author: { name: `${user.username} a quitté le serveur... 😔`, icon_url: avatarUrl },
      thumbnail: { url: avatarUrl },
      description: [
        `> 💔 Non... Malheureusement, **${user.username}** vient de quitter **Roblox Community**.`,
        `> Toute la communauté lui souhaite néanmoins une excellente continuation et beaucoup de succès dans ses aventures ! 🍀`,
      ].join('\n'),
      fields: [
        { name: '📅 Date de départ', value: formatDate(leftAt), inline: true },
        { name: '👥 Membres restants', value: `Il nous reste **${guild.memberCount}** membres.`, inline: true },
      ],
      footer: { text: 'Roblox Community • Au revoir...', icon_url: guild.iconURL({ dynamic: true }) || undefined },
      timestamp: leftAt.toISOString(),
    };

    await sendWebhook(WEBHOOK_GO, { embeds: [embed] });
  });

  // ── Commandes (messageCreate) ──────────────
  client.on('messageCreate', async (message) => {
    if (message.guild?.id !== GUILD_ID) return;
    if (message.author.bot) return;

    const cmd      = message.content.trim();
    const cmdLower = cmd.toLowerCase();

    // !reglement_rc ──────────────────────────
    if (cmd === '!reglement_rc') {
      if (message.author.id !== REGLEMENT_USER_ID) return;
      try { await message.delete(); } catch {}

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('📋 Règlement — Roblox Community')
        .setDescription('Afin de garantir une bonne ambiance sur le serveur, merci de respecter les règles suivantes :\n\u200b')
        .addFields(
          { name: '🔹 1. Respect obligatoire',          value: 'Tout membre doit être respectueux envers les autres.\n❌ Insultes, harcèlement, propos haineux → interdits.' },
          { name: '🔹 2. Comportement en jeu (Roblox)', value: 'Respectez les règles des jeux et des événements.\n❌ Triche, troll excessif ou anti-jeu → sanctionnable.' },
          { name: '🔹 3. Spam / Flood',                 value: '❌ Évitez le spam, les messages inutiles ou répétitifs.' },
          { name: '🔹 4. Publicité',                    value: '❌ Aucune publicité sans autorisation du staff.' },
          { name: '🔹 5. Contenu interdit',              value: '❌ Contenu choquant, NSFW ou inapproprié strictement interdit.' },
          { name: '🔹 6. Activité du serveur',           value: 'Les membres doivent rester actifs.\n➡️ En cas d\'absence, utilisez le salon prévu à cet effet.' },
          { name: '🔹 7. Événements',                   value: 'Les événements sont faits pour la communauté.\nMerci de participer et de respecter l\'organisation.' },
          { name: '🔹 8. Staff',                        value: 'Le staff a toujours le dernier mot.\nRespectez leurs décisions.' },
          { name: '🔹 9. Sanctions',                    value: 'Toute infraction peut entraîner :\n⚠️ Avertissement\n🚫 Mute / Kick / Ban' },
          { name: '\u200b',                             value: '✅ En restant sur le serveur, vous acceptez ce règlement.\n\n*Merci à tous et bon jeu sur Roblox Community !* 🔥' },
        )
        .setFooter({ text: 'Roblox Community • Règlement officiel' })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('rc_accept_reglement')
          .setLabel('✅ Accepter le règlement')
          .setStyle(ButtonStyle.Success)
      );

      return message.channel.send({ embeds: [embed], components: [row] });
    }

    // !tierlist_service ───────────────────────
    if (cmdLower === '!tierlist_service') {
      if (message.channel.id !== TIERLIST_CHANNEL_ID) return;
      return sendTierlist(message);
    }

    // !forcestop_service {userId} ─────────────
    if (cmdLower.startsWith('!forcestop_service')) {
      // Vérifie que l'auteur est bien un membre du staff (permission ManageRoles ou Administrator)
      if (!message.member.permissions.has('ManageRoles')) {
        return message.reply({
          content: '❌ Tu n\'as pas la permission d\'utiliser cette commande.',
          allowedMentions: { repliedUser: false },
        });
      }

      // Récupère l'ID fourni en argument
      const args = cmd.trim().split(/\s+/);
      const targetId = args[1];

      if (!targetId || !/^\d+$/.test(targetId)) {
        return message.reply({
          content: '⚠️ Utilisation : `!forcestop_service <ID du membre>`',
          allowedMentions: { repliedUser: false },
        });
      }

      // Récupère le membre via son ID
      let targetUser;
      try {
        targetUser = await message.guild.members.fetch(targetId);
      } catch {
        return message.reply({
          content: `❌ Impossible de trouver un membre avec l'ID \`${targetId}\`. Vérifie l'ID et réessaie.`,
          allowedMentions: { repliedUser: false },
        });
      }

      // Vérifie que la cible est bien en service
      if (!targetUser.roles.cache.has(SERVICE_ROLE_ID)) {
        return message.reply({
          content: `⚠️ <@${targetUser.id}> n'est pas en service.`,
          allowedMentions: { repliedUser: false },
        });
      }

      try {
        const sessionMinutes = await stopService(message.guild, targetUser, message.author);

        await message.reply({
          content: `🛑 Le service de <@${targetUser.id}> a été **arrêté de force** par <@${message.author.id}>. (Session : ${formatDuration(sessionMinutes)})`,
          allowedMentions: { repliedUser: false },
        });
      } catch (err) {
        console.error('[ForceStop] Erreur :', err);
        message.reply({
          content: '❌ Impossible de stopper le service. Vérifie mes permissions.',
          allowedMentions: { repliedUser: false },
        });
      }

      return;
    }

    // !ServiceOn / !ServiceOff ────────────────
    if (message.channel.id !== CMD_CHANNEL_ID) return;

    if (cmdLower === '!serviceon') {
      const member = message.member;
      const user   = message.author;

      if (member.roles.cache.has(SERVICE_ROLE_ID)) {
        return message.reply({ content: '⚠️ Tu es déjà en service !', allowedMentions: { repliedUser: false } });
      }

      try {
        await member.roles.add(SERVICE_ROLE_ID);
        serviceSessionStart.set(user.id, Date.now());
        await message.reply({ content: '✅ Tu es maintenant **en service** !', allowedMentions: { repliedUser: false } });
        await updateServiceEmbed(message.guild);
        await sendServiceLog(message.guild, user, 'on');
      } catch (err) {
        console.error('[ServiceOn] Erreur :', err);
        message.reply({ content: '❌ Impossible d\'ajouter le rôle. Vérifie mes permissions.', allowedMentions: { repliedUser: false } });
      }

    } else if (cmdLower === '!serviceoff') {
      const member = message.member;
      const user   = message.author;

      if (!member.roles.cache.has(SERVICE_ROLE_ID)) {
        return message.reply({ content: '⚠️ Tu n\'es pas en service !', allowedMentions: { repliedUser: false } });
      }

      try {
        const sessionMinutes = await stopService(message.guild, member);
        await message.reply({ content: '🔴 Tu es maintenant **hors service**.', allowedMentions: { repliedUser: false } });
      } catch (err) {
        console.error('[ServiceOff] Erreur :', err);
        message.reply({ content: '❌ Impossible de retirer le rôle. Vérifie mes permissions.', allowedMentions: { repliedUser: false } });
      }
    }
  });

  // ── Bouton — Accepter le règlement ─────────
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;
    if (interaction.customId !== 'rc_accept_reglement') return;
    if (interaction.guild?.id !== GUILD_ID) return;

    const member = interaction.member;

    if (member.roles.cache.has(REGLEMENT_ROLE_ID)) {
      return interaction.reply({ content: '⚠️ Vous avez déjà accepté le règlement !', ephemeral: true });
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
