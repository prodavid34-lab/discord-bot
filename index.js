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

const AUTHORIZED_ID = "566510674424102922";
const GUILD_ID = "719294957856227399";
const VOICE_CHANNEL_ID = "1174486339958358136";

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

function connectToVoice(guild) {
  if (!autoJoinEnabled) return;

  connection = joinVoiceChannel({
    channelId: VOICE_CHANNEL_ID,
    guildId: guild.id,
    adapterCreator: guild.voiceAdapterCreator,
  });

  connection.subscribe(player);

  // 🔁 Reconnexion automatique
  connection.on(VoiceConnectionStatus.Disconnected, () => {
    if (!autoJoinEnabled) return;

    setTimeout(() => {
      connectToVoice(guild);
    }, 2000);
  });
}

client.once("ready", () => {
  console.log(`✅ Bot connecté en tant que ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (message.author.id !== AUTHORIZED_ID) return;

  // ▶️ DÉMARRER
  if (message.content === "!glxmus1") {
    autoJoinEnabled = true;

    connectToVoice(message.guild);

    const resource = createAudioResource(
      path.join(__dirname, "son.mp3")
    );
    player.play(resource);

    return message.reply("🎵 Lecture lancée + connexion automatique activée.");
  }

  // ⏹️ ARRÊTER
  if (message.content === "!glxmus1st") {
    autoJoinEnabled = false;

    player.stop();

    if (connection) {
      connection.destroy();
      connection = null;
    }

    return message.reply("⛔ Lecture arrêtée et reconnexion désactivée.");
  }
});

// 🔁 Boucle audio
player.on(AudioPlayerStatus.Idle, () => {
  if (!autoJoinEnabled) return;

  const resource = createAudioResource(
    path.join(__dirname, "son.mp3")
  );
  player.play(resource);
});

client.login(process.env.TOKEN);




