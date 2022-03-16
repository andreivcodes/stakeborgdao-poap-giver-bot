require("dotenv").config();
const { Client } = require("discord.js");
const {
  NoSubscriberBehavior,
  StreamType,
  createAudioPlayer,
  createAudioResource,
  entersState,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  joinVoiceChannel,
} = require("@discordjs/voice");

let voiceConnection: any;
let intervalObj: any;
let userTimers: any;

async function connectToChannel(channel: {
  id: any;
  guild: { id: any; voiceAdapterCreator: any };
}) {
  const connection = joinVoiceChannel({
    channelId: channel.id,
    guildId: channel.guild.id,
    adapterCreator: channel.guild.voiceAdapterCreator,
  });
  try {
    await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
    return connection;
  } catch (error) {
    connection.destroy();
    throw error;
  }
}

const client = new Client({
  intents: ["GUILDS", "GUILD_MESSAGES", "GUILD_VOICE_STATES"],
});

client.on("ready", async () => {
  console.log("discord.js client is ready!");
});

client.on(
  "messageCreate",
  async (message: {
    guild: any;
    content: string;
    member: { voice: { channel: any } };
    reply: (arg0: string) => any;
  }) => {
    if (!message.guild) return;
    if (message.content === "/poap_join") {
      const channel = message.member?.voice.channel;
      if (channel) {
        try {
          voiceConnection = await connectToChannel(channel);

          userTimers = new Map();

          intervalObj = setInterval(() => {
            console.log("Get users list");
            channel.members.each((member: any) => {
              console.log(member.user.username);
              userTimers.set(
                member.user.username,
                userTimers.get(member.user.username)
                  ? userTimers.get(member.user.username) + 1
                  : 1
              );
            });
            console.log(JSON.stringify(Array.from(userTimers.entries())));
          }, 1000);

          await message.reply(`Joined channel ${channel.name}`);
        } catch (error) {
          await message.reply(`${error}`);
        }
      } else {
        await message.reply("Join a voice channel then try again!");
      }
    } else if (message.content === "/poap_leave") {
      try {
        clearInterval(intervalObj);
        await message.reply(JSON.stringify(Array.from(userTimers.entries())));
        voiceConnection.destroy();
        await message.reply(`Left channel`);
      } catch (error) {
        await message.reply(`${error}`);
      }
    } else if (message.content === "/poap_help") {
      try {
        await message.reply(
          `/poap_join - bot joins the voice channel you're in`
        );
        await message.reply(
          `/poap_leave - bot shows the users list and leaves the voice channel`
        );
      } catch (error) {
        await message.reply(`${error}`);
      }
    }
  }
);

void client.login(process.env.TOKEN);
