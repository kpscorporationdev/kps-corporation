const https = require('https');

// ══════════════════════════════════════════
//   CONFIGURATION — STREETNOVA
// ══════════════════════════════════════════
const GUILD_ID           = '1432658174967677033';
const ROLE_AUTO_ID       = '1493282419300892807';
const WEBHOOK_STREETNOVA = process.env.WEBHOOK_STREETNOVA;

// ══════════════════════════════════════════
//   MODULE
// ══════════════════════════════════════════
module.exports = function(client) {

  client.on('guildMemberAdd', async function(member) {
    if (member.guild.id !== GUILD_ID) return;

    const user      = member.user;
    const username  = user.username;
    const mention   = `<@${user.id}>`;
    const avatarURL = user.displayAvatarURL({ size: 256, extension: 'png' });

    // ── Ajout automatique du rôle ──
    try {
      await member.roles.add(ROLE_AUTO_ID);
      console.log(`✅ [STREETNOVA] Rôle auto donné à : ${username}`);
    } catch (error) {
      console.error(`❌ [STREETNOVA] Erreur ajout rôle auto : ${error.message}`);
    }

    // ── Message de bienvenue via Webhook ──
    const now     = new Date();
    const dateStr = now.toLocaleDateString('fr-FR', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });

    const payload = {
      embeds: [{
        title: '🎉 Nouvelle Arrivant(e) !',
        description:
          `Bienvenue parmi nous, ${mention} ! 🎊\n\n` +
          `La cloche a sonné et toute la communauté est là pour t'accueillir comme il se doit ! 🔔✨\n` +
          `Installe-toi confortablement, car ici est ton endroit tant rêvé ! 🚀🔥`,
        color: 0x5865f2,
        thumbnail: { url: avatarURL },
        fields: [
          { name: "📅 Date d'arrivée", value: dateStr,                        inline: true },
          { name: '👥 Membres',        value: `#${member.guild.memberCount}`, inline: true },
        ],
        footer: { text: "Heureux de t'avoir parmi nous !" },
        timestamp: now.toISOString(),
      }],
    };

    const body = JSON.stringify(payload);
    const url  = new URL(WEBHOOK_STREETNOVA);

    const req = https.request({
      hostname: url.hostname,
      path:     url.pathname,
      method:   'POST',
      headers: {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      console.log(
        res.statusCode >= 200 && res.statusCode < 300
          ? `✅ [STREETNOVA] Bienvenue envoyé pour : ${username}`
          : `❌ [STREETNOVA] Erreur webhook : ${res.statusCode}`
      );
    });

    req.on('error', (e) => console.error(`❌ [STREETNOVA] ${e.message}`));
    req.write(body);
    req.end();
  });

};
