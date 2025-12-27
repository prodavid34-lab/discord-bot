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

// ===========================
//   CONFIG
// ===========================
const AUTHORIZED_IDS = [
  "566510674424102922", // toi
  "836677770373103636", // Ten
  "1331647713149714513" // Antoine
];

const GUILD_ID = "719294957856227399";
const VOICE_CHANNEL_ID = "1298625202090934336";

// ===========================
//   CLIENT
// ===========================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

const player = createAudioPlayer();
let connection = null;
let autoJoinEnabled = false;

// ===========================
//   Connexion au vocal
// ===========================
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
      console.log("✅ Connecté au vocal (unmute + deaf)");
    });

    connection.on(VoiceConnectionStatus.Disconnected, () => {
      console.log("⚠️ Déconnecté, reconnexion...");
      if (!autoJoinEnabled) return;
      setTimeout(() => connectToVoice(), 2000);
    });

  } catch (err) {
    console.error("❌ Erreur vocal :", err);
  }
}

// ===========================
//   Gestion voiceState
// ===========================
client.on("voiceStateUpdate", async (oldState, newState) => {
  if (!autoJoinEnabled) return;
  if (newState.id !== client.user.id) return;

  try {
    if (newState.serverMute) {
      await newState.setMute(false);
      console.log("🔊 Server-unmute appliqué automatiquement");
    }

    if (!newState.selfDeaf) {
      await newState.setDeaf(true);
      console.log("🔇 Deaf remise automatiquement");
    }

    if (newState.channelId && newState.channelId !== VOICE_CHANNEL_ID) {
      console.log("⚠️ Bot déplacé, retour au salon d'origine...");
      const guild = await client.guilds.fetch(GUILD_ID);
      const channel = await guild.channels.fetch(VOICE_CHANNEL_ID);
      if (channel && channel.type === 2) {
        await newState.setChannel(channel);
        console.log("✅ Bot revenu dans le salon d'origine");
      }
    }
  } catch (err) {
    console.error("❌ Impossible d'appliquer les changements :", err);
  }
});

// ===========================
//   READY
// ===========================
client.once("ready", () => {
  console.log(`✅ Bot connecté en tant que ${client.user.tag}`);
});

// ===========================
//   Commandes
// ===========================
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  // Autorisation multiple
  if (!AUTHORIZED_IDS.includes(message.author.id)) return;

  // ▶️ START
  if (message.content === "!glxmus1") {
    autoJoinEnabled = true;
    await connectToVoice();

    const resource = createAudioResource(path.join(__dirname, "son.mp3"));
    player.play(resource);

    return message.reply("🎵 Lecture lancée | Bot toujours unmute + sourdine");
  }

  // ⏹️ STOP
  if (message.content === "!glxmus1st") {
    autoJoinEnabled = false;
    player.stop();

    if (connection) {
      connection.destroy();
      connection = null;
    }

    return message.reply("⛔ Arrêt + reconnexion désactivée.");
  }
});

// ===========================
//   Boucle audio
// ===========================
player.on(AudioPlayerStatus.Idle, () => {
  if (!autoJoinEnabled) return;
  const resource = createAudioResource(path.join(__dirname, "son.mp3"));
  player.play(resource);
});

client.login(process.env.TOKEN);
