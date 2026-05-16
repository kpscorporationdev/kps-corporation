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

// ══════════════════════════════════════════════════════════════════════
//   PERSISTANCE DES COMPTEURS
// ══════════════════════════════════════════════════════════════════════

const COUNTERS_FILE = path.join(__dirname, 'ticket_counters.json');

function loadCounters() {
  try {
    if (fs.existsSync(COUNTERS_FILE)) {
      return JSON.parse(fs.readFileSync(COUNTERS_FILE, 'utf-8'));
    }
  } catch (_) {}
  return {
    verif: 0, unban: 0, question: 0, report: 0, other: 0,
    m_unban: 0, m_report: 0, m_bug: 0, m_staff: 0, m_other: 0,
    c_custom: 0, c_modo: 0, c_support: 0,
  };
}

function saveCounters(counters) {
  try {
    fs.writeFileSync(COUNTERS_FILE, JSON.stringify(counters, null, 2), 'utf-8');
  } catch (err) {
    console.error(`[TICKETS] Erreur sauvegarde compteurs : ${err.message}`);
  }
}

// ══════════════════════════════════════════════════════════════════════
//   CONFIGURATION GLOBALE — STREETNOVA
// ══════════════════════════════════════════════════════════════════════

const GUILD_ID          = '1432658174967677033';
const CHANNEL_ID        = '1432658603273097216';
const ROLE_REGLEMENT_ID = '1502685338307661935';
const COMMANDE          = '!reglement-streetnova';

// ════════════════════════════════════
//  SYSTEME 1 — SUPPORT
// ════════════════════════════════════

const SUPPORT_CATEGORIES = {
  verif    : { id: '1504102263042478141', name: '🪪 Aide a la Verification', prefix: 'ticket-verif',    logChannel: '1504380575908368384' },
  unban    : { id: '1504114655331745903', name: '🔨 Aide Debannissement',    prefix: 'ticket-unban',    logChannel: '1504380645013458994' },
  question : { id: '1504115082760683530', name: '💬 Aide Question',          prefix: 'ticket-question', logChannel: '1504380726328557659' },
  report   : { id: '1504115141745053847', name: '🚨 Aide Signalement',       prefix: 'ticket-report',   logChannel: '1504380760038051910' },
  other    : { id: '1504115231213748347', name: '🎫 Autre Aide',             prefix: 'ticket-others',   logChannel: '1504380793538216058' },
};

const SUPPORT_STAFF_ROLES = [
  '1495444713136984215',
  '1495035067767066764',
  '1487792404886065172',
  '1504369719929606175',
  '1504367314294931456',
  '1504367295852576819',
  '1504367284792197120',
];

const SUPPORT_PING_ROLES = [
  '1504367314294931456',
  '1504367295852576819',
  '1504367284792197120',
];

const SUPPORT_ADMIN_ROLES = [
  '1487792404886065172',
  '1504372115305005176',
  '1504369719929606175',
];

// ════════════════════════════════════
//  SYSTEME 2 — MODERATION
// ════════════════════════════════════

const MODO_CATEGORIES = {
  m_unban  : { id: '1504765855148412948', name: '🔨 Debannissement',   prefix: 'ticket-unban',        logChannel: '1504768291011297280' },
  m_report : { id: '1504765975805825034', name: '🚨 Signalement',       prefix: 'ticket-report',       logChannel: '1504768316961722478' },
  m_bug    : { id: '1504766122153480282', name: '🐛 Signalement Bug',   prefix: 'ticket-report-bug',   logChannel: '1504768357239361556' },
  m_staff  : { id: '1504766210431127592', name: '🛡️ Signalement Staff', prefix: 'ticket-report-staff', logChannel: '1504768413430579241' },
  m_other  : { id: '1504766711717564477', name: '🎫 Autre Aide',        prefix: 'ticket-others',       logChannel: '1504768458317893782' },
};

const MODO_STAFF_ROLES = [
  '1495444713136984215',
  '1495035067767066764',
  '1487792404886065172',
  '1504369783393488966',
  '1504368202359242792',
  '1504368229726945280',
  '1504368202136813669',
];

const MODO_PING_ROLES = [
  '1504368202359242792',
  '1504368229726945280',
  '1504368202136813669',
];

const MODO_ADMIN_ROLES = [
  '1487792404886065172',
  '1504372115305005176',
  '1504369783393488966',
];

// Roles exclusifs au ticket Signalement Staff
const MODO_STAFF_REPORT_STAFF_ROLES = [
  '1487792404886065172',
  '1504947070556176384',
  '1504372115305005176',
];


// ════════════════════════════════════
//  SYSTEME 3 — CANDIDATURES
// ════════════════════════════════════

const CANDID_CATEGORIES = {
  c_custom  : { id: '1505117059137409166', name: '🎨 Devenir Customiseur', prefix: 'candid-customiseur', logChannel: '1505117499828605040' },
  c_modo    : { id: '1505117169820762212', name: '🛡️ Devenir Moderateur',  prefix: 'candid-modo',        logChannel: '1505117414055084043' },
  c_support : { id: '1505117206562996325', name: '🎧 Devenir Support',     prefix: 'candid-support',     logChannel: '1505117454169276486' },
};

// Roles de base communs a toutes les candidatures
const CANDID_STAFF_ROLES_BASE = [
  '1495444713136984215',
  '1495035067767066764',
  '1487792404886065172',
  '1504372115305005176',
];

const CANDID_PING_ROLES_BASE = [
  '1487792404886065172',
  '1504372115305005176',
];

const CANDID_ADMIN_ROLES_BASE = [
  '1487792404886065172',
  '1504372115305005176',
];

// Roles specifiques par type de candidature (acces + admin exclusif)
const CANDID_EXTRA = {
  c_custom  : { role: '1505125084338196551' }, // Admin + acces Customiseur uniquement
  c_modo    : { role: '1504369783393488966' }, // Admin + acces Modo uniquement
  c_support : { role: '1504369719929606175' }, // Admin + acces Support uniquement
};

// Retourne la config complete (staff, ping, admin) pour un typeKey candid
function getCandidConfig(typeKey) {
  const extra = CANDID_EXTRA[typeKey]?.role;
  return {
    categories : CANDID_CATEGORIES,
    staffRoles : extra ? [...CANDID_STAFF_ROLES_BASE, extra] : CANDID_STAFF_ROLES_BASE,
    pingRoles  : extra ? [...CANDID_PING_ROLES_BASE, extra]  : CANDID_PING_ROLES_BASE,
    adminRoles : extra ? [...CANDID_ADMIN_ROLES_BASE, extra] : CANDID_ADMIN_ROLES_BASE,
    system     : 'candid',
  };
}

// ══════════════════════════════════════════════════════════════════════
//   ETAT GLOBAL
// ══════════════════════════════════════════════════════════════════════

const ticketCounters  = loadCounters();
const openTickets     = new Map();
const userOpenTickets = new Map();

// ══════════════════════════════════════════════════════════════════════
//   UTILITAIRE WEBHOOK
// ══════════════════════════════════════════════════════════════════════

function sendWebhook(webhookUrl, payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const url  = new URL(webhookUrl);
    const lib  = url.protocol === 'https:' ? https : http;
    const req  = lib.request({
      hostname : url.hostname,
      path     : url.pathname + url.search,
      method   : 'POST',
      headers  : { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
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

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function generateTranscript(channel, ticketData) {
  const messages = await channel.messages.fetch({ limit: 100 }).catch(() => null);
  if (!messages) return null;

  const sorted = [...messages.values()].reverse();
  const rows = sorted.map(msg => {
    const time   = new Date(msg.createdTimestamp).toLocaleString('fr-FR');
    const author = msg.author.bot
      ? `<span class="bot">${escHtml(msg.author.username)} 🤖</span>`
      : `<span class="user">${escHtml(msg.author.username)}</span>`;
    const content = escHtml(msg.content || '');
    const embeds  = msg.embeds.length ? `<div class="embed-note">[${msg.embeds.length} embed(s)]</div>` : '';
    return `<div class="msg"><span class="time">${time}</span><span class="author">${author}</span><span class="content">${content}${embeds}</span></div>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <title>Transcript - ${escHtml(channel.name)}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:#1a1a2e;color:#e0e0e0;font-family:'Segoe UI',sans-serif;padding:24px}
    h1{font-size:1.4rem;color:#7C3AED;margin-bottom:4px}
    .meta{font-size:.8rem;color:#888;margin-bottom:20px}
    .msg{display:flex;gap:12px;padding:8px 12px;border-radius:6px;margin-bottom:4px}
    .msg:hover{background:#24243e}
    .time{flex-shrink:0;font-size:.75rem;color:#666;min-width:130px;padding-top:2px}
    .author{flex-shrink:0;min-width:160px;font-weight:600}
    .user{color:#7C3AED}.bot{color:#5865F2}
    .content{color:#ccc;word-break:break-word}
    .embed-note{color:#f59e0b;font-size:.8rem;font-style:italic}
    footer{margin-top:24px;font-size:.75rem;color:#555;text-align:center}
  </style>
</head>
<body>
  <h1>Transcript - #${escHtml(channel.name)}</h1>
  <div class="meta">Type : ${escHtml(ticketData.type.name)} | Systeme : ${escHtml(ticketData.system)} | Cree par : ${escHtml(ticketData.ownerTag)} | Ferme le : ${new Date().toLocaleString('fr-FR')}</div>
  ${rows}
  <footer>Street Nova - Systeme de tickets automatise</footer>
</body>
</html>`;
}

async function sendTranscript(guild, channel, ticketData) {
  const html = await generateTranscript(channel, ticketData);
  if (!html) return;

  const fileName = `transcript-${channel.name}.html`;
  const buf      = Buffer.from(html, 'utf-8');

  const isCandid = ticketData.system === 'candid';
  const logTitle = isCandid ? 'Candidature Fermee - Transcript' : 'Ticket Ferme - Transcript';
  const dmTitle  = isCandid ? 'Votre candidature a ete fermee' : 'Votre ticket a ete ferme';
  const logDesc  = isCandid
    ? `**Salon :** #${channel.name}\n**Type :** ${ticketData.type.name}\n**Candidat :** <@${ticketData.ownerId}> (${ticketData.ownerTag})\n**Fermee le :** ${new Date().toLocaleString('fr-FR')}`
    : `**Salon :** #${channel.name}\n**Systeme :** ${ticketData.system}\n**Type :** ${ticketData.type.name}\n**Cree par :** <@${ticketData.ownerId}> (${ticketData.ownerTag})\n**Ferme le :** ${new Date().toLocaleString('fr-FR')}`;
  const dmDesc = isCandid
    ? `Votre candidature **${ticketData.type.name}** sur **Street Nova** a ete fermee.\nVous trouverez ci-joint le transcript complet de vos echanges.`
    : `Votre ticket **${ticketData.type.name}** sur **Street Nova** a ete ferme.\nVous trouverez ci-joint le transcript complet de vos echanges.`;

  const logChannel = guild.channels.cache.get(ticketData.type.logChannel);
  if (logChannel) {
    const logEmbed = new EmbedBuilder()
      .setTitle(logTitle)
      .setDescription(logDesc)
      .setColor(isCandid ? 0xF5A623 : 0x7C3AED)
      .setTimestamp();
    await logChannel.send({ embeds: [logEmbed], files: [{ attachment: buf, name: fileName }] }).catch(() => {});
  }

  try {
    const owner = await guild.members.fetch(ticketData.ownerId);
    const dmEmbed = new EmbedBuilder()
      .setTitle(dmTitle)
      .setDescription(dmDesc)
      .setColor(isCandid ? 0xF5A623 : 0x7C3AED)
      .setTimestamp();
    await owner.user.send({ embeds: [dmEmbed], files: [{ attachment: Buffer.from(html, 'utf-8'), name: fileName }] }).catch(() => {});
  } catch (_) {}
}

function buildTicketActionRow(system) {
  const p = system === 'modo' ? 'tm' : system === 'candid' ? 'tc' : 'ts';
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`${p}_claim`)   .setLabel('🙋 Prendre en charge')           .setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`${p}_unclaim`) .setLabel('↩️ Retirer prise en charge')      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`${p}_transfer`).setLabel('🔄 Transferer la prise en charge').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`${p}_close`)   .setLabel('🔒 Fermer le ticket')             .setStyle(ButtonStyle.Danger),
  );
}

async function createTicket(guild, member, typeKey, config) {
  const { categories, staffRoles, pingRoles, system } = config;
  const type = categories[typeKey];

  ticketCounters[typeKey] = (ticketCounters[typeKey] ?? 0) + 1;
  const count = ticketCounters[typeKey];
  saveCounters(ticketCounters);

  const name = `${type.prefix}-${count}`;

  // Roles effectifs (Signalement Staff = acces restreint)
  const effectiveStaffRoles = (typeKey === 'm_staff') ? MODO_STAFF_REPORT_STAFF_ROLES : staffRoles;
  const effectivePingRoles  = (typeKey === 'm_staff') ? MODO_STAFF_REPORT_STAFF_ROLES : pingRoles;

  const permOverwrites = [
    { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
    {
      id   : member.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
      ],
    },
    ...effectiveStaffRoles.map(roleId => ({
      id   : roleId,
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
    type                : ChannelType.GuildText,
    parent              : type.id,
    permissionOverwrites: permOverwrites,
    topic               : `Ticket ${type.name} - Cree par ${member.user.tag}`,
  });

  openTickets.set(channel.id, {
    ownerId  : member.id,
    ownerTag : member.user.tag,
    claimedBy: null,
    type,
    typeKey,
    number   : count,
    system,
    config,
  });

  const mentions = [...effectivePingRoles.map(r => `<@&${r}>`), `<@${member.id}>`].join(' ');

  const embed = new EmbedBuilder()
    .setTitle(`🎫 Ticket - ${type.name}`)
    .setDescription(
      `Bonjour, <@${member.id}> 👋\n\n` +
      `Votre ticket **${type.name}** a bien ete ouvert avec succes.\n\n` +
      `> 🕐 Un membre de notre equipe prendra en charge votre demande dans les plus brefs delais. Merci de votre patience.\n\n` +
      `> 📌 En attendant, n'hesitez pas a decrire votre situation en detail afin d'accelerer le traitement.\n\n` +
      `**Numero de ticket :** \`#${count}\`\n` +
      `**Type :** ${type.name}\n` +
      `**Systeme :** ${system === 'modo' ? '🛡️ Moderation' : '🎧 Support'}`
    )
    .setColor(system === 'modo' ? 0x4FC3F7 : 0x2ECC71)
    .setFooter({ text: `Street Nova - ${system === 'modo' ? 'Moderation' : 'Support'}` })
    .setTimestamp();

  await channel.send({ content: mentions, embeds: [embed], components: [buildTicketActionRow(system)] });
  console.log(`✅ [TICKETS/${system.toUpperCase()}] Ticket ${name} cree par ${member.user.tag}`);
  return channel;
}

async function handleTicketAction(interaction, action, ticketData) {
  const { member, guild } = interaction;
  const { config }        = ticketData;

  const _isAdmin = config.adminRoles.some(r => member.roles.cache.has(r));
  const _isStaff = config.staffRoles.some(r => member.roles.cache.has(r));
  const _isOwner = member.id === ticketData.ownerId;

  if (!_isStaff && !_isOwner) {
    return interaction.reply({ content: '❌ Vous n\'avez pas la permission d\'utiliser ce bouton.', ephemeral: true });
  }

  if (action === 'claim') {
    if (!_isStaff) return interaction.reply({ content: '❌ Seul un membre du staff peut prendre en charge un ticket.', ephemeral: true });
    if (ticketData.claimedBy === member.id) return interaction.reply({ content: '✅ Vous avez deja la prise en charge de ce ticket.', ephemeral: true });
    if (ticketData.claimedBy && ticketData.claimedBy !== member.id) {
      if (!_isAdmin) {
        return interaction.reply({
          content  : `❌ Ce ticket est deja pris en charge par <@${ticketData.claimedBy}>. Utilisez le bouton **Transferer** pour recuperer la propriete.`,
          ephemeral: true,
        });
      }
      const prev = ticketData.claimedBy;
      ticketData.claimedBy = member.id;
      return interaction.reply({ content: `🔁 <@${member.id}> (admin) a repris la prise en charge de <@${prev}>.` });
    }
    ticketData.claimedBy = member.id;
    return interaction.reply({ content: `✅ <@${member.id}> a pris en charge ce ticket.` });
  }

  if (action === 'unclaim') {
    if (!ticketData.claimedBy) return interaction.reply({ content: '❌ Ce ticket n\'est actuellement pris en charge par personne.', ephemeral: true });
    if (ticketData.claimedBy !== member.id && !_isAdmin) {
      return interaction.reply({ content: '❌ Seule la personne ayant pris en charge le ticket (ou un administrateur) peut retirer la prise en charge.', ephemeral: true });
    }
    const prev = ticketData.claimedBy;
    ticketData.claimedBy = null;
    // Si c'est le claimeur lui-même qui retire
    if (prev === member.id) {
      return interaction.reply({ content: `↩️ <@${member.id}> a retire sa prise en charge de ce ticket.` });
    }
    // Si c'est un admin qui retire la propriete de quelqu'un d'autre
    return interaction.reply({ content: `↩️ <@${member.id}> a retire la prise en charge du ticket a <@${prev}>.` });
  }

  if (action === 'transfer') {
    if (ticketData.claimedBy !== member.id && !_isAdmin) {
      return interaction.reply({ content: '❌ Seule la personne ayant la propriete du ticket (ou un administrateur) peut effectuer un transfert.', ephemeral: true });
    }
    await interaction.reply({
      content:
        '🔄 **Transfert de prise en charge**\n' +
        'Mentionnez le membre du staff a qui vous souhaitez transferer la propriete de ce ticket.\n' +
        '*Exemple :* `@Pseudo`',
    });
    const filter    = m => m.author.id === member.id && m.mentions.members.size > 0;
    const collector = interaction.channel.createMessageCollector({ filter, max: 1, time: 30_000 });
    collector.on('collect', async msg => {
      const target = msg.mentions.members.first();
      if (!target) return;
      const targetIsStaff = config.staffRoles.some(r => target.roles.cache.has(r)) || config.adminRoles.some(r => target.roles.cache.has(r));
      if (!targetIsStaff) return msg.reply({ content: '❌ Ce membre n\'est pas un membre du staff.' });
      const prev = ticketData.claimedBy;
      ticketData.claimedBy = target.id;
      await msg.reply(`🔄 La propriete du ticket a ete transferee de <@${prev ?? member.id}> a <@${target.id}>.`);
    });
    collector.on('end', (collected, reason) => {
      if (reason === 'time' && collected.size === 0) interaction.channel.send('⏱️ Delai expire, aucun transfert effectue.').catch(() => {});
    });
    return;
  }

  if (action === 'close') {
    const canClose = _isAdmin || _isOwner || ticketData.claimedBy === member.id;
    if (!canClose) {
      return interaction.reply({ content: '❌ Seul le proprietaire du ticket, le membre l\'ayant pris en charge ou un administrateur peut fermer ce ticket.', ephemeral: true });
    }
    await interaction.reply({ content: '🔒 Fermeture du ticket en cours - generation du transcript...' });
    try { await sendTranscript(guild, interaction.channel, ticketData); } catch (err) { console.error(`❌ [TICKETS] Erreur transcript : ${err.message}`); }

    const userTickets = userOpenTickets.get(ticketData.ownerId);
    if (userTickets) {
      userTickets.delete(ticketData.typeKey);
      if (userTickets.size === 0) userOpenTickets.delete(ticketData.ownerId);
    }
    openTickets.delete(interaction.channelId);
    await interaction.channel.delete(`Ticket ferme par ${member.user.tag}`).catch(() => {});
    console.log(`✅ [TICKETS] Ticket ferme par ${member.user.tag}`);
  }
}

// ══════════════════════════════════════════════════════════════════════
//   MODULE PRINCIPAL
// ══════════════════════════════════════════════════════════════════════

module.exports = function(client) {

  const inviteCache = new Map();

  client.on('ready', async () => {
    const guild = client.guilds.cache.get(GUILD_ID);
    if (!guild) return;
    const invites = await guild.invites.fetch().catch(() => null);
    if (invites) invites.forEach(inv => inviteCache.set(inv.code, inv.uses));
    console.log(`✅ [STREETNOVA] ${invites?.size ?? 0} invitation(s) mise(s) en cache.`);
  });

  client.on('inviteCreate', invite => { if (invite.guild?.id !== GUILD_ID) return; inviteCache.set(invite.code, invite.uses); });
  client.on('inviteDelete', invite => { if (invite.guild?.id !== GUILD_ID) return; inviteCache.delete(invite.code); });

  // ── Bienvenue ──────────────────────────────────────────────────────
  client.on('guildMemberAdd', async member => {
    if (member.guild.id !== GUILD_ID) return;
    const webhookUrl = process.env.WEBHOOK_SN_ARRIVALS;
    if (!webhookUrl) { console.error('❌ [STREETNOVA] Variable WEBHOOK_SN_ARRIVALS manquante.'); return; }
    let methode = `***une methode inconnue*** ❓`;
    try {
      const newInvites = await member.guild.invites.fetch().catch(() => null);
      if (newInvites) {
        const usedInvite = newInvites.find(inv => (inviteCache.get(inv.code) ?? 0) < inv.uses);
        newInvites.forEach(inv => inviteCache.set(inv.code, inv.uses));
        if (usedInvite) {
          methode = usedInvite.inviter
            ? `***une invitation de*** **${usedInvite.inviter.username}** *(${usedInvite.uses})* 🔥`
            : `***le lien d'invitation personnalise du serveur*** 🔗`;
        } else if (member.guild.vanityURLCode) {
          methode = `***le lien d'invitation personnalise du serveur*** 🔗`;
        }
      }
    } catch (err) { console.error(`❌ [STREETNOVA] Erreur detection invitation : ${err.message}`); }
    try {
      await sendWebhook(webhookUrl, {
        content: `🛹 ***Bienvenue*** <@${member.user.id}> ***sur Street Nova !***\n╰➤ 🔗 __A rejoint via__ ${methode}`,
        allowed_mentions: { users: [member.user.id] },
      });
      console.log(`✅ [STREETNOVA] Bienvenue envoye pour : ${member.user.username}`);
    } catch (err) { console.error(`❌ [STREETNOVA] Erreur envoi webhook : ${err.message}`); }
  });

  // ── Boost ──────────────────────────────────────────────────────────
  client.on('guildMemberUpdate', async (oldMember, newMember) => {
    if (newMember.guild.id !== GUILD_ID) return;
    if (!(!oldMember.premiumSince && newMember.premiumSince)) return;
    const webhookUrl = process.env.WEBHOOK_SN_BOOST;
    if (!webhookUrl) { console.error('❌ [STREETNOVA] Variable WEBHOOK_SN_BOOST manquante.'); return; }
    try {
      await sendWebhook(webhookUrl, {
        content: `🛹 ***Merci*** <@${newMember.user.id}> ***d'avoir booste le serveur Street Nova !***`,
        allowed_mentions: { users: [newMember.user.id] },
      });
      console.log(`✅ [STREETNOVA] Boost detecte pour : ${newMember.user.username}`);
    } catch (err) { console.error(`❌ [STREETNOVA] Erreur envoi webhook boost : ${err.message}`); }
  });

  // ══════════════════════════════════════════════════════════════════
  //   COMMANDES
  // ══════════════════════════════════════════════════════════════════

  client.on('messageCreate', async function(message) {
    if (message.guild?.id !== GUILD_ID) return;

    // ── Reglement ──
    if (message.channel.id === CHANNEL_ID && message.content === COMMANDE) {
      await message.delete().catch(() => {});
      if (message.author.id !== message.guild.ownerId) return;
      const embed = new EmbedBuilder()
        .setTitle('📋 Reglement du Serveur')
        .setDescription(
          '**Bienvenue sur le serveur ! Merci de lire et respecter les regles suivantes :**\n\n' +
          '🟦 **1 Respectez tout le monde**\nAucune insulte, discrimination ou harcelement ne sera tolere.\n\n' +
          '🟦 **2 Pas de spam**\nEvitez les messages repetitifs, les majuscules excessives et les floods.\n\n' +
          '🟦 **3 Pas de publicite**\nToute publicite non autorisee est interdite.\n\n' +
          '🟦 **4 Contenu approprie**\nAucun contenu NSFW, choquant ou illegal ne sera tolere.\n\n' +
          '🟦 **5 Respectez les salons**\nUtilisez chaque salon pour son usage prevu.\n\n' +
          '🟦 **6 Pas d\'usurpation d\'identite**\nIl est interdit de se faire passer pour un autre membre ou un staff.\n\n' +
          '🟦 **7 Suivez les directives de Discord**\nLes [CGU de Discord](https://discord.com/terms) s\'appliquent sur ce serveur.\n\n' +
          '*En cliquant sur le bouton ci-dessous, vous acceptez le reglement et obtenez l\'acces au serveur.*'
        )
        .setColor(0x7C3AED)
        .setFooter({ text: 'Cliquez sur le bouton pour accepter le reglement' })
        .setTimestamp();
      await message.channel.send({
        embeds    : [embed],
        components: [new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('accepter_reglement_streetnova').setLabel('✅ Accepter le Reglement').setStyle(ButtonStyle.Success)
        )],
      });
      console.log('✅ [STREETNOVA] Reglement poste.');
      return;
    }

    // ── Panel Support ──
    if (message.content === '!ticketsupport_streetnova') {
      await message.delete().catch(() => {});
      if (message.author.id !== message.guild.ownerId) return;
      const embed = new EmbedBuilder()
        .setTitle('Street Nova — Support')
        .setDescription(
          'Selectionnez la categorie correspondant a votre demande.\n\n' +
          '🪪 **Aide a la Verification**\n' +
          '🔨 **Aide Debannissement**\n' +
          '💬 **Aide Question**\n' +
          '🚨 **Aide Signalement**\n' +
          '🎫 **Autre Aide**'
        )
        .setColor(0x2ECC71)
        .setFooter({ text: 'Street Nova — Support' });
      await message.channel.send({
        embeds    : [embed],
        components: [new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('ts_open_verif')   .setLabel('🪪 Aide a la Verification').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('ts_open_unban')   .setLabel('🔨 Aide Debannissement')   .setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId('ts_open_question').setLabel('💬 Aide Question')          .setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId('ts_open_report')  .setLabel('🚨 Aide Signalement')       .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId('ts_open_other')   .setLabel('🎫 Autre Aide')             .setStyle(ButtonStyle.Secondary),
        )],
      });
      console.log('✅ [TICKETS/SUPPORT] Panel support poste.');
      return;
    }

    // ── Panel Moderation ──
    if (message.content === '!ticketmodo_streetnova') {
      await message.delete().catch(() => {});
      if (message.author.id !== message.guild.ownerId) return;
      const embed = new EmbedBuilder()
        .setTitle('Street Nova — Moderation')
        .setDescription(
          'Selectionnez la categorie correspondant a votre demande.\n\n' +
          '🔨 **Debannissement**\n' +
          '🚨 **Signalement**\n' +
          '🐛 **Signalement Bug**\n' +
          '🛡️ **Signalement Staff**\n' +
          '🎫 **Autre Aide**'
        )
        .setColor(0x4FC3F7)
        .setFooter({ text: 'Street Nova — Moderation' });
      await message.channel.send({
        embeds    : [embed],
        components: [new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('tm_open_m_unban') .setLabel('🔨 Debannissement')   .setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId('tm_open_m_report').setLabel('🚨 Signalement')       .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId('tm_open_m_bug')   .setLabel('🐛 Signalement Bug')   .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId('tm_open_m_staff') .setLabel('🛡️ Signalement Staff') .setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('tm_open_m_other') .setLabel('🎫 Autre Aide')        .setStyle(ButtonStyle.Secondary),
        )],
      });
      console.log('✅ [TICKETS/MODO] Panel moderation poste.');
      return;
    }
    // ── Panel Candidatures ──
    if (message.content === '!candid_streetnova') {
      await message.delete().catch(() => {});
      if (message.author.id !== message.guild.ownerId) return;
      const embed = new EmbedBuilder()
        .setTitle('Street Nova — Candidatures')
        .setDescription(
          'Selectionnez le poste pour lequel vous souhaitez postuler.\n\n' +
          '🎨 **Devenir Customiseur**\n' +
          '🛡️ **Devenir Moderateur**\n' +
          '🎧 **Devenir Support**'
        )
        .setColor(0xF5A623)
        .setFooter({ text: 'Street Nova — Candidatures' });
      await message.channel.send({
        embeds    : [embed],
        components: [new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('tc_open_c_custom') .setLabel('🎨 Devenir Customiseur').setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId('tc_open_c_modo')   .setLabel('🛡️ Devenir Moderateur') .setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('tc_open_c_support').setLabel('🎧 Devenir Support')     .setStyle(ButtonStyle.Success),
        )],
      });
      console.log('✅ [CANDID] Panel candidatures poste.');
      return;
    }
  });

  // ══════════════════════════════════════════════════════════════════
  //   INTERACTIONS
  // ══════════════════════════════════════════════════════════════════

  client.on('interactionCreate', async function(interaction) {
    if (!interaction.isButton()) return;
    if (interaction.guild?.id !== GUILD_ID) return;

    const { customId, member, guild } = interaction;

    // ── Reglement ──
    if (customId === 'accepter_reglement_streetnova') {
      if (member.roles.cache.has(ROLE_REGLEMENT_ID)) {
        return interaction.reply({ content: '❌ Vous avez deja accepte le reglement !', ephemeral: true });
      }
      try {
        await member.roles.add(ROLE_REGLEMENT_ID);
        await interaction.reply({ content: '✅ Vous avez accepte le reglement et obtenu l\'acces au serveur !', ephemeral: true });
        console.log(`✅ [STREETNOVA] Reglement accepte par : ${member.user.username}`);
      } catch (err) {
        console.error(`❌ [STREETNOVA] Erreur ajout role reglement : ${err.message}`);
        await interaction.reply({ content: '❌ Une erreur est survenue, contacte un administrateur.', ephemeral: true });
      }
      return;
    }

    // ── Ouverture Support ──
    const supportOpenMap = { 'ts_open_verif': 'verif', 'ts_open_unban': 'unban', 'ts_open_question': 'question', 'ts_open_report': 'report', 'ts_open_other': 'other' };
    if (supportOpenMap[customId]) {
      const typeKey     = supportOpenMap[customId];
      const userTickets = userOpenTickets.get(member.id) ?? new Set();
      if (userTickets.has(typeKey)) {
        return interaction.reply({ content: `❌ Vous avez deja un ticket **${SUPPORT_CATEGORIES[typeKey].name}** ouvert. Veuillez le clore avant d'en creer un nouveau.`, ephemeral: true });
      }
      await interaction.deferReply({ ephemeral: true });
      try {
        const config  = { categories: SUPPORT_CATEGORIES, staffRoles: SUPPORT_STAFF_ROLES, pingRoles: SUPPORT_PING_ROLES, adminRoles: SUPPORT_ADMIN_ROLES, system: 'support' };
        const channel = await createTicket(guild, member, typeKey, config);
        userTickets.add(typeKey);
        userOpenTickets.set(member.id, userTickets);
        await interaction.editReply({ content: `✅ Votre ticket a ete cree avec succes : <#${channel.id}>` });
      } catch (err) {
        console.error(`❌ [TICKETS/SUPPORT] Erreur creation ticket : ${err.message}`);
        await interaction.editReply({ content: '❌ Une erreur est survenue lors de la creation du ticket.' });
      }
      return;
    }

    // ── Ouverture Modo ──
    const modoOpenMap = { 'tm_open_m_unban': 'm_unban', 'tm_open_m_report': 'm_report', 'tm_open_m_bug': 'm_bug', 'tm_open_m_staff': 'm_staff', 'tm_open_m_other': 'm_other' };
    if (modoOpenMap[customId]) {
      const typeKey     = modoOpenMap[customId];
      const userTickets = userOpenTickets.get(member.id) ?? new Set();
      if (userTickets.has(typeKey)) {
        return interaction.reply({ content: `❌ Vous avez deja un ticket **${MODO_CATEGORIES[typeKey].name}** ouvert. Veuillez le clore avant d'en creer un nouveau.`, ephemeral: true });
      }
      await interaction.deferReply({ ephemeral: true });
      try {
        const config  = { categories: MODO_CATEGORIES, staffRoles: MODO_STAFF_ROLES, pingRoles: MODO_PING_ROLES, adminRoles: MODO_ADMIN_ROLES, system: 'modo' };
        const channel = await createTicket(guild, member, typeKey, config);
        userTickets.add(typeKey);
        userOpenTickets.set(member.id, userTickets);
        await interaction.editReply({ content: `✅ Votre ticket a ete cree avec succes : <#${channel.id}>` });
      } catch (err) {
        console.error(`❌ [TICKETS/MODO] Erreur creation ticket : ${err.message}`);
        await interaction.editReply({ content: '❌ Une erreur est survenue lors de la creation du ticket.' });
      }
      return;
    }

    // ── Actions Support ──
    const supportActions = { 'ts_claim': 'claim', 'ts_unclaim': 'unclaim', 'ts_transfer': 'transfer', 'ts_close': 'close' };
    if (supportActions[customId]) {
      const ticketData = openTickets.get(interaction.channelId);
      if (!ticketData || ticketData.system !== 'support') return;
      return handleTicketAction(interaction, supportActions[customId], ticketData);
    }

    // ── Actions Modo ──
    const modoActions = { 'tm_claim': 'claim', 'tm_unclaim': 'unclaim', 'tm_transfer': 'transfer', 'tm_close': 'close' };
    if (modoActions[customId]) {
      const ticketData = openTickets.get(interaction.channelId);
      if (!ticketData || ticketData.system !== 'modo') return;
      return handleTicketAction(interaction, modoActions[customId], ticketData);
    }

    // ── Ouverture Candidatures ──
    const candidOpenMap = { 'tc_open_c_custom': 'c_custom', 'tc_open_c_modo': 'c_modo', 'tc_open_c_support': 'c_support' };
    if (candidOpenMap[customId]) {
      const typeKey     = candidOpenMap[customId];
      const userTickets = userOpenTickets.get(member.id) ?? new Set();
      if (userTickets.has(typeKey)) {
        return interaction.reply({ content: `❌ Vous avez deja une candidature **${CANDID_CATEGORIES[typeKey].name}** en cours. Veuillez attendre qu'elle soit traitee avant d'en soumettre une nouvelle.`, ephemeral: true });
      }
      await interaction.deferReply({ ephemeral: true });
      try {
        const config  = getCandidConfig(typeKey);
        const channel = await createTicket(guild, member, typeKey, config);
        userTickets.add(typeKey);
        userOpenTickets.set(member.id, userTickets);
        await interaction.editReply({ content: `✅ Votre candidature a ete soumise avec succes : <#${channel.id}>` });
      } catch (err) {
        console.error(`❌ [CANDID] Erreur creation candidature : ${err.message}`);
        await interaction.editReply({ content: '❌ Une erreur est survenue lors de la creation de la candidature.' });
      }
      return;
    }

    // ── Actions Candidatures ──
    const candidActions = { 'tc_claim': 'claim', 'tc_unclaim': 'unclaim', 'tc_transfer': 'transfer', 'tc_close': 'close' };
    if (candidActions[customId]) {
      const ticketData = openTickets.get(interaction.channelId);
      if (!ticketData || ticketData.system !== 'candid') return;
      return handleTicketAction(interaction, candidActions[customId], ticketData);
    }
  });

};
