require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
} = require("@discordjs/voice");
const path = require("path");

// ---------------- CONFIG ----------------
const AUTHORIZED_ID = "566510674424102922";
const GUILD_ID = "719294957856227399";
const VOICE_CHANNEL_ID = "1298625202090934336";

// 🔥 CONFIG SOUTIEN
const ROLE_ID = "ID_DU_ROLE_SOUTIEN"; // <-- Mets ton rôle soutien ici

const KEYWORDS = [
  "discord.gg/galaxrp",
  "https://discord.gg/galaxrp",
  "galaxrp"
];

// Temps entre 2 scans
const CHECK_INTERVAL = 60 * 1000; // 60 sec

// -----------------------------------------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildPresences // 🚨 Nécessaire pour lire les statuts !
  ],
});

const player = createAudioPlayer();
let connection = null;
let autoJoinEnabled = false;

// -------------------------
// VOICE FUNCTION
// -------------------------
async function connectToVoice() {
  if (!autoJoinEnabled) return;
  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    const channel = await guild.channels.fetch(VOICE_CHANNEL_ID);

    if (!channel || channel.type !== 2) {
      console.error("❌ Salon vocal invalide");
      return;
    }

    console.log("🔊 Connexion au vocal...");
    connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: guild.id,
      adapterCreator: guild.voiceAdapterCreator,
      selfDeaf: true,
      selfMute: false,
    });

    connection.subscribe(player);

    connection.on(VoiceConnectionStatus.Ready, () => {
      console.log("✅ Bot connecté au vocal");
    });

    connection.on(VoiceConnectionStatus.Disconnected, () => {
      console.log("⚠️ Déconnecté, reconnexion...");
      if (!autoJoinEnabled) return;
      setTimeout(connectToVoice, 2000);
    });
  } catch (err) {
    console.error("❌ Erreur vocal :", err);
  }
}

// ------------------------------
// SCAN STATUTS TOUTES LES X sec
// ------------------------------
async function scanStatuses() {
  const guild = await client.guilds.fetch(GUILD_ID);
  const members = await guild.members.fetch();

  for (const [id, member] of members) {
    const presence = member.presence;
    const role = member.roles.cache.has(ROLE_ID);

    // Récup statut custom
    const custom =
      presence?.activities?.find(a => a.type === 4 /* CUSTOM */)?.state || "";

    const hasKeyword = KEYWORDS.some(k =>
      custom.toLowerCase().includes(k.toLowerCase())
    );

    // 🔥 Ajout du rôle si mot clé trouvé
    if (hasKeyword && !role) {
      member.roles.add(ROLE_ID).catch(() => {});
      console.log(`+ Soutien ajouté à ${member.user.tag}`);
    }

    // ❌ Retrait si plus de mot clé
    if (!hasKeyword && role) {
      member.roles.remove(ROLE_ID).catch(() => {});
      console.log(`- Soutien retiré à ${member.user.tag}`);
    }
  }
}

// Scan toutes les X secondes
setInterval(scanStatuses, CHECK_INTERVAL);

// -------------------------
// READY
// -------------------------
client.once("ready", () => {
  console.log(`✅ Bot connecté en tant que ${client.user.tag}`);
});

// -------------------------
// COMMANDES
// -------------------------
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (message.author.id !== AUTHORIZED_ID) return;

  if (message.content === "!glxmus1") {
    autoJoinEnabled = true;
    await connectToVoice();
    const resource = createAudioResource(path.join(__dirname, "son.mp3"));
    player.play(resource);
    return message.reply("🎵 Lecture lancée");
  }

  if (message.content === "!glxmus1st") {
    autoJoinEnabled = false;
    player.stop();
    if (connection) connection.destroy();
    return message.reply("⛔ Musique arrêtée");
  }
});

// -------------------------
// LOOP AUDIO
// -------------------------
player.on(AudioPlayerStatus.Idle, () => {
  if (!autoJoinEnabled) return;
  const resource = createAudioResource(path.join(__dirname, "son.mp3"));
  player.play(resource);
});

client.login(process.env.TOKEN);
