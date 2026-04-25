const {
  Client, EmbedBuilder, ButtonBuilder, ButtonStyle,
  ActionRowBuilder, ChannelType, PermissionsBitField,
  AttachmentBuilder, ActivityType,
} = require('discord.js');
const fs   = require('fs');
const path = require('path');
const https = require('https');

// ══════════════════════════════════════════
//   CONFIGURATION GLOBALE
// ══════════════════════════════════════════
const BOT_TOKEN             = process.env.BOT_TOKEN;
const GUILD_ID              = process.env.GUILD_ID;
const ROLE_AUTO_ID          = process.env.ROLE_AUTO_ID;          // Rôle donné automatiquement à l'arrivée
const WEBHOOK_TOPIA = process.env.WEBHOOK_TOPIA; // URL du webhook de bienvenue
const ROLE_REGLEMENT_ID     = process.env.ROLE_REGLEMENT_ID;     // Rôle donné après acceptation du règlement
const SALON_REGLEMENT       = process.env.SALON_REGLEMENT;       // Salon où poster l'embed règlement (via !reglement)
const SALON_CANDID_EMBED    = process.env.SALON_CANDID_EMBED;    // Salon où poster l'embed candidatures
const SALON_SUPPORT_EMBED   = process.env.SALON_SUPPORT_EMBED;   // Salon où poster l'embed tickets Support
const SALON_MOD_EMBED       = process.env.SALON_MOD_EMBED;       // Salon où poster l'embed tickets Modérateur
const ROLE_CLAIM            = process.env.ROLE_CLAIM;            // Rôle autorisant le claim de ticket/candidature

// ── Rôles staff (accès candidatures & tickets support) ──
const ROLES_STAFF = [
  '1433052694670475334',
  '1432839854911127625',
  '1432472817349431365',
  '1474093816398221463',
  '1474093820785332458',
  '1474133714391793784',
];

// ── Rôles pouvant fermer les candidatures ──
const ROLES_CLOSE_CANDID = [
  '1433052694670475334',
  '1432839854911127625',
  '1432472817349431365',
  '1474093816398221463',
  '1474093820785332458',
  '1474133714391793784',
];

// ── Rôles staff accès tickets support ──
const ROLES_STAFF_SUPPORT = [
  '1432841223118262413',
  '1433053281327775845',
  '1432840939658940456',
  '1432840844754292766',
  '1433052694670475334',
  '1432839854911127625',
  '1432472817349431365',
  '1474093816398221463',
  '1474093820785332458',
  '1474133714391793784',
];

// ── Rôles modérateurs (accès tickets Modérateur) ──
const ROLES_MOD = [
  '1432840715020407014',
  '1433053130827894844',
  '1432472817349431360',
  '1432472817349431361',
  '1432839854911127625',
  '1432472817349431365',
  '1474093816398221463',
  '1474093820785332458',
];

// ── Mentions dans les tickets Modérateur ──
const PING_ROLES_MOD = [
  '1432840715020407014',
  '1433053130827894844',
  '1432472817349431360',
];

// ── Rôles pouvant fermer/transférer les tickets ──
const ROLES_TRANSFER = [
  '1432840844754292766',
  '1433052694670475334',
  '1432839854911127625',
  '1432472817349431365',
  '1474093816398221463',
  '1474093820785332458',
  '1474133714391793784',
];

// ── Rôles pouvant utiliser !forcetransfertclaim ──
const ROLES_FORCE_TRANSFER = [
  '1432840844754292766',
  '1433052694670475334',
  '1432839854911127625',
  '1432472817349431365',
  '1474093816398221463',
  '1474093820785332458',
];

// ══════════════════════════════════════════
//   TYPES DE CANDIDATURES
// ══════════════════════════════════════════
const CANDID_TYPES = {
  rp:      { label: 'Candidature Accès Rôle Play', prefix: 'candid-rp',      categorie: '1489726701721354360', logs: '1489726293661581444', roles: ['1474714298654920867', '1474488088662380577'] },
  beta:    { label: 'Candidature Bêta Testers',    prefix: 'candid-testers',  categorie: '1489726875470266479', logs: '1489726328490954983', roles: ['1474730045632151742'] },
  video:   { label: 'Candidature Vidéaste',         prefix: 'candid-video',    categorie: '1489726939559362663', logs: '1489726369100468335', roles: ['1474857518932164698'] },
  dev:     { label: 'Candidature Développeur',      prefix: 'candid-dev',      categorie: '1489726997667250466', logs: '1489726396942258320', roles: ['1475553226098217104'] },
  agentRP: { label: 'Candidature Agent RP',         prefix: 'candid-a-rp',    categorie: '1489727087442001972', logs: '1489726430752538634', roles: ['1474714298654920867'] },
  support: { label: 'Candidature Support',          prefix: 'candid-support',  categorie: '1489727152114110514', logs: '1489726464541720668', roles: ['1432840844754292766'] },
  modo:    { label: 'Candidature Modérateur',       prefix: 'candid-modo',     categorie: '1489727210867654727', logs: '1489726531512045710', roles: ['1432472817349431361'] },
};

const candidCounters = { rp: 0, beta: 0, video: 0, dev: 0, agentRP: 0, support: 0, modo: 0 };
const candidData     = {}; // channelId -> { type, creatorId, claimedBy, openedAt, timers, numero }
const userCandid     = {}; // userId -> channelId

// ══════════════════════════════════════════
//   TYPES DE TICKETS — SUPPORT
// ══════════════════════════════════════════
const TICKET_TYPES_SUPPORT = {
  verif:    { label: '✅ Aide à la vérification', prefix: 'ticket-aide-verif',     categorie: '1486044912762749098', transcript: '1485786365726556220' },
  unban:    { label: '🔓 Aide débannissement',    prefix: 'ticket-aide-unban',     categorie: '1433829573623021770', transcript: '1485786433057722468' },
  question: { label: '💡 Aide question',          prefix: 'ticket-aide-question',  categorie: '1473993226406068316', transcript: '1485786483423187004' },
  signal:   { label: '📢 Aide au signalement',    prefix: 'ticket-aide-signal',    categorie: '1453777812472332381', transcript: '1485786528364888104' },
  autre:    { label: '🧩 Autre Aide',             prefix: 'ticket-aide-autre',     categorie: '1474726655967760577', transcript: '1485786561227526174' },
};

// ══════════════════════════════════════════
//   TYPES DE TICKETS — MODÉRATEUR
// ══════════════════════════════════════════
const TICKET_TYPES_MOD = {
  mod_unban:       { label: '🚫 Débannir',            prefix: 'ticket-unban',        categorie: '1486138898144034896', transcript: '1486139683326136462' },
  mod_report:      { label: '🚩 Signaler',             prefix: 'ticket-report',       categorie: '1486139067556040817', transcript: '1486139734529933483' },
  mod_reportbug:   { label: '🐞 Signaler bug',         prefix: 'ticket-report-bug',   categorie: '1486139175332745377', transcript: '1486139766436134992' },
  mod_reportstaff: { label: '👮 Signaler staff',       prefix: 'ticket-report-staff', categorie: '1486139424931578028', transcript: '1486139790075101355' },
  mod_autre:       { label: '🧩 Autre type de ticket', prefix: 'ticket-others',       categorie: '1486139523149856839', transcript: '1486139841233293454' },
};

const ALL_TICKET_TYPES = { ...TICKET_TYPES_SUPPORT, ...TICKET_TYPES_MOD };

// ══════════════════════════════════════════
//   PERSISTANCE TICKETS (fichier JSON)
// ══════════════════════════════════════════
const SAVE_FILE = path.join(__dirname, 'ticketData.json');

const ticketCounters = {
  verif: 0, unban: 0, question: 0, signal: 0, autre: 0,
  mod_unban: 0, mod_report: 0, mod_reportbug: 0, mod_reportstaff: 0, mod_autre: 0,
};
const ticketData     = {}; // channelId -> { type, creatorId, claimedBy, openedAt, timers, numero, ismod }
const userTickets    = {}; // userId -> channelId (Support)
const userTicketsMod = {}; // userId -> channelId (Modérateur)

function saveData() {
  const toSave = {
    ticketCounters,
    ticketData: Object.fromEntries(
      Object.entries(ticketData).map(([k, v]) => [k, { ...v, timers: [] }])
    ),
    userTickets,
    userTicketsMod,
  };
  fs.writeFileSync(SAVE_FILE, JSON.stringify(toSave, null, 2), 'utf-8');
}

function loadData() {
  if (!fs.existsSync(SAVE_FILE)) return;
  try {
    const raw = JSON.parse(fs.readFileSync(SAVE_FILE, 'utf-8'));
    if (raw.ticketCounters) Object.assign(ticketCounters, raw.ticketCounters);
    if (raw.ticketData)     Object.assign(ticketData,     raw.ticketData);
    if (raw.userTickets)    Object.assign(userTickets,    raw.userTickets);
    if (raw.userTicketsMod) Object.assign(userTicketsMod, raw.userTicketsMod);
    for (const d of Object.values(ticketData)) d.timers = [];
    console.log('💾 Données tickets restaurées.');
  } catch (e) {
    console.error('❌ Erreur chargement save:', e.message);
  }
}

loadData();

// ══════════════════════════════════════════
//   PENDING TRANSFERS (candidatures & tickets)
// ══════════════════════════════════════════
const pendingTransferCandid = {}; // userId -> channelId
const pendingTransferTicket = {}; // userId -> channelId

// ══════════════════════════════════════════
//   CLIENT
// ══════════════════════════════════════════
const client = new Client({
  intents: [33283 | 512 | 32768 | 2],
});

// ══════════════════════════════════════════
//   UTILITAIRES COMMUNS
// ══════════════════════════════════════════
function padNum(n) {
  return String(n).padStart(4, '0');
}

function getEmoji(openedAt) {
  const min = (Date.now() - openedAt) / 60000;
  if (min < 5)             return '🟢';
  if (min < 15)            return '🟡';
  if (min < 45)            return '🟠';
  if (min < 24 * 60 + 45) return '🔴';
  return '⚫';
}

async function makeTranscript(channel) {
  const messages = await channel.messages.fetch({ limit: 100 }).catch(() => null);
  if (!messages) return 'Impossible de récupérer les messages.';
  const sorted = [...messages.values()].reverse();
  return sorted.map(m => {
    const time = m.createdAt.toLocaleString('fr-FR');
    return '[' + time + '] ' + m.author.tag + ' : ' + (m.content || '[embed/fichier]');
  }).join('\n');
}

// ── Utilitaires Candidatures ──
async function renameCandidChannel(channel, data) {
  const type  = CANDID_TYPES[data.type];
  const num   = padNum(data.numero);
  const emoji = getEmoji(data.openedAt);
  const name  = data.claimedBy
    ? 'claim-' + emoji + '-' + type.prefix + '-' + num
    : emoji + '-' + type.prefix + '-' + num;
  await channel.setName(name).catch(() => {});
}

function scheduleCandidTimers(channel, data) {
  if (data.timers) data.timers.forEach(t => clearTimeout(t));
  data.timers = [];
  if (data.claimedBy) return;
  [5 * 60000, 15 * 60000, 45 * 60000, (24 * 60 + 45) * 60000].forEach(ms => {
    const t = setTimeout(async () => {
      const current = candidData[channel.id];
      if (!current || current.claimedBy) return;
      await renameCandidChannel(channel, current);
    }, ms);
    data.timers.push(t);
  });
}

// ── Utilitaires Tickets ──
async function renameTicketChannel(channel, data) {
  const type   = ALL_TICKET_TYPES[data.type];
  const num    = padNum(data.numero);
  const color  = getEmoji(data.openedAt);
  const status = data.claimedBy ? 'claim' : 'unclaim';
  const name   = status + '-' + color + '-' + type.prefix + '-' + num;
  await channel.setName(name).catch(e => console.error('❌ Rename échoué:', e.message));
}

function scheduleTicketTimers(channel, data) {
  if (data.timers) data.timers.forEach(t => clearTimeout(t));
  data.timers = [];
  if (data.claimedBy) return;
  [5 * 60000, 15 * 60000, 45 * 60000, (24 * 60 + 45) * 60000].forEach(ms => {
    const t = setTimeout(async () => {
      const current = ticketData[channel.id];
      if (!current || current.claimedBy) return;
      await renameTicketChannel(channel, current);
    }, ms);
    data.timers.push(t);
  });
}

async function sendTransferEmbed(channel, ticketName, newOwnerId, initiatorId, forced = false) {
  const now     = new Date();
  const dateStr = now.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const embed   = new EmbedBuilder()
    .setTitle('🔄  Transfert de Propriété')
    .setColor(0x5865f2)
    .setDescription('> La prise en charge de ce ticket a été transférée avec succès.\n\u200b')
    .addFields(
      { name: '🎫  Ticket concerné',    value: '`' + ticketName + '`',                                              inline: true },
      { name: '👤  Nouveau responsable', value: '<@' + newOwnerId + '>',                                             inline: true },
      { name: '\u200b',                  value: '\u200b',                                                             inline: true },
      { name: '🛠️  Initié par',         value: '<@' + initiatorId + '>' + (forced ? '  *(transfert forcé)*' : ''), inline: true },
      { name: '📅  Date & heure',        value: dateStr + ' à ' + timeStr,                                           inline: true },
    )
    .setFooter({ text: 'Support — Topia FR RP  •  Toute demande doit passer par un ticket.' })
    .setTimestamp();
  await channel.send({ embeds: [embed] });
}

// ── Création ticket générique ──
async function createTicket(interaction, type, typeInfo, rolesAccess, pingRolesIds, ismod) {
  const { member, guild } = interaction;
  const store = ismod ? userTicketsMod : userTickets;

  if (store[member.id]) {
    const existing = guild.channels.cache.get(store[member.id]);
    if (existing) {
      return interaction.reply({
        content: '❌ Tu as déjà un ticket ouvert : ' + existing.toString() + '\nFerme-le avant d\'en ouvrir un nouveau !',
        ephemeral: true,
      });
    }
    delete store[member.id];
  }

  await interaction.deferReply({ ephemeral: true });

  ticketCounters[type]++;
  const numero      = ticketCounters[type];
  const num         = padNum(numero);
  const channelName = 'unclaim-🟢-' + typeInfo.prefix + '-' + num;

  const permissionOverwrites = [
    { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
    {
      id: member.id,
      allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory],
    },
  ];
  rolesAccess.forEach(roleId => {
    permissionOverwrites.push({
      id: roleId,
      allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory],
    });
  });

  const channel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: typeInfo.categorie,
    permissionOverwrites,
  }).catch(e => { console.error('❌ Création ticket:', e.code, e.message); return null; });

  if (!channel) return interaction.editReply({ content: '❌ Impossible de créer le ticket. Contacte un administrateur.' });

  store[member.id] = channel.id;
  ticketData[channel.id] = {
    type, creatorId: member.id, claimedBy: null,
    openedAt: Date.now(), timers: [], numero, ismod,
  };
  scheduleTicketTimers(channel, ticketData[channel.id]);
  saveData();

  const embedTicket = new EmbedBuilder()
    .setTitle('🎫 Ticket Créé')
    .setColor(ismod ? 0xef4444 : 0x22c55e)
    .setDescription(
      'Bienvenue <@' + member.id + '> !\n\n' +
      '> Veuillez patienter, un membre ' + (ismod ? 'de la modération' : 'du staff') + ' prendra en charge votre demande dans les meilleurs délais.\n\n' +
      '**Catégorie :** ' + typeInfo.label + '\n' +
      '**Ticket n° :** ' + num
    )
    .setFooter({ text: ismod ? 'Modération — Topia FR RP' : 'Support — Topia FR RP' })
    .setTimestamp();

  const rowTicket = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('claim_ticket').setLabel('📩 Réclamer ce ticket').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('unclaim_ticket').setLabel('📩 Ne plus réclamer').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('transfer_ticket').setLabel('📩 Transférer la propriété').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('close_ticket').setLabel('❌ Fermer ce ticket').setStyle(ButtonStyle.Danger),
  );

  const pingContent = '<@' + member.id + '> ' + pingRolesIds.map(r => '<@&' + r + '>').join(' ');
  await channel.send({ content: pingContent, embeds: [embedTicket], components: [rowTicket] });
  return interaction.editReply({ content: '✅ Ton ticket a été créé : ' + channel.toString() });
}

// ── Mise à jour du statut ──
function updateStatus() {
  const guild       = client.guilds.cache.get(GUILD_ID);
  const memberCount = guild ? guild.memberCount : '...';
  client.user.setPresence({
    activities: [
      { name: 'Joue à Topia FR RP', type: ActivityType.Playing },
      { type: ActivityType.Custom, name: 'custom', state: '👥 Nombres de Membre sur Topia : ' + memberCount },
    ],
    status: 'online',
  });
  console.log('🔄 Statut mis à jour — Membres : ' + memberCount);
}

// ══════════════════════════════════════════
//   BOT PRÊT
// ══════════════════════════════════════════
client.once('ready', async () => {
  console.log('✅ Bot connecté en tant que : ' + client.user.tag);

  updateStatus();
  setInterval(updateStatus, 5 * 60 * 1000);

  // Relance les timers de couleur pour les tickets ouverts
  const guild = client.guilds.cache.get(GUILD_ID);
  if (!guild) return;
  for (const [channelId, data] of Object.entries(ticketData)) {
    if (data.claimedBy) continue;
    const channel = guild.channels.cache.get(channelId);
    if (!channel) {
      const store = data.ismod ? userTicketsMod : userTickets;
      delete store[data.creatorId];
      delete ticketData[channelId];
      continue;
    }
    scheduleTicketTimers(channel, data);
    console.log('⏱️  Timer relancé pour : ' + channel.name);
  }
  saveData();
});

// ══════════════════════════════════════════
//   NOUVEAU MEMBRE (Bienvenue + Rôle auto + Statut)
// ══════════════════════════════════════════
client.on('guildMemberAdd', async function(member) {
  if (member.guild.id !== GUILD_ID) return;

  updateStatus();

  const user      = member.user;
  const username  = user.username;
  const mention   = '<@' + user.id + '>';
  const avatarURL = user.displayAvatarURL({ size: 256, extension: 'png' });

  // Rôle automatique
  try {
    await member.roles.add(ROLE_AUTO_ID);
    console.log('✅ Rôle auto donné à : ' + username);
  } catch (error) {
    console.error('❌ Erreur ajout rôle auto : ' + error.message);
  }

  // Message de bienvenue (webhook)
  const now     = new Date();
  const dateStr = now.toLocaleDateString('fr-FR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  const payload = {
    embeds: [{
      title: '🎉 Nouvelle Arrivant(e) !',
      description: 'Bienvenue parmi nous, ' + mention + ' ! 🎊\n\nLa cloche a sonné et toute la communauté est là pour t\'accueillir comme il se doit ! 🔔✨\nInstalle-toi confortablement, car ici est ton endroit tant rêvé ! 🚀🔥',
      color: 0x5865f2,
      thumbnail: { url: avatarURL },
      fields: [
        { name: '📅 Date d\'arrivée', value: dateStr, inline: true },
        { name: '👥 Membres',         value: '#' + member.guild.memberCount, inline: true },
      ],
      footer: { text: 'Heureux de t\'avoir parmi nous !' },
      timestamp: now.toISOString(),
    }],
  };

  const body = JSON.stringify(payload);
  const url  = new URL(WEBHOOK_TOPIA);
  const req  = https.request({
    hostname: url.hostname,
    path:     url.pathname,
    method:   'POST',
    headers:  { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
  }, (res) => {
    console.log(res.statusCode >= 200 && res.statusCode < 300
      ? '✅ Bienvenue envoyé pour : ' + username
      : '❌ Erreur webhook : ' + res.statusCode);
  });
  req.on('error', (e) => console.error('❌ ' + e.message));
  req.write(body);
  req.end();
});

client.on('guildMemberRemove', () => updateStatus());

// ══════════════════════════════════════════
//   COMMANDES TEXTE
// ══════════════════════════════════════════
client.on('messageCreate', async function(message) {
  if (message.author.bot) return;
  if (!message.guild || message.guild.id !== GUILD_ID) return;

  // ── !reglement ──
  if (message.content === '!reglement') {
    if (message.author.id !== message.guild.ownerId) {
      return message.reply({ content: '❌ Seul le propriétaire du serveur 👑 peut utiliser cette commande !' });
    }
    await message.delete().catch(() => {});

    const embed = new EmbedBuilder()
      .setTitle('📜 Règlement du Serveur')
      .setColor(0x5865f2)
      .setDescription(
        '**Bienvenue sur le serveur ! Merci de lire et respecter les règles suivantes :**\n\n' +
        '**1️⃣ Respectez tout le monde**\n' +
        'Aucune insulte, discrimination ou harcèlement ne sera toléré.\n\n' +
        '**2️⃣ Pas de spam**\n' +
        'Évitez les messages répétitifs, les majuscules excessives et les floods.\n\n' +
        '**3️⃣ Pas de publicité**\n' +
        'Toute publicité non autorisée est interdite.\n\n' +
        '**4️⃣ Contenu approprié**\n' +
        'Aucun contenu NSFW, choquant ou illégal ne sera toléré.\n\n' +
        '**5️⃣ Respectez les salons**\n' +
        'Utilisez chaque salon pour son usage prévu.\n\n' +
        '**6️⃣ Pas d\'usurpation d\'identité**\n' +
        'Il est interdit de se faire passer pour un autre membre ou un staff.\n\n' +
        '**7️⃣ Suivez les directives de Discord**\n' +
        'Les [CGU de Discord](https://discord.com/terms) s\'appliquent sur ce serveur.\n\n' +
        '*En cliquant sur le bouton ci-dessous, vous acceptez le règlement et obtenez l\'accès au serveur.*'
      )
      .setFooter({ text: 'Cliquez sur le bouton pour accepter le règlement' })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('accepter_reglement').setLabel('✅ Accepter le Règlement').setStyle(ButtonStyle.Success)
    );

    // Envoie dans le salon actuel (ou dans SALON_REGLEMENT si défini)
    const target = SALON_REGLEMENT
      ? message.guild.channels.cache.get(SALON_REGLEMENT)
      : message.channel;
    if (target) await target.send({ embeds: [embed], components: [row] });
    return;
  }

  // ── !candidatures ──
  if (message.content === '!candidatures') {
    if (message.author.id !== message.guild.ownerId) {
      return message.reply({ content: '❌ Seul le propriétaire du serveur 👑 peut utiliser cette commande !' });
    }
    await message.delete().catch(() => {});

    const salon = message.guild.channels.cache.get(SALON_CANDID_EMBED);
    if (!salon) return;

    const embed = new EmbedBuilder()
      .setTitle('📋 Soumettre une Candidature')
      .setColor(0xFFFFFF)
      .setDescription(
        'Notre équipe examine toutes les candidatures avec la plus grande attention.\n\n' +
        'Veuillez sélectionner la catégorie correspondant à votre candidature en cliquant sur le bouton approprié ci-dessous.\n' +
        'Un membre de notre staff étudiera votre dossier dans les plus brefs délais.\n\n' +
        '> ⚠️ Merci de ne soumettre votre candidature qu\'une seule fois et de manière sérieuse.'
      )
      .setFooter({ text: 'Candidatures — Topia FR RP' })
      .setTimestamp();

    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('candid_rp').setLabel('Candidature Accès Rôle Play').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('candid_beta').setLabel('Candidature Bêta Testers').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('candid_video').setLabel('Candidature Vidéaste').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('candid_dev').setLabel('Candidature Développeur').setStyle(ButtonStyle.Secondary),
    );
    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('candid_agentRP').setLabel('Candidature Agent RP').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('candid_support').setLabel('Candidature Support').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('candid_modo').setLabel('Candidature Modérateur').setStyle(ButtonStyle.Danger),
    );

    await salon.send({ embeds: [embed], components: [row1, row2] });
    return;
  }

  // ── !ticketssupport ──
  if (message.content === '!ticketssupport') {
    if (message.author.id !== message.guild.ownerId) {
      return message.reply({ content: '❌ Seul le propriétaire du serveur 👑 peut utiliser cette commande !' });
    }
    await message.delete().catch(() => {});

    const salon = message.guild.channels.cache.get(SALON_SUPPORT_EMBED);
    if (!salon) return;

    const embed = new EmbedBuilder()
      .setTitle('🎫 Ouvrir un ticket Support')
      .setColor(0x5865f2)
      .setDescription(
        'Notre équipe de support est à votre disposition pour toute demande d\'assistance.\n\n' +
        'Veuillez sélectionner la catégorie correspondant à votre problème en cliquant sur le bouton approprié ci-dessous.\n' +
        'Un membre de notre staff prendra en charge votre demande dans les plus brefs délais.\n\n' +
        '> ⚠️ Merci d\'ouvrir un ticket uniquement si votre demande le nécessite.'
      )
      .setFooter({ text: 'Support — Topia FR RP' })
      .setTimestamp();

    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('ticket_verif').setLabel('✅ Aide à la vérification').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('ticket_unban').setLabel('🔓 Aide débannissement').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('ticket_question').setLabel('💡 Aide question').setStyle(ButtonStyle.Secondary),
    );
    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('ticket_signal').setLabel('📢 Aide au signalement').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('ticket_autre').setLabel('🧩 Autre Aide').setStyle(ButtonStyle.Secondary),
    );

    await salon.send({ embeds: [embed], components: [row1, row2] });
    return;
  }

  // ── !ticketsmod ──
  if (message.content === '!ticketsmod') {
    if (message.author.id !== message.guild.ownerId) {
      return message.reply({ content: '❌ Seul le propriétaire du serveur 👑 peut utiliser cette commande !' });
    }
    await message.delete().catch(() => {});

    const salon = message.guild.channels.cache.get(SALON_MOD_EMBED);
    if (!salon) return;

    const embed = new EmbedBuilder()
      .setTitle('🛡️ Ouvrir un ticket Modérateur')
      .setColor(0xef4444)
      .setDescription(
        'Notre équipe de modérateurs est à votre disposition pour toute demande relative à la modération du serveur.\n\n' +
        'Sélectionnez la catégorie correspondant à votre situation en cliquant sur le bouton approprié ci-dessous.\n' +
        'Un modérateur prendra en charge votre demande dans les plus brefs délais.\n\n' +
        '> ⚠️ Merci d\'ouvrir un ticket uniquement si votre demande le nécessite réellement.'
      )
      .setFooter({ text: 'Modération — Topia FR RP' })
      .setTimestamp();

    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('ticket_mod_unban').setLabel('🚫 Débannir').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('ticket_mod_report').setLabel('🚩 Signaler').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('ticket_mod_reportbug').setLabel('🐞 Signaler bug').setStyle(ButtonStyle.Secondary),
    );
    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('ticket_mod_reportstaff').setLabel('👮 Signaler staff').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('ticket_mod_autre').setLabel('🧩 Autre type de ticket').setStyle(ButtonStyle.Secondary),
    );

    await salon.send({ embeds: [embed], components: [row1, row2] });
    return;
  }

  // ── Écoute transfert candidature ──
  if (pendingTransferCandid[message.author.id]) {
    const channelId = pendingTransferCandid[message.author.id];
    if (message.channel.id !== channelId) return;
    const target = message.mentions.members.first();
    if (!target) return;
    delete pendingTransferCandid[message.author.id];
    const data = candidData[channelId];
    if (!data) return;
    const oldClaimer = data.claimedBy ? '<@' + data.claimedBy + '>' : 'Personne';
    data.claimedBy = target.id;
    const embed = new EmbedBuilder()
      .setTitle('🔄 Transfert de Candidature')
      .setColor(0xf59e0b)
      .setDescription(
        'Bonjour, <@' + data.creatorId + '>\n\n' +
        'Votre candidature est désormais prise en charge par ' + target.toString() + '.\n\n' +
        '*Transfert effectué depuis : ' + oldClaimer + '*'
      )
      .setTimestamp();
    await message.channel.send({ embeds: [embed] });
    await message.delete().catch(() => {});
    await renameCandidChannel(message.channel, data);
    return;
  }

  // ── Écoute transfert ticket ──
  if (pendingTransferTicket[message.author.id]) {
    const channelId = pendingTransferTicket[message.author.id];
    if (message.channel.id !== channelId) return;
    const target = message.mentions.members.first();
    if (!target) return;
    delete pendingTransferTicket[message.author.id];
    const data = ticketData[channelId];
    if (!data) return;
    data.claimedBy = target.id;
    saveData();
    await message.delete().catch(() => {});
    await sendTransferEmbed(message.channel, message.channel.name, target.id, message.author.id, false);
    await renameTicketChannel(message.channel, data);
    return;
  }

  // ── !forcetransfertclaim ──
  if (message.content.startsWith('!forcetransfertclaim')) {
    // Candidature ?
    if (candidData[message.channel.id]) {
      const data    = candidData[message.channel.id];
      const hasRole = ROLES_CLOSE_CANDID.some(r => message.member.roles.cache.has(r));
      if (!hasRole) return message.reply({ content: '❌ Tu n\'as pas la permission !' });
      const target = message.mentions.members.first();
      if (!target) return message.reply({ content: '❌ Mentionne un utilisateur !' });
      const oldClaimer = data.claimedBy ? '<@' + data.claimedBy + '>' : 'Personne';
      data.claimedBy = target.id;
      const embed = new EmbedBuilder()
        .setTitle('🔄 Transfert de Candidature')
        .setColor(0xf59e0b)
        .setDescription(
          'Bonjour, <@' + data.creatorId + '>\n\n' +
          'Votre candidature est désormais prise en charge par ' + target.toString() + '.\n\n' +
          '*Transfert forcé depuis : ' + oldClaimer + '*'
        )
        .setTimestamp();
      await message.channel.send({ embeds: [embed] });
      await message.delete().catch(() => {});
      await renameCandidChannel(message.channel, data);
      return;
    }
    // Ticket ?
    if (ticketData[message.channel.id]) {
      const data    = ticketData[message.channel.id];
      const hasRole = ROLES_FORCE_TRANSFER.some(r => message.member.roles.cache.has(r));
      if (!hasRole) return message.reply({ content: '❌ Tu n\'as pas la permission d\'utiliser cette commande !' });
      const target = message.mentions.members.first();
      if (!target) return message.reply({ content: '❌ Mentionne un utilisateur !' });
      data.claimedBy = target.id;
      saveData();
      await message.delete().catch(() => {});
      await sendTransferEmbed(message.channel, message.channel.name, target.id, message.author.id, true);
      await renameTicketChannel(message.channel, data);
      return;
    }
  }
});

// ══════════════════════════════════════════
//   INTERACTIONS (boutons)
// ══════════════════════════════════════════
client.on('interactionCreate', async function(interaction) {
  if (!interaction.isButton()) return;
  if (interaction.guild.id !== GUILD_ID) return;

  const { customId, member, guild } = interaction;

  // ─────────────────────────────────────────
  //   RÈGLEMENT
  // ─────────────────────────────────────────
  if (customId === 'accepter_reglement') {
    if (member.roles.cache.has(ROLE_REGLEMENT_ID)) {
      return interaction.reply({ content: '✅ Vous avez déjà accepté le règlement !', ephemeral: true });
    }
    try {
      await member.roles.add(ROLE_REGLEMENT_ID);
      await interaction.reply({ content: '🎉 Merci d\'avoir accepté le règlement ! Tu as maintenant accès au serveur. Bonne aventure ! 🚀', ephemeral: true });
      console.log('✅ Rôle règlement donné à : ' + member.user.username);
    } catch (error) {
      console.error('❌ Erreur rôle : ' + error.message);
      await interaction.reply({ content: '❌ Une erreur est survenue. Contacte un administrateur.', ephemeral: true });
    }
    return;
  }

  // ─────────────────────────────────────────
  //   CANDIDATURES — Création
  // ─────────────────────────────────────────
  if (customId.startsWith('candid_')) {
    const type     = customId.replace('candid_', '');
    const typeInfo = CANDID_TYPES[type];
    if (!typeInfo) return;

    if (userCandid[member.id]) {
      const existing = guild.channels.cache.get(userCandid[member.id]);
      if (existing) {
        return interaction.reply({
          content: '❌ Tu as déjà une candidature ouverte : ' + existing.toString() + '\nFerme-la avant d\'en ouvrir une nouvelle !',
          ephemeral: true,
        });
      }
      delete userCandid[member.id];
    }

    await interaction.deferReply({ ephemeral: true });

    candidCounters[type]++;
    const numero      = candidCounters[type];
    const num         = padNum(numero);
    const channelName = '🟢-' + typeInfo.prefix + '-' + num;

    const permissionOverwrites = [
      { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
      {
        id: member.id,
        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory],
      },
    ];
    ROLES_STAFF.forEach(roleId => {
      permissionOverwrites.push({
        id: roleId,
        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory],
      });
    });
    typeInfo.roles.forEach(roleId => {
      if (!ROLES_STAFF.includes(roleId)) {
        permissionOverwrites.push({
          id: roleId,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory],
        });
      }
    });

    const channel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: typeInfo.categorie,
      permissionOverwrites,
    }).catch(e => { console.error('❌ ' + e.message); return null; });

    if (!channel) return interaction.editReply({ content: '❌ Impossible de créer la candidature. Contacte un administrateur.' });

    userCandid[member.id]    = channel.id;
    candidData[channel.id]   = { type, creatorId: member.id, claimedBy: null, openedAt: Date.now(), timers: [], numero };
    scheduleCandidTimers(channel, candidData[channel.id]);

    const embedCandid = new EmbedBuilder()
      .setTitle('📋 Candidature Créée')
      .setColor(0xFFFFFF)
      .setDescription(
        'Bonjour <@' + member.id + '> ! 👋\n\n' +
        '> Votre candidature a bien été reçue. Notre équipe l\'examinera dans les plus brefs délais.\n' +
        '> Merci de patienter et de ne pas relancer le staff.\n\n' +
        '**Type :** ' + typeInfo.label + '\n' +
        '**Candidature n° :** ' + num
      )
      .setFooter({ text: 'Candidatures — Topia FR RP' })
      .setTimestamp();

    const rowCandid = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('claim_candid').setLabel('📩 Réclamer cette candidature').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('unclaim_candid').setLabel('📩 Ne plus réclamer').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('transfer_candid').setLabel('📩 Transférer la propriété').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('close_candid').setLabel('❌ Fermer la candidature').setStyle(ButtonStyle.Danger),
    );

    const pingRoles = typeInfo.roles.map(r => '<@&' + r + '>').join(' ');
    await channel.send({ content: '<@' + member.id + '> ' + pingRoles, embeds: [embedCandid], components: [rowCandid] });
    return interaction.editReply({ content: '✅ Ta candidature a été créée : ' + channel.toString() });
  }

  // ─────────────────────────────────────────
  //   CANDIDATURES — Claim / Unclaim / Transfer / Close
  // ─────────────────────────────────────────
  if (customId === 'claim_candid') {
    if (!member.roles.cache.has(ROLE_CLAIM)) {
      return interaction.reply({ content: '❌ Tu n\'as pas la permission de réclamer cette candidature !', ephemeral: true });
    }
    const data = candidData[interaction.channel.id];
    if (!data) return interaction.reply({ content: '❌ Candidature introuvable.', ephemeral: true });
    if (data.claimedBy) {
      return interaction.reply({ content: '❌ Cette candidature est déjà réclamée par <@' + data.claimedBy + '> !', ephemeral: true });
    }
    data.claimedBy = member.id;
    if (data.timers) data.timers.forEach(t => clearTimeout(t));
    await renameCandidChannel(interaction.channel, data);
    return interaction.reply({ content: '✅ Tu as réclamé cette candidature !', ephemeral: true });
  }

  if (customId === 'unclaim_candid') {
    if (!member.roles.cache.has(ROLE_CLAIM)) {
      return interaction.reply({ content: '❌ Tu n\'as pas la permission !', ephemeral: true });
    }
    const data = candidData[interaction.channel.id];
    if (!data) return interaction.reply({ content: '❌ Candidature introuvable.', ephemeral: true });
    if (!data.claimedBy || data.claimedBy !== member.id) {
      return interaction.reply({ content: '❌ Tu n\'as pas réclamé cette candidature !', ephemeral: true });
    }
    data.claimedBy = null;
    data.openedAt  = Date.now();
    scheduleCandidTimers(interaction.channel, data);
    await renameCandidChannel(interaction.channel, data);
    return interaction.reply({ content: '✅ Tu as retiré ta réclamation sur cette candidature.', ephemeral: true });
  }

  if (customId === 'transfer_candid') {
    if (!member.roles.cache.has(ROLE_CLAIM)) {
      return interaction.reply({ content: '❌ Tu n\'as pas la permission !', ephemeral: true });
    }
    const data = candidData[interaction.channel.id];
    if (!data) return interaction.reply({ content: '❌ Candidature introuvable.', ephemeral: true });
    if (!data.claimedBy || data.claimedBy !== member.id) {
      return interaction.reply({ content: '❌ Tu dois avoir réclamé cette candidature pour pouvoir en transférer la propriété !', ephemeral: true });
    }
    pendingTransferCandid[member.id] = interaction.channel.id;
    return interaction.reply({ content: '📩 Mentionne la personne à qui tu veux transférer cette candidature (ex: @Utilisateur) :', ephemeral: true });
  }

  if (customId === 'close_candid') {
    const data = candidData[interaction.channel.id];
    if (!data) return interaction.reply({ content: '❌ Candidature introuvable.', ephemeral: true });
    const canClose = data.claimedBy === member.id || ROLES_CLOSE_CANDID.some(r => member.roles.cache.has(r));
    if (!canClose) {
      return interaction.reply({ content: '❌ Seul la personne ayant réclamé cette candidature ou le staff autorisé peut la fermer !', ephemeral: true });
    }
    await interaction.reply({ content: '🔒 Fermeture de la candidature en cours...' });
    const transcript = await makeTranscript(interaction.channel);
    const typeInfo   = CANDID_TYPES[data.type];
    const logSalon   = interaction.guild.channels.cache.get(typeInfo.logs);
    const embedLog   = new EmbedBuilder()
      .setTitle('📋 Log Candidature — ' + interaction.channel.name)
      .setColor(0x6b7280)
      .setDescription('**Créé par :** <@' + data.creatorId + '>\n**Fermé par :** ' + member.toString())
      .setTimestamp();
    const buf1 = Buffer.from(transcript, 'utf-8');
    const att1 = new AttachmentBuilder(buf1, { name: interaction.channel.name + '.txt' });
    if (logSalon) await logSalon.send({ embeds: [embedLog], files: [att1] }).catch(() => {});
    try {
      const creator = await interaction.guild.members.fetch(data.creatorId);
      const buf2    = Buffer.from(transcript, 'utf-8');
      const att2    = new AttachmentBuilder(buf2, { name: interaction.channel.name + '.txt' });
      await creator.send({
        content: '👋 ' + creator.toString() + '\n\nBonjour ! Ta candidature **' + interaction.channel.name + '** sur **Topia FR RP** vient d\'être clôturée.\nTu trouveras ci-joint le transcript complet de votre échange pour en garder une trace.\n\nNous espérons avoir pu traiter ta candidature dans les meilleures conditions. Bonne continuation et à bientôt ! 🌟',
        files: [att2],
      }).catch(() => {});
    } catch (e) { console.error('❌ MP : ' + e.message); }
    if (data.timers) data.timers.forEach(t => clearTimeout(t));
    delete userCandid[data.creatorId];
    delete candidData[interaction.channel.id];
    setTimeout(async () => { await interaction.channel.delete().catch(() => {}); }, 3000);
    return;
  }

  // ─────────────────────────────────────────
  //   TICKETS — Création Support
  // ─────────────────────────────────────────
  if (customId.startsWith('ticket_') && !customId.startsWith('ticket_mod_')) {
    const type     = customId.replace('ticket_', '');
    const typeInfo = TICKET_TYPES_SUPPORT[type];
    if (!typeInfo) return;
    return createTicket(
      interaction, type, typeInfo,
      ROLES_STAFF_SUPPORT,
      ['1432841223118262413', '1433053281327775845', '1432840939658940456'],
      false
    );
  }

  // ─────────────────────────────────────────
  //   TICKETS — Création Modérateur
  // ─────────────────────────────────────────
  if (customId.startsWith('ticket_mod_')) {
    const type     = customId.replace('ticket_', '');
    const typeInfo = TICKET_TYPES_MOD[type];
    if (!typeInfo) return;
    return createTicket(interaction, type, typeInfo, ROLES_MOD, PING_ROLES_MOD, true);
  }

  // ─────────────────────────────────────────
  //   TICKETS — Claim / Unclaim / Transfer / Close
  // ─────────────────────────────────────────
  if (customId === 'claim_ticket') {
    if (!member.roles.cache.has(ROLE_CLAIM)) {
      return interaction.reply({ content: '❌ Tu n\'as pas la permission de réclamer ce ticket !', ephemeral: true });
    }
    const data = ticketData[interaction.channel.id];
    if (!data) return interaction.reply({ content: '❌ Ticket introuvable.', ephemeral: true });
    if (data.claimedBy) {
      return interaction.reply({ content: '❌ Ce ticket est déjà réclamé par <@' + data.claimedBy + '> !', ephemeral: true });
    }
    data.claimedBy = member.id;
    if (data.timers) data.timers.forEach(t => clearTimeout(t));
    saveData();
    await renameTicketChannel(interaction.channel, data);
    return interaction.reply({ content: '✅ Tu as réclamé ce ticket !', ephemeral: true });
  }

  if (customId === 'unclaim_ticket') {
    if (!member.roles.cache.has(ROLE_CLAIM)) {
      return interaction.reply({ content: '❌ Tu n\'as pas la permission !', ephemeral: true });
    }
    const data = ticketData[interaction.channel.id];
    if (!data) return interaction.reply({ content: '❌ Ticket introuvable.', ephemeral: true });
    if (!data.claimedBy || data.claimedBy !== member.id) {
      return interaction.reply({ content: '❌ Tu n\'as pas réclamé ce ticket !', ephemeral: true });
    }
    data.claimedBy = null;
    data.openedAt  = Date.now();
    scheduleTicketTimers(interaction.channel, data);
    saveData();
    await renameTicketChannel(interaction.channel, data);
    return interaction.reply({ content: '✅ Tu as retiré ta réclamation sur ce ticket.', ephemeral: true });
  }

  if (customId === 'transfer_ticket') {
    if (!member.roles.cache.has(ROLE_CLAIM)) {
      return interaction.reply({ content: '❌ Tu n\'as pas la permission !', ephemeral: true });
    }
    const data = ticketData[interaction.channel.id];
    if (!data) return interaction.reply({ content: '❌ Ticket introuvable.', ephemeral: true });
    if (!data.claimedBy || data.claimedBy !== member.id) {
      return interaction.reply({ content: '❌ Tu dois avoir **réclamé** ce ticket avant de pouvoir en transférer la propriété !', ephemeral: true });
    }
    pendingTransferTicket[member.id] = interaction.channel.id;
    return interaction.reply({ content: '📩 Mentionne la personne à qui tu veux transférer ce ticket (ex: @Utilisateur) :', ephemeral: true });
  }

  if (customId === 'close_ticket') {
    const data = ticketData[interaction.channel.id];
    if (!data) return interaction.reply({ content: '❌ Ticket introuvable.', ephemeral: true });
    const canClose = data.claimedBy === member.id || ROLES_TRANSFER.some(r => member.roles.cache.has(r));
    if (!canClose) {
      return interaction.reply({ content: '❌ Seul la personne ayant réclamé ce ticket ou le staff autorisé peut le fermer !', ephemeral: true });
    }
    await interaction.reply({ content: '🔒 Fermeture du ticket en cours...' });
    const transcript      = await makeTranscript(interaction.channel);
    const typeInfo        = ALL_TICKET_TYPES[data.type];
    const transcriptSalon = interaction.guild.channels.cache.get(typeInfo.transcript);
    const embedTranscript = new EmbedBuilder()
      .setTitle('📋 Transcript — ' + interaction.channel.name)
      .setColor(0x6b7280)
      .setDescription('**Créé par :** <@' + data.creatorId + '>\n**Fermé par :** ' + member.toString())
      .setTimestamp();
    const buf1 = Buffer.from(transcript, 'utf-8');
    const att1 = new AttachmentBuilder(buf1, { name: interaction.channel.name + '.txt' });
    if (transcriptSalon) await transcriptSalon.send({ embeds: [embedTranscript], files: [att1] }).catch(() => {});
    try {
      const creator = await interaction.guild.members.fetch(data.creatorId);
      const buf2    = Buffer.from(transcript, 'utf-8');
      const att2    = new AttachmentBuilder(buf2, { name: interaction.channel.name + '.txt' });
      await creator.send({
        content: '👋 ' + creator.toString() + '\n\nBonjour ! Ton ticket **' + interaction.channel.name + '** sur **Topia FR RP** vient d\'être clôturé.\nTu trouveras ci-joint le transcript complet de votre échange pour en garder une trace.\n\nNous espérons avoir pu répondre à ta demande dans les meilleures conditions. N\'hésite pas à revenir vers nous si tu as besoin d\'aide. Bonne continuation et à bientôt ! 🌟',
        files: [att2],
      }).catch(() => {});
    } catch (e) { console.error('❌ MP : ' + e.message); }
    if (data.timers) data.timers.forEach(t => clearTimeout(t));
    const store = data.ismod ? userTicketsMod : userTickets;
    delete store[data.creatorId];
    delete ticketData[interaction.channel.id];
    saveData();
    setTimeout(async () => { await interaction.channel.delete().catch(() => {}); }, 3000);
  }
});

// ══════════════════════════════════════════
//   GESTION D'ERREURS
// ══════════════════════════════════════════
client.on('error', (e) => console.error('❌ ' + e.message));
process.on('unhandledRejection', (r) => console.error('❌ ' + r));

client.login(BOT_TOKEN);
