const axios = require('axios');
const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  EmbedBuilder, PermissionFlagsBits, PermissionsBitField,
  ChannelType
} = require('discord.js');
const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════════════════════
//  CONFIG GLOBALE
// ═══════════════════════════════════════════════════════════════════════════════
const GUILD_ID = '1471597490082943056';

// ── Bienvenue ─────────────────────────────────────────────────────────────────
const WEBHOOK_RAYUNA    = process.env.WEBHOOK_RAYUNA;
const ROLE_BIENVENUE_ID = '1474453426892050667';
const PING_CHANNEL_ID   = '1477360760001663017';

// ── Règlement ─────────────────────────────────────────────────────────────────
const REGLEMENT_CHANNEL_ID = '1477360760001663017';
const ROLE_ACCES_ID        = '1474453477307711655';

// ── Autoroles ─────────────────────────────────────────────────────────────────
const AUTOROLES = {
  giveaways:  { id: '1492429338652708874', label: 'Ping Giveaways' },
  annonces:   { id: '1492429403454701608', label: 'Ping Annonces' },
  maj:        { id: '1492429521687806063', label: 'Ping Mise à Jour' },
  evenements: { id: '1480958848800915516', label: 'Ping Évènements' },
  animation:  { id: '1492597252961865878', label: 'Ping Animation' },
};

// ── Smash or Pass ─────────────────────────────────────────────────────────────
const SMASHPASS_CHANNEL_ID = '1492543286840393898';

// ── Stats ─────────────────────────────────────────────────────────────────────
const STATS_CHANNEL_ID = '1492032315184906280';
const PALIER           = 25;

// ── Boost ─────────────────────────────────────────────────────────────────────
const WEBHOOK_BOOST = process.env.WEBHOOK_BOOST_RAYUNA;

// ── Tickets ───────────────────────────────────────────────────────────────────
const TICKET_CHANNEL_ID  = '1477366353383129302';
const TICKET_CATEGORY_ID = '1492771905067946115';
const STAFF_ROLE_ID      = '1477373851326349434';
const TICKET_COUNTER     = path.join(__dirname, 'ticket-counter.json');

const TICKET_TYPES = {
  rpt_staff: {
    label: 'Report Staff', emoji: '🚨', slug: 'rpt-staff',
    logChannel: '1492784020231028786',
    roles: ['1474444019093344287','1474455027790778642','1492773209786028052'],
  },
  aide: {
    label: 'Aide', emoji: '🆘', slug: 'aide',
    logChannel: '1492784071800258691',
    roles: ['1474444019093344287','1474455027790778642','1477373851326349434'],
  },
  rpt_membres: {
    label: 'Report Membres', emoji: '⚠️', slug: 'rpt-membres',
    logChannel: '1492784184987615312',
    roles: ['1474444019093344287','1474455027790778642','1477373851326349434'],
  },
  partenaire: {
    label: 'Partenariat', emoji: '🤝', slug: 'partenaire',
    logChannel: '1492784248501829682',
    roles: ['1474444019093344287','1474455027790778642','1492773346771861524'],
  },
};

// ── Candidatures ──────────────────────────────────────────────────────────────
const CANDID_COUNTER = path.join(__dirname, 'candid-counter.json');

const CANDID_TYPES = {
  devenir_staff: {
    label: 'Devenir Staff', emoji: '⭐', slug: 'devenir-staff',
    logChannel: '1492784607903617054',
    roles: ['1474444019093344287','1474455027790778642'],
  },
  devenir_recruteur: {
    label: 'Devenir Recruteur', emoji: '🎯', slug: 'devenir-recruteur',
    logChannel: '1492784651062874202',
    roles: ['1474444019093344287','1474455027790778642','1492773590444150794'],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
//  HELPERS COMPTEURS
// ═══════════════════════════════════════════════════════════════════════════════
function loadCounter(file) {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify({ global: 0, claimers: {}, creators: {}, open: {} }));
  }
  const raw = JSON.parse(fs.readFileSync(file));
  if (!raw.open) raw.open = {};
  return raw;
}
function saveCounter(file, data) { fs.writeFileSync(file, JSON.stringify(data, null, 2)); }
function nextNum(file) {
  const d = loadCounter(file); d.global += 1; saveCounter(file, d);
  return String(d.global).padStart(4, '0');
}
function setClaimer(file, cid, uid) { const d = loadCounter(file); d.claimers[cid] = uid; saveCounter(file, d); }
function getClaimer(file, cid)      { return loadCounter(file).claimers[cid] || null; }
function removeClaimer(file, cid)   { const d = loadCounter(file); delete d.claimers[cid]; saveCounter(file, d); }
function setCreator(file, cid, uid) { const d = loadCounter(file); d.creators[cid] = uid; saveCounter(file, d); }
function getCreator(file, cid)      { return loadCounter(file).creators[cid] || null; }
function setOpen(file, uid, cid)    { const d = loadCounter(file); d.open[uid] = cid; saveCounter(file, d); }
function getOpen(file, uid)         { return loadCounter(file).open[uid] || null; }
function removeOpen(file, uid)      { const d = loadCounter(file); delete d.open[uid]; saveCounter(file, d); }

// ═══════════════════════════════════════════════════════════════════════════════
//  HELPERS COMMUNS
// ═══════════════════════════════════════════════════════════════════════════════
async function generateTranscript(channel) {
  const messages = await channel.messages.fetch({ limit: 100 });
  const sorted = [...messages.values()].reverse();
  let text = `=== TRANSCRIPT — ${channel.name} ===\n\n`;
  for (const msg of sorted) {
    const time = new Date(msg.createdTimestamp).toLocaleString('fr-FR');
    text += `[${time}] ${msg.author.tag} : ${msg.content || '[embed/fichier]'}\n`;
  }
  return Buffer.from(text, 'utf-8');
}

function actionRow(claimed, prefix) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`${prefix}_claim`).setLabel('Réclamer').setEmoji('🟢').setStyle(ButtonStyle.Success).setDisabled(claimed),
    new ButtonBuilder().setCustomId(`${prefix}_unclaim`).setLabel('Ne plus réclamer').setEmoji('🔴').setStyle(ButtonStyle.Secondary).setDisabled(!claimed),
    new ButtonBuilder().setCustomId(`${prefix}_transfer`).setLabel('Transférer').setEmoji('🔵').setStyle(ButtonStyle.Primary).setDisabled(!claimed),
    new ButtonBuilder().setCustomId(`${prefix}_close`).setLabel('Fermer').setEmoji('❌').setStyle(ButtonStyle.Danger),
  );
}

async function handleClaim(interaction, file, prefix, client, label) {
  const { member, guild, channel } = interaction;
  const isStaff = member.roles.cache.has(STAFF_ROLE_ID) || member.permissions.has(PermissionFlagsBits.Administrator);
  if (!isStaff) return interaction.reply({ content: '⚠️ Tu n\'as pas la permission de réclamer.', ephemeral: true });
  if (getClaimer(file, channel.id)) return interaction.reply({ content: `⚠️ Ce ${label} est déjà réclamé.`, ephemeral: true });

  setClaimer(file, channel.id, member.id);
  await channel.setName(channel.name.replace('❌-', '✅-')).catch(() => {});

  const creatorId = getCreator(file, channel.id);
  await channel.send({ embeds: [new EmbedBuilder().setColor(0x57f287).setTitle('✅ — Réclamation')
    .setDescription(`${creatorId ? `<@${creatorId}>` : ''} le ${label} **${channel.name}** a été pris en charge par ${member}.\n\nMerci de patienter, ${member} vous répondra dans les plus brefs délais.`)
    .setTimestamp()] });

  try {
    const msgs = await channel.messages.fetch({ limit: 10 });
    const welcome = msgs.find(m => m.author.id === client.user.id && m.components.length > 0);
    if (welcome) await welcome.edit({ components: [actionRow(true, prefix)] });
  } catch {}

  return interaction.reply({ content: `✅ Tu as réclamé ce ${label}.`, ephemeral: true });
}

async function handleUnclaim(interaction, file, prefix, client, label) {
  const { member, channel } = interaction;
  const isStaff = member.roles.cache.has(STAFF_ROLE_ID) || member.permissions.has(PermissionFlagsBits.Administrator);
  if (!isStaff) return interaction.reply({ content: '⚠️ Tu n\'as pas la permission.', ephemeral: true });
  const existing = getClaimer(file, channel.id);
  if (!existing || existing !== member.id) return interaction.reply({ content: '⚠️ Tu n\'as pas réclamé ce ' + label + '.', ephemeral: true });

  removeClaimer(file, channel.id);
  await channel.setName(channel.name.replace('✅-', '❌-')).catch(() => {});

  const creatorId = getCreator(file, channel.id);
  await channel.send({ embeds: [new EmbedBuilder().setColor(0xed4245).setTitle('❌ — Désadhésion')
    .setDescription(`${creatorId ? `<@${creatorId}>` : ''} le ${label} **${channel.name}** n'est désormais plus entre les mains de ${member}.\n\nMerci de patienter en attendant qu'une autre personne prenne en charge votre ${label}.`)
    .setTimestamp()] });

  try {
    const msgs = await channel.messages.fetch({ limit: 10 });
    const welcome = msgs.find(m => m.author.id === client.user.id && m.components.length > 0);
    if (welcome) await welcome.edit({ components: [actionRow(false, prefix)] });
  } catch {}

  return interaction.reply({ content: `✅ Tu n'es plus en charge de ce ${label}.`, ephemeral: true });
}

async function handleTransfer(interaction, file, label) {
  const { member, channel } = interaction;
  const isStaff = member.roles.cache.has(STAFF_ROLE_ID) || member.permissions.has(PermissionFlagsBits.Administrator);
  if (!isStaff) return interaction.reply({ content: '⚠️ Tu n\'as pas la permission.', ephemeral: true });
  const existing = getClaimer(file, channel.id);
  if (!existing || existing !== member.id) return interaction.reply({ content: `⚠️ Seul le staff ayant réclamé ce ${label} peut le transférer.`, ephemeral: true });

  await interaction.reply({ content: '📩 Mentionne le membre du staff à qui tu veux transférer (ex: `@Pseudo`). Tu as 30 secondes.' });

  const collector = channel.createMessageCollector({ filter: m => m.mentions.members.size > 0 && m.author.id === member.id, time: 30000, max: 1 });
  collector.on('collect', async (msg) => {
    const newOwner = msg.mentions.members.first();
    await msg.delete().catch(() => {});
    const oldId = existing;
    setClaimer(file, channel.id, newOwner.id);
    const creatorId = getCreator(file, channel.id);
    await channel.send({ embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle('🔄 — Transfert')
      .setDescription(`${creatorId ? `<@${creatorId}>` : ''} le ${label} **${channel.name}** n'est désormais plus entre les mains de <@${oldId}>.\n\nDésormais c'est ${newOwner} qui prendra en charge votre ${label}.`)
      .setTimestamp()] });
  });
  collector.on('end', collected => {
    if (collected.size === 0) channel.send('⏱️ Temps écoulé, transfert annulé.').then(m => setTimeout(() => m.delete().catch(() => {}), 4000));
  });
}

async function handleClose(interaction, file, types, label) {
  const { member, guild, channel } = interaction;
  const claimerId  = getClaimer(file, channel.id);
  const creatorId  = getCreator(file, channel.id);
  const canClose   = member.id === creatorId || member.id === claimerId || member.permissions.has(PermissionFlagsBits.Administrator);
  if (!canClose) return interaction.reply({ content: `⚠️ Seul le créateur ou le staff en charge peut fermer ce ${label}.`, ephemeral: true });

  await interaction.reply({ content: `🔒 Fermeture du ${label} en cours...`, ephemeral: true });

  const transcriptBuffer = await generateTranscript(channel);
  const slugMatch = channel.name.match(/(?:ticket|candid)-([a-z-]+)-\d+/);
  const slug = slugMatch ? slugMatch[1] : null;
  const typeData = Object.values(types).find(t => t.slug === slug);

  const closeEmbed = new EmbedBuilder().setColor(0x000000).setTitle(`🔒 ${label.charAt(0).toUpperCase() + label.slice(1)} Fermé(e)`)
    .setDescription([`Le ${label} **${channel.name}** a été fermé(e).`, `Fermé(e) par : ${member}`].join('\n'))
    .setTimestamp().setFooter({ text: 'La Rayuna', icon_url: guild.iconURL({ dynamic: true }) });

  if (typeData) {
    const logCh = guild.channels.cache.get(typeData.logChannel);
    if (logCh) await logCh.send({ embeds: [closeEmbed], files: [{ attachment: transcriptBuffer, name: `${channel.name}.txt` }] }).catch(() => {});
  }

  if (creatorId) {
    try {
      const creator = await guild.members.fetch(creatorId);
      await creator.send({ content: `🔒 Ton ${label} **${channel.name}** sur **La Rayuna** a été fermé(e). Voici le transcript :`, files: [{ attachment: await generateTranscript(channel), name: `${channel.name}.txt` }] });
    } catch {}
    removeOpen(file, creatorId);
  }

  setTimeout(() => channel.delete().catch(() => {}), 3000);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  EXPORT PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════
module.exports = (client) => {

  // ── BIENVENUE ───────────────────────────────────────────────────────────────
  client.on('guildMemberAdd', async (member) => {
    if (member.guild.id !== GUILD_ID) return;

    const memberCount = member.guild.memberCount;
    const joinDate = new Date(member.joinedTimestamp).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    // Rôle bienvenue
    try {
      const role = member.guild.roles.cache.get(ROLE_BIENVENUE_ID);
      if (role) await member.roles.add(role);
    } catch (e) { console.error('❌ [Bienvenue] Rôle:', e.message); }

    // Ping + suppression
    try {
      const ch = member.guild.channels.cache.get(PING_CHANNEL_ID);
      if (ch) { const msg = await ch.send(`${member}`); setTimeout(() => msg.delete().catch(() => {}), 5000); }
    } catch (e) { console.error('❌ [Bienvenue] Ping:', e.message); }

    // Stats palier
    if (memberCount % PALIER === 0) {
      const statsCh = member.guild.channels.cache.get(STATS_CHANNEL_ID);
      if (statsCh) {
        const statsEmbed = new EmbedBuilder().setColor(0x000000).setTitle('🏆 Nouveau Record — La Rayuna')
          .setDescription([
            '> *« Chaque membre compte. Chaque présence construit quelque chose de grand. »*', '',
            `Aujourd'hui, **La Rayuna** franchit le cap des **${memberCount} membres**.`,
            `C'est grâce à chacun d'entre vous que cette communauté continue de grandir.`, '',
            '━━━━━━━━━━━━━━━━━━━━━━',
            `🎯 **Record atteint** : \`${memberCount} membres\``,
            `📅 **Date** : <t:${Math.floor(Date.now() / 1000)}:D>`,
            '━━━━━━━━━━━━━━━━━━━━━━', '',
            'Merci à tous pour votre fidélité et votre contribution à cette aventure.',
            'Continuons ensemble. 🌙',
          ].join('\n'))
          .setThumbnail(member.guild.iconURL({ dynamic: true, size: 256 }))
          .setTimestamp()
          .setFooter({ text: 'La Rayuna 〜 Une communauté, une famille.', icon_url: member.guild.iconURL({ dynamic: true }) });
        await statsCh.send({ content: '@everyone', embeds: [statsEmbed] }).catch(() => {});
      }
    }

    // Embed bienvenue webhook
    try {
      await axios.post(WEBHOOK_RAYUNA, {
        embeds: [{
          color: 0x000000,
          author: { name: '🎉 Nouvel Arrivant(e) !' },
          fields: [
            { name: `${member.user.username} a rejoint La Rayuna.`, value: 'Pose-toi, détends-toi et profite de la communauté. 🌙', inline: false },
            { name: '📅 Date d\'arrivée', value: joinDate, inline: true },
            { name: '👤 Membres', value: `#${memberCount}`, inline: true },
          ],
          thumbnail: { url: member.user.displayAvatarURL({ dynamic: true, size: 256 }) },
          footer: { text: 'Content de t\'avoir ici 〜', icon_url: member.guild.iconURL({ dynamic: true }) },
          timestamp: new Date().toISOString(),
        }],
      });
    } catch (e) { console.error('❌ [Bienvenue] Webhook:', e.response?.data || e.message); }
  });

  // ── BOOST ───────────────────────────────────────────────────────────────────
  client.on('guildMemberUpdate', async (oldMember, newMember) => {
    if (newMember.guild.id !== GUILD_ID) return;
    if (!(!oldMember.premiumSince && newMember.premiumSince)) return;

    const boostCount = newMember.guild.premiumSubscriptionCount;
    try {
      await axios.post(WEBHOOK_BOOST, {
        content: `${newMember}`,
        embeds: [{
          color: 0xff73fa,
          title: '💎 Nouveau Boost — La Rayuna',
          description: [
            '> *« Chaque boost est un pas de plus vers quelque chose de grand. »*', '',
            `**${newMember.user.username}** vient de booster le serveur ! 🚀`,
            `Grâce à toi, **La Rayuna** continue d'évoluer et d'offrir une meilleure expérience à toute la communauté.`, '',
            '━━━━━━━━━━━━━━━━━━━━━━',
            `💜 **Boosts actifs** : \`${boostCount} boost${boostCount > 1 ? 's' : ''}\``,
            `📅 **Date** : <t:${Math.floor(Date.now() / 1000)}:D>`,
            '━━━━━━━━━━━━━━━━━━━━━━', '',
            'Ton soutien nous aide à aller toujours plus loin.',
            'Merci du fond du cœur. 🌙',
          ].join('\n'),
          thumbnail: { url: newMember.user.displayAvatarURL({ dynamic: true, size: 256 }) },
          footer: { text: 'La Rayuna 〜 Merci pour ton soutien.', icon_url: newMember.guild.iconURL({ dynamic: true }) },
          timestamp: new Date().toISOString(),
        }],
      });
    } catch (e) { console.error('❌ [Boost] Webhook:', e.response?.data || e.message); }
  });

  // ── SMASH OR PASS ───────────────────────────────────────────────────────────
  client.on('messageCreate', async (message) => {
    if (message.guild?.id !== GUILD_ID) return;
    if (message.author.bot) return;

    if (message.channel.id === SMASHPASS_CHANNEL_ID) {
      try {
        const smash = message.guild.emojis.cache.find(e => e.name === 'Smash');
        const pass  = message.guild.emojis.cache.find(e => e.name === 'Pass');
        if (smash) await message.react(smash);
        if (pass)  await message.react(pass);
        const thread = await message.startThread({ name: `💬 ${message.author.username}`, autoArchiveDuration: 1440 });
        await thread.send([
          '# 💬 Fil créé !',
          'Vous pouvez désormais discuter et échanger dans ce fil sous cette publication.',
          '',
          '⚠️ **Règles à respecter**',
          '- Aucun contenu inapproprié ou "bizarre" ne sera toléré',
          '- Respect obligatoire entre tous les membres',
          '- Interdiction de spam, insultes ou comportements toxiques',
          '',
          '🚫 Tout manquement au règlement entraînera un bannissement immédiat, sans avertissement.',
          'Merci de votre compréhension et de votre sérieux.',
        ].join('\n'));
      } catch (e) { console.error('❌ [SmashPass]:', e.message); }
      return;
    }

    // ── COMMANDES ─────────────────────────────────────────────────────────────
    const isAdmin = message.member?.permissions.has(PermissionFlagsBits.Administrator);

    // !règlement-rayuna
    if (message.content === '!règlement-rayuna') {
      if (!isAdmin) { const r = await message.reply('❌ Permission refusée.'); setTimeout(() => r.delete().catch(() => {}), 4000); return; }
      await message.delete().catch(() => {});
      const ch = message.guild.channels.cache.get(REGLEMENT_CHANNEL_ID);
      if (ch) await ch.send({
        embeds: [new EmbedBuilder().setColor(0x000000).setTitle('📋 Règlement du Serveur')
          .setDescription([
            'Bienvenue sur le serveur ! Merci de lire et respecter les règles suivantes :', '',
            '🟦 **1 Respectez tout le monde**', 'Aucune insulte, discrimination ou harcèlement ne sera toléré.', '',
            '🟦 **2 Pas de spam**', 'Évitez les messages répétitifs, les majuscules excessives et les floods.', '',
            '🟦 **3 Pas de publicité**', 'Toute publicité non autorisée est interdite.', '',
            '🟦 **4 Contenu approprié**', 'Aucun contenu NSFW, choquant ou illégal ne sera toléré.', '',
            '🟦 **5 Respectez les salons**', 'Utilisez chaque salon pour son usage prévu.', '',
            '🟦 **6 Pas d\'usurpation d\'identité**', 'Il est interdit de se faire passer pour un autre membre ou un staff.', '',
            '🟦 **7 Suivez les directives de Discord**', 'Les CGU de Discord s\'appliquent sur ce serveur.', '',
            '*En cliquant sur le bouton ci-dessous, vous acceptez le règlement et obtenez l\'accès au serveur.*',
          ].join('\n'))
          .setFooter({ text: 'Cliquez sur le bouton pour accepter le règlement' }).setTimestamp()],
        components: [new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('accept_reglement_rayuna').setLabel('✅ Accepter le Règlement').setStyle(ButtonStyle.Success)
        )],
      });
      return;
    }

    // !autoroles
    if (message.content === '!autoroles') {
      if (!isAdmin) { const r = await message.reply('❌ Permission refusée.'); setTimeout(() => r.delete().catch(() => {}), 4000); return; }
      await message.delete().catch(() => {});
      const autoEmbed = new EmbedBuilder().setColor(0x000000).setTitle('🔔 Auto-Rôles')
        .setDescription([
          'Clique sur les boutons ci-dessous pour recevoir ou retirer les rôles de ping de ton choix.', '',
          '🎉 **Ping Giveaways** — Sois notifié des giveaways',
          '📢 **Ping Annonces** — Sois notifié des annonces',
          '🔧 **Ping Mise à Jour** — Sois notifié des mises à jour',
          '🎭 **Ping Évènements** — Sois notifié des évènements',
          '🎬 **Ping Animation** — Sois notifié des animations',
        ].join('\n'))
        .setFooter({ text: 'La Rayuna 〜 Clique pour toggle un rôle' }).setTimestamp();
      await message.channel.send({ embeds: [autoEmbed], components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('autorole_giveaways').setLabel('🎉 Ping Giveaways').setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId('autorole_annonces').setLabel('📢 Ping Annonces').setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId('autorole_maj').setLabel('🔧 Ping Mise à Jour').setStyle(ButtonStyle.Secondary),
        ),
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('autorole_evenements').setLabel('🎭 Ping Évènements').setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId('autorole_animation').setLabel('🎬 Ping Animation').setStyle(ButtonStyle.Secondary),
        ),
      ]});
      return;
    }

    // !ticket-rayuna
    if (message.content === '!ticket-rayuna') {
      if (!isAdmin) { const r = await message.reply('❌ Permission refusée.'); setTimeout(() => r.delete().catch(() => {}), 4000); return; }
      await message.delete().catch(() => {});
      const ch = message.guild.channels.cache.get(TICKET_CHANNEL_ID);
      if (ch) await ch.send({
        embeds: [new EmbedBuilder().setColor(0x000000).setTitle('🎫 Créer un Ticket')
          .setDescription([
            'Bienvenue dans le système de tickets de **La Rayuna**.', '',
            'Sélectionne le type de ticket correspondant à ta demande :', '',
            '🚨 **Report Staff** — Signaler un membre du staff',
            '🆘 **Aide** — Obtenir de l\'aide',
            '⚠️ **Report Membres** — Signaler un membre',
            '🤝 **Partenariat** — Proposer un partenariat', '',
            '*Un membre du staff prendra en charge votre demande dans les meilleurs délais.*',
          ].join('\n'))
          .setFooter({ text: 'La Rayuna 〜 Support', icon_url: message.guild.iconURL({ dynamic: true }) }).setTimestamp()],
        components: [new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('create_ticket_rpt_staff').setLabel('Report Staff').setEmoji('🚨').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId('create_ticket_aide').setLabel('Aide').setEmoji('🆘').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('create_ticket_rpt_membres').setLabel('Report Membres').setEmoji('⚠️').setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId('create_ticket_partenaire').setLabel('Partenariat').setEmoji('🤝').setStyle(ButtonStyle.Success),
        )],
      });
      return;
    }

    // !candid-rayuna
    if (message.content === '!candid-rayuna') {
      if (!isAdmin) { const r = await message.reply('❌ Permission refusée.'); setTimeout(() => r.delete().catch(() => {}), 4000); return; }
      await message.delete().catch(() => {});
      await message.channel.send({
        embeds: [new EmbedBuilder().setColor(0x000000).setTitle('📋 Candidatures — La Rayuna')
          .setDescription([
            'Tu souhaites rejoindre l\'équipe de **La Rayuna** ?', '',
            'Sélectionne le poste pour lequel tu souhaites candidater :', '',
            '⭐ **Devenir Staff** — Rejoins l\'équipe de modération',
            '🎯 **Devenir Recruteur** — Rejoins l\'équipe de recrutement', '',
            '*Ton dossier sera examiné par l\'équipe dans les meilleurs délais.*',
          ].join('\n'))
          .setFooter({ text: 'La Rayuna 〜 Candidatures', icon_url: message.guild.iconURL({ dynamic: true }) }).setTimestamp()],
        components: [new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('create_candid_devenir_staff').setLabel('Devenir Staff').setEmoji('⭐').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('create_candid_devenir_recruteur').setLabel('Devenir Recruteur').setEmoji('🎯').setStyle(ButtonStyle.Success),
        )],
      });
      return;
    }
  });

  // ── INTERACTIONS ────────────────────────────────────────────────────────────
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;
    if (interaction.guild?.id !== GUILD_ID) return;

    const { customId, member, guild, channel } = interaction;

    // ── Règlement ──────────────────────────────────────────────────────────────
    if (customId === 'accept_reglement_rayuna') {
      if (member.roles.cache.has(ROLE_ACCES_ID)) return interaction.reply({ content: '⚠️ Vous avez déjà accepté le règlement !', ephemeral: true });
      try {
        await member.roles.add(ROLE_ACCES_ID);
        await interaction.reply({ content: '✅ Merci d\'avoir accepté le règlement, tu as désormais accès aux salons principaux !', ephemeral: true });
      } catch { await interaction.reply({ content: '❌ Une erreur est survenue.', ephemeral: true }); }
      return;
    }

    // ── Autoroles ──────────────────────────────────────────────────────────────
    if (customId.startsWith('autorole_') && !customId.startsWith('autorole_remove_')) {
      const key = customId.replace('autorole_', '');
      const roleData = AUTOROLES[key];
      if (!roleData) return;
      if (member.roles.cache.has(roleData.id)) {
        return interaction.reply({ content: `⚠️ Tu as déjà le rôle **${roleData.label}**, veux-tu l'enlever ?`, ephemeral: true,
          components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`autorole_remove_${key}`).setLabel('🗑️ Enlever le rôle').setStyle(ButtonStyle.Danger))] });
      }
      try { await member.roles.add(roleData.id); await interaction.reply({ content: `✅ Le rôle <@&${roleData.id}> a bien été ajouté !`, ephemeral: true }); }
      catch { await interaction.reply({ content: '❌ Erreur, contacte un admin.', ephemeral: true }); }
      return;
    }

    if (customId.startsWith('autorole_remove_')) {
      const key = customId.replace('autorole_remove_', '');
      const roleData = AUTOROLES[key];
      if (!roleData) return;
      try { await member.roles.remove(roleData.id); await interaction.update({ content: `✅ Le rôle **${roleData.label}** a bien été retiré !`, components: [] }); }
      catch { await interaction.update({ content: '❌ Erreur, contacte un admin.', components: [] }); }
      return;
    }

    // ── Création ticket ────────────────────────────────────────────────────────
    if (customId.startsWith('create_ticket_')) {
      const typeKey = customId.replace('create_ticket_', '');
      const type = TICKET_TYPES[typeKey];
      if (!type) return;

      const existing = getOpen(TICKET_COUNTER, member.id);
      if (existing) {
        const existCh = guild.channels.cache.get(existing);
        return interaction.reply({ content: `⚠️ Tu as déjà un ticket ouvert : ${existCh || 'introuvable'}. Ferme-le avant d'en ouvrir un nouveau.`, ephemeral: true });
      }

      await interaction.deferReply({ ephemeral: true });
      const num = nextNum(TICKET_COUNTER);
      const ticketName = `❌-ticket-${type.slug}-${num}`;
      const perms = [
        { id: guild.roles.everyone, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: member.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
        ...type.roles.map(r => ({ id: r, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory, PermissionsBitField.Flags.ManageMessages] })),
      ];
      let ticketCh;
      try { ticketCh = await guild.channels.create({ name: ticketName, type: ChannelType.GuildText, parent: TICKET_CATEGORY_ID, permissionOverwrites: perms }); }
      catch (e) { return interaction.editReply({ content: '❌ Impossible de créer le salon ticket.' }); }

      setCreator(TICKET_COUNTER, ticketCh.id, member.id);
      setOpen(TICKET_COUNTER, member.id, ticketCh.id);

      await ticketCh.send({
        content: type.roles.map(r => `<@&${r}>`).join(' ') + ` ${member}`,
        embeds: [new EmbedBuilder().setColor(0x000000).setTitle('🎫 Ticket Créé')
          .setDescription([`Bienvenue ${member} !`, '', '> Veuillez patienter, un membre du staff prendra en charge votre demande dans les meilleurs délais.', '', `**Catégorie :** ${type.emoji} ${type.label}`, `**Ticket n°** : ${num}`].join('\n'))
          .setFooter({ text: `Support — La Rayuna • ${new Date().toLocaleDateString('fr-FR')}`, icon_url: guild.iconURL({ dynamic: true }) }).setTimestamp()],
        components: [actionRow(false, 'ticket')],
      });
      return interaction.editReply({ content: `✅ Ton ticket a été créé : ${ticketCh}` });
    }

    // ── Actions ticket ─────────────────────────────────────────────────────────
    if (customId === 'ticket_claim')    return handleClaim(interaction, TICKET_COUNTER, 'ticket', client, 'ticket');
    if (customId === 'ticket_unclaim')  return handleUnclaim(interaction, TICKET_COUNTER, 'ticket', client, 'ticket');
    if (customId === 'ticket_transfer') return handleTransfer(interaction, TICKET_COUNTER, 'ticket');
    if (customId === 'ticket_close')    return handleClose(interaction, TICKET_COUNTER, TICKET_TYPES, 'ticket');

    // ── Création candidature ───────────────────────────────────────────────────
    if (customId.startsWith('create_candid_')) {
      const typeKey = customId.replace('create_candid_', '');
      const type = CANDID_TYPES[typeKey];
      if (!type) return;

      const existing = getOpen(CANDID_COUNTER, member.id);
      if (existing) {
        const existCh = guild.channels.cache.get(existing);
        return interaction.reply({ content: `⚠️ Tu as déjà une candidature ouverte : ${existCh || 'introuvable'}. Ferme-la avant d'en ouvrir une nouvelle.`, ephemeral: true });
      }

      await interaction.deferReply({ ephemeral: true });
      const num = nextNum(CANDID_COUNTER);
      const candidName = `❌-candid-${type.slug}-${num}`;
      const perms = [
        { id: guild.roles.everyone, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: member.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
        ...type.roles.map(r => ({ id: r, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory, PermissionsBitField.Flags.ManageMessages] })),
      ];
      let candidCh;
      try { candidCh = await guild.channels.create({ name: candidName, type: ChannelType.GuildText, parent: TICKET_CATEGORY_ID, permissionOverwrites: perms }); }
      catch (e) { return interaction.editReply({ content: '❌ Impossible de créer le salon de candidature.' }); }

      setCreator(CANDID_COUNTER, candidCh.id, member.id);
      setOpen(CANDID_COUNTER, member.id, candidCh.id);

      await candidCh.send({
        content: type.roles.map(r => `<@&${r}>`).join(' ') + ` ${member}`,
        embeds: [new EmbedBuilder().setColor(0x000000).setTitle('📋 Candidature Créée')
          .setDescription([`Bienvenue ${member} !`, '', '> Veuillez patienter, un membre de l\'équipe examinera votre candidature dans les meilleurs délais.', '', `**Poste visé :** ${type.emoji} ${type.label}`, `**Candidature n°** : ${num}`, '', '*Profites-en pour nous expliquer ta motivation et ton expérience !*'].join('\n'))
          .setFooter({ text: `Candidatures — La Rayuna • ${new Date().toLocaleDateString('fr-FR')}`, icon_url: guild.iconURL({ dynamic: true }) }).setTimestamp()],
        components: [actionRow(false, 'candid')],
      });
      return interaction.editReply({ content: `✅ Ta candidature a été créée : ${candidCh}` });
    }

    // ── Actions candidature ────────────────────────────────────────────────────
    if (customId === 'candid_claim')    return handleClaim(interaction, CANDID_COUNTER, 'candid', client, 'candidature');
    if (customId === 'candid_unclaim')  return handleUnclaim(interaction, CANDID_COUNTER, 'candid', client, 'candidature');
    if (customId === 'candid_transfer') return handleTransfer(interaction, CANDID_COUNTER, 'candidature');
    if (customId === 'candid_close')    return handleClose(interaction, CANDID_COUNTER, CANDID_TYPES, 'candidature');
  });
};