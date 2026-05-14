const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ChannelType,
  PermissionFlagsBits,
} = require('discord.js');
const https = require('https');
const http  = require('http');
const fs    = require('fs');
const path  = require('path');

// ── Persistance des compteurs de tickets ───────────────────────────
const COUNTERS_FILE = path.join(__dirname, 'ticket_counters.json');

function loadCounters() {
  try {
    if (fs.existsSync(COUNTERS_FILE)) {
      return JSON.parse(fs.readFileSync(COUNTERS_FILE, 'utf-8'));
    }
  } catch (_) {}
  return { verif: 0, unban: 0, question: 0, report: 0, other: 0 };
}

function saveCounters(counters) {
  try {
    fs.writeFileSync(COUNTERS_FILE, JSON.stringify(counters, null, 2), 'utf-8');
  } catch (err) {
    console.error(`❌ [TICKETS] Erreur sauvegarde compteurs : ${err.message}`);
  }
}

// ══════════════════════════════════════════════════════════════════════
//   CONFIGURATION GLOBALE — STREETNOVA
// ══════════════════════════════════════════════════════════════════════

const GUILD_ID          = '1432658174967677033';
const CHANNEL_ID        = '1432658603273097216';
const ROLE_REGLEMENT_ID = '1502685338307661935';
const COMMANDE          = '!reglement-streetnova';

// ── Catégories des tickets ──────────────────────────────────────────
const TICKET_CATEGORIES = {
  verif    : { id: '1504102263042478141', name: 'Aide à la Vérification', prefix: 'ticket-vérif',    logChannel: '1504380575908368384' },
  unban    : { id: '1504114655331745903', name: 'Aide Débannissement',    prefix: 'ticket-unban',    logChannel: '1504380645013458994' },
  question : { id: '1504115082760683530', name: 'Aide Question',          prefix: 'ticket-question', logChannel: '1504380726328557659' },
  report   : { id: '1504115141745053847', name: 'Aide Signalement',       prefix: 'ticket-report',   logChannel: '1504380760038051910' },
  other    : { id: '1504115231213748347', name: 'Autre Aide',             prefix: 'ticket-others',   logChannel: '1504380793538216058' },
};

// ── Rôles autorisés à voir / interagir avec les tickets ────────────
const STAFF_ROLES = [
  '1495444713136984215',
  '1495035067767066764',
  '1487792404886065172',
  '1504369719929606175',
  '1504367314294931456',
  '1504367295852576819',
  '1504367284792197120',
];

// ── Rôles mentionnés à l'ouverture d'un ticket ─────────────────────
const PING_ROLES = [
  '1504367314294931456',
  '1504367295852576819',
  '1504367284792197120',
];

// ── Rôles admin ticket (peuvent fermer/gérer sans propriété) ───────
const ADMIN_TICKET_ROLES = [
  '1487792404886065172',
  '1504372115305005176',
  '1504369719929606175',
];

// ── Compteurs de tickets (persistants via fichier JSON) ────────────
const ticketCounters = loadCounters();

// ── Map des tickets ouverts : channelId → { owner, claimedBy, type } ──
const openTickets = new Map();

// ══════════════════════════════════════════════════════════════════════
//   UTILITAIRE WEBHOOK
// ══════════════════════════════════════════════════════════════════════

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

// ══════════════════════════════════════════════════════════════════════
//   UTILITAIRES TICKETS
// ══════════════════════════════════════════════════════════════════════

/**
 * Vérifie si un membre est admin ticket.
 */
function isTicketAdmin(member) {
  return ADMIN_TICKET_ROLES.some(r => member.roles.cache.has(r));
}

/**
 * Vérifie si un membre est staff (peut voir/interagir).
 */
function isStaff(member) {
  return STAFF_ROLES.some(r => member.roles.cache.has(r));
}

/**
 * Génère un transcript HTML complet d'un salon de ticket.
 */
async function generateTranscript(channel, ticketData) {
  const messages = await channel.messages.fetch({ limit: 100 }).catch(() => null);
  if (!messages) return null;

  const sorted = [...messages.values()].reverse();

  const rows = sorted.map(msg => {
    const time    = new Date(msg.createdTimestamp).toLocaleString('fr-FR');
    const author  = msg.author.bot
      ? `<span class="bot">${escHtml(msg.author.username)} 🤖</span>`
      : `<span class="user">${escHtml(msg.author.username)}</span>`;
    const content = escHtml(msg.content || '');
    const embeds  = msg.embeds.length
      ? `<div class="embed-note">[${msg.embeds.length} embed(s)]</div>`
      : '';
    return `
      <div class="msg">
        <span class="time">${time}</span>
        <span class="author">${author}</span>
        <span class="content">${content}${embeds}</span>
      </div>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Transcript — ${escHtml(channel.name)}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:#1a1a2e;color:#e0e0e0;font-family:'Segoe UI',sans-serif;padding:24px}
    h1{font-size:1.4rem;color:#7C3AED;margin-bottom:4px}
    .meta{font-size:.8rem;color:#888;margin-bottom:20px}
    .msg{display:flex;gap:12px;padding:8px 12px;border-radius:6px;margin-bottom:4px}
    .msg:hover{background:#24243e}
    .time{flex-shrink:0;font-size:.75rem;color:#666;min-width:130px;padding-top:2px}
    .author{flex-shrink:0;min-width:160px;font-weight:600}
    .user{color:#7C3AED}
    .bot{color:#5865F2}
    .content{color:#ccc;word-break:break-word}
    .embed-note{color:#f59e0b;font-size:.8rem;font-style:italic}
    footer{margin-top:24px;font-size:.75rem;color:#555;text-align:center}
  </style>
</head>
<body>
  <h1>📋 Transcript — #${escHtml(channel.name)}</h1>
  <div class="meta">
    Type : ${escHtml(ticketData.type.name)} &nbsp;|&nbsp;
    Créé par : ${escHtml(ticketData.ownerTag)} &nbsp;|&nbsp;
    Fermé le : ${new Date().toLocaleString('fr-FR')}
  </div>
  ${rows}
  <footer>Street Nova — Système de tickets automatisé</footer>
</body>
</html>`;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Envoie le transcript HTML dans le salon de logs et en MP à l'owner.
 */
async function sendTranscript(guild, channel, ticketData) {
  const html    = await generateTranscript(channel, ticketData);
  if (!html) return;

  const buffer  = Buffer.from(html, 'utf-8');
  const attach  = { attachment: buffer, name: `transcript-${channel.name}.html` };

  // Logs
  const logChannel = guild.channels.cache.get(ticketData.type.logChannel);
  if (logChannel) {
    const logEmbed = new EmbedBuilder()
      .setTitle('📁 Ticket Fermé — Transcript')
      .setDescription(
        `**Salon :** #${channel.name}\n` +
        `**Type :** ${ticketData.type.name}\n` +
        `**Créé par :** <@${ticketData.ownerId}> *(${ticketData.ownerTag})*\n` +
        `**Fermé le :** ${new Date().toLocaleString('fr-FR')}`
      )
      .setColor(0x7C3AED)
      .setTimestamp();
    await logChannel.send({ embeds: [logEmbed], files: [attach] }).catch(() => {});
  }

  // MP à l'owner
  try {
    const owner = await guild.members.fetch(ticketData.ownerId);
    const dmEmbed = new EmbedBuilder()
      .setTitle('📋 Votre ticket a été fermé')
      .setDescription(
        `Votre ticket **${ticketData.type.name}** sur **Street Nova** a été fermé.\n` +
        `Vous trouverez ci-joint le transcript complet de vos échanges.`
      )
      .setColor(0x7C3AED)
      .setTimestamp();
    await owner.user.send({ embeds: [dmEmbed], files: [{ attachment: Buffer.from(html, 'utf-8'), name: `transcript-${channel.name}.html` }] }).catch(() => {});
  } catch (_) {}
}

/**
 * Construit les boutons d'action du ticket.
 */
function buildTicketActionRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_claim')
      .setLabel('🙋 Prendre en charge')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('ticket_unclaim')
      .setLabel('↩️ Retirer prise en charge')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('ticket_transfer')
      .setLabel('🔄 Transférer la prise en charge')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('ticket_close')
      .setLabel('🔒 Fermer le ticket')
      .setStyle(ButtonStyle.Danger),
  );
}

/**
 * Crée un salon de ticket et envoie l'embed d'ouverture.
 */
async function createTicket(guild, member, typeKey) {
  const type = TICKET_CATEGORIES[typeKey];
  ticketCounters[typeKey]++;
  const count   = ticketCounters[typeKey];
  saveCounters(ticketCounters); // Persistance du compteur
  const name    = `${type.prefix}-${count}`;

  // Permissions : tout le monde deny, staff + owner allow
  const permOverwrites = [
    {
      id: guild.roles.everyone,
      deny: [PermissionFlagsBits.ViewChannel],
    },
    {
      id: member.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
      ],
    },
    ...STAFF_ROLES.map(roleId => ({
      id: roleId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.ManageMessages,
      ],
    })),
  ];

  const channel = await guild.channels.create({
    name,
    type        : ChannelType.GuildText,
    parent      : type.id,
    permissionOverwrites: permOverwrites,
    topic       : `Ticket ${type.name} — Créé par ${member.user.tag}`,
  });

  // Stocke les données du ticket
  openTickets.set(channel.id, {
    ownerId   : member.id,
    ownerTag  : member.user.tag,
    claimedBy : null,
    type,
    typeKey,
    number    : count,
  });

  // Mentions à l'ouverture
  const mentions = [
    ...PING_ROLES.map(r => `<@&${r}>`),
    `<@${member.id}>`,
  ].join(' ');

  const embed = new EmbedBuilder()
    .setTitle(`🎫 Ticket — ${type.name}`)
    .setDescription(
      `Bonjour, <@${member.id}> 👋\n\n` +
      `Votre ticket **${type.name}** a bien été ouvert avec succès.\n\n` +
      `> 🕐 Un membre de notre équipe de support prendra en charge votre demande dans les plus brefs délais. Merci de votre patience.\n\n` +
      `> 📌 En attendant, n'hésitez pas à décrire votre problème en détail afin d'accélérer le traitement.\n\n` +
      `**Numéro de ticket :** \`#${count}\`\n` +
      `**Type :** ${type.name}`
    )
    .setColor(0x7C3AED)
    .setFooter({ text: 'Street Nova — Support' })
    .setTimestamp();

  await channel.send({
    content: mentions,
    embeds : [embed],
    components: [buildTicketActionRow()],
  });

  console.log(`✅ [TICKETS] Ticket ${name} créé par ${member.user.tag}`);
  return channel;
}

// ══════════════════════════════════════════════════════════════════════
//   MODULE PRINCIPAL
// ══════════════════════════════════════════════════════════════════════

module.exports = function(client) {

  // ── Cache des invitations ─────────────────────────────────────────
  const inviteCache = new Map();

  // ── Map anti-doublon ticket : userId → Set de typeKey ouverts ────
  const userOpenTickets = new Map(); // userId → Set<typeKey>

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

  // ── Bienvenue via webhook ─────────────────────────────────────────
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

  // ── Boost via webhook ─────────────────────────────────────────────
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

  // ── Commande règlement ────────────────────────────────────────────
  client.on('messageCreate', async function(message) {
    if (message.guild?.id !== GUILD_ID) return;

    // ── Commande !reglement-streetnova ──
    if (message.channel.id === CHANNEL_ID && message.content === COMMANDE) {
      await message.delete().catch(() => {});
      if (message.author.id !== message.guild.ownerId) return;

      const embed = new EmbedBuilder()
        .setTitle('📋 Règlement du Serveur')
        .setDescription(
          '**Bienvenue sur le serveur ! Merci de lire et respecter les règles suivantes :**\n\n' +
          '🟦 **1 Respectez tout le monde**\nAucune insulte, discrimination ou harcèlement ne sera toléré.\n\n' +
          '🟦 **2 Pas de spam**\nÉvitez les messages répétitifs, les majuscules excessives et les floods.\n\n' +
          '🟦 **3 Pas de publicité**\nToute publicité non autorisée est interdite.\n\n' +
          '🟦 **4 Contenu approprié**\nAucun contenu NSFW, choquant ou illégal ne sera toléré.\n\n' +
          '🟦 **5 Respectez les salons**\nUtilisez chaque salon pour son usage prévu.\n\n' +
          '🟦 **6 Pas d\'usurpation d\'identité**\nIl est interdit de se faire passer pour un autre membre ou un staff.\n\n' +
          '🟦 **7 Suivez les directives de Discord**\nLes [CGU de Discord](https://discord.com/terms) s\'appliquent sur ce serveur.\n\n' +
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
      return;
    }

    // ── Commande !ticketsupport_streetnova ──
    if (message.content === '!ticketsupport_streetnova') {
      if (message.guild?.id !== GUILD_ID) return;
      await message.delete().catch(() => {});
      if (message.author.id !== message.guild.ownerId) return;

      const embed = new EmbedBuilder()
        .setTitle('🛹 Street Nova — Support')
        .setDescription(
          '**Bienvenue au support officiel de Street Nova.**\n\n' +
          'Notre équipe est disponible pour vous accompagner dans toutes vos démarches. ' +
          'Sélectionnez la catégorie correspondant à votre demande en cliquant sur l\'un des boutons ci-dessous.\n\n' +
          '> 🔵 **Aide à la Vérification** — Vous rencontrez un problème lors de votre vérification sur le serveur ?\n' +
          '> 🔴 **Aide Débannissement** — Vous souhaitez faire appel d\'un bannissement ?\n' +
          '> 🟢 **Aide Question** — Vous avez une question générale sur le serveur ?\n' +
          '> 🟡 **Aide Signalement** — Vous souhaitez signaler un membre ou un comportement ?\n' +
          '> ⚪ **Autre Aide** — Votre demande ne rentre dans aucune catégorie ci-dessus ?\n\n' +
          '*Nos équipes s\'engagent à traiter votre demande dans les meilleurs délais. Merci de votre confiance.*'
        )
        .setColor(0x7C3AED)
        .setFooter({ text: 'Street Nova — Un seul ticket actif par catégorie et par personne.' })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ticket_open_verif')    .setLabel('🔵 Aide à la Vérification').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('ticket_open_unban')    .setLabel('🔴 Aide Débannissement')   .setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('ticket_open_question') .setLabel('🟢 Aide Question')         .setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('ticket_open_report')   .setLabel('🟡 Aide Signalement')      .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('ticket_open_other')    .setLabel('⚪ Autre Aide')             .setStyle(ButtonStyle.Secondary),
      );

      await message.channel.send({ embeds: [embed], components: [row] });
      console.log(`✅ [TICKETS] Panel support posté.`);
    }
  });

  // ── Interactions (boutons) ─────────────────────────────────────────
  client.on('interactionCreate', async function(interaction) {
    if (!interaction.isButton()) return;
    if (interaction.guild?.id !== GUILD_ID) return;

    const { customId, member, guild } = interaction;

    // ════════════════════════════════════
    //  RÈGLEMENT
    // ════════════════════════════════════
    if (customId === 'accepter_reglement_streetnova') {
      if (member.roles.cache.has(ROLE_REGLEMENT_ID)) {
        return interaction.reply({ content: '❌ Vous avez déjà accepté le règlement !', ephemeral: true });
      }
      try {
        await member.roles.add(ROLE_REGLEMENT_ID);
        await interaction.reply({ content: '✅ Vous avez accepté le règlement et obtenu l\'accès au serveur !', ephemeral: true });
        console.log(`✅ [STREETNOVA] Règlement accepté par : ${member.user.username}`);
      } catch (err) {
        console.error(`❌ [STREETNOVA] Erreur ajout rôle règlement : ${err.message}`);
        await interaction.reply({ content: '❌ Une erreur est survenue, contacte un administrateur.', ephemeral: true });
      }
      return;
    }

    // ════════════════════════════════════
    //  OUVERTURE DE TICKETS
    // ════════════════════════════════════
    const openMap = {
      'ticket_open_verif'    : 'verif',
      'ticket_open_unban'    : 'unban',
      'ticket_open_question' : 'question',
      'ticket_open_report'   : 'report',
      'ticket_open_other'    : 'other',
    };

    if (openMap[customId]) {
      const typeKey = openMap[customId];

      // Anti-doublon : vérifie si l'utilisateur a déjà un ticket de ce type
      const userTickets = userOpenTickets.get(member.id) ?? new Set();
      if (userTickets.has(typeKey)) {
        return interaction.reply({
          content: `❌ Vous avez déjà un ticket **${TICKET_CATEGORIES[typeKey].name}** ouvert. Merci de le clore avant d'en ouvrir un nouveau.`,
          ephemeral: true,
        });
      }

      await interaction.deferReply({ ephemeral: true });

      try {
        const channel = await createTicket(guild, member, typeKey);
        userTickets.add(typeKey);
        userOpenTickets.set(member.id, userTickets);

        await interaction.editReply({
          content: `✅ Votre ticket a été créé avec succès : <#${channel.id}>`,
        });
      } catch (err) {
        console.error(`❌ [TICKETS] Erreur création ticket : ${err.message}`);
        await interaction.editReply({ content: '❌ Une erreur est survenue lors de la création du ticket.' });
      }
      return;
    }

    // ════════════════════════════════════
    //  ACTIONS SUR LES TICKETS
    // ════════════════════════════════════
    const ticketData = openTickets.get(interaction.channelId);
    if (!ticketData) return;

    const _isAdmin = isTicketAdmin(member);
    const _isStaff = isStaff(member);
    const _isOwner = member.id === ticketData.ownerId;

    // Vérif générale : seuls les staff peuvent utiliser les boutons d'action
    if (!_isStaff && !_isOwner) {
      return interaction.reply({ content: '❌ Vous n\'avez pas la permission d\'utiliser ce bouton.', ephemeral: true });
    }

    // ── Prendre en charge ──
    if (customId === 'ticket_claim') {
      if (!_isStaff) {
        return interaction.reply({ content: '❌ Seul un membre du staff peut prendre en charge un ticket.', ephemeral: true });
      }
      // Déjà pris en charge par soi-même → message discret
      if (ticketData.claimedBy === member.id) {
        return interaction.reply({ content: '✅ Vous avez déjà la prise en charge de ce ticket.', ephemeral: true });
      }
      // Pris en charge par quelqu'un d'autre
      if (ticketData.claimedBy && ticketData.claimedBy !== member.id) {
        if (!_isAdmin) {
          return interaction.reply({
            content: `❌ Ce ticket est déjà pris en charge par <@${ticketData.claimedBy}>. Utilisez le bouton **Transférer** pour récupérer la propriété.`,
            ephemeral: true,
          });
        }
        // Admin qui reprend la claim de force
        const prev = ticketData.claimedBy;
        ticketData.claimedBy = member.id;
        await interaction.reply({ content: `🔁 <@${member.id}> (admin) a repris la prise en charge de <@${prev}>.` });
        return;
      }
      ticketData.claimedBy = member.id;
      await interaction.reply({ content: `✅ <@${member.id}> a pris en charge ce ticket.` });
      return;
    }

    // ── Retirer prise en charge ──
    if (customId === 'ticket_unclaim') {
      if (!ticketData.claimedBy) {
        return interaction.reply({ content: '❌ Ce ticket n\'est actuellement pris en charge par personne.', ephemeral: true });
      }
      const isClaimOwner = ticketData.claimedBy === member.id;
      if (!isClaimOwner && !_isAdmin) {
        return interaction.reply({ content: '❌ Seul la personne ayant pris en charge le ticket (ou un administrateur) peut retirer la prise en charge.', ephemeral: true });
      }
      const prev = ticketData.claimedBy;
      ticketData.claimedBy = null;
      await interaction.reply({
        content: `↩️ <@${prev}> a retiré sa prise en charge de ce ticket.`,
      });
      return;
    }

    // ── Transférer la prise en charge ──
    if (customId === 'ticket_transfer') {
      const isClaimOwner = ticketData.claimedBy === member.id;
      if (!isClaimOwner && !_isAdmin) {
        return interaction.reply({
          content: '❌ Seul la personne ayant la propriété du ticket (ou un administrateur) peut effectuer un transfert.',
          ephemeral: true,
        });
      }
      await interaction.reply({
        content:
          '🔄 **Transfert de prise en charge**\n' +
          'Mentionnez le membre du staff à qui vous souhaitez transférer la propriété de ce ticket.\n' +
          '*Exemple :* `@Pseudo`',
        ephemeral: false,
      });

      // Collecteur : attend une mention dans le salon
      const filter  = m => m.author.id === member.id && m.mentions.members.size > 0;
      const collector = interaction.channel.createMessageCollector({ filter, max: 1, time: 30_000 });

      collector.on('collect', async msg => {
        const target = msg.mentions.members.first();
        if (!target) return;
        if (!isStaff(target) && !isTicketAdmin(target)) {
          await msg.reply({ content: '❌ Ce membre n\'est pas un membre du staff.', ephemeral: true });
          return;
        }
        const prev = ticketData.claimedBy;
        ticketData.claimedBy = target.id;
        await msg.reply(
          `🔄 La propriété du ticket a été transférée de <@${prev ?? member.id}> à <@${target.id}>.`
        );
      });

      collector.on('end', (collected, reason) => {
        if (reason === 'time' && collected.size === 0) {
          interaction.channel.send('⏱️ Délai expiré, aucun transfert effectué.').catch(() => {});
        }
      });
      return;
    }

    // ── Fermer le ticket ──
    if (customId === 'ticket_close') {
      const canClose = _isAdmin || _isOwner || (ticketData.claimedBy === member.id);
      if (!canClose) {
        return interaction.reply({
          content: '❌ Seul le propriétaire du ticket, le membre l\'ayant pris en charge ou un administrateur peut fermer ce ticket.',
          ephemeral: true,
        });
      }

      await interaction.reply({
        content: '🔒 Fermeture du ticket en cours — génération du transcript...',
      });

      try {
        await sendTranscript(guild, interaction.channel, ticketData);
      } catch (err) {
        console.error(`❌ [TICKETS] Erreur transcript : ${err.message}`);
      }

      // Retirer le ticket de la map user
      const userTickets = userOpenTickets.get(ticketData.ownerId);
      if (userTickets) {
        userTickets.delete(ticketData.typeKey);
        if (userTickets.size === 0) userOpenTickets.delete(ticketData.ownerId);
      }
      openTickets.delete(interaction.channelId);

      await interaction.channel.delete(`Ticket fermé par ${member.user.tag}`).catch(() => {});
      console.log(`✅ [TICKETS] Ticket ${interaction.channel.name} fermé par ${member.user.tag}`);
      return;
    }
  });

};
