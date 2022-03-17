import { SlashCommandBuilder } from "@discordjs/builders";
import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/rest/v9";

require("dotenv").config();
const { Client } = require("discord.js");
const {
  entersState,
  VoiceConnectionStatus,
  joinVoiceChannel,
} = require("@discordjs/voice");
let table = require("text-table");

let voiceConnection: any;
let intervalObj: any;
let userTimers: any;
let connected: boolean;
let owner: any;

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

const commands = [
  new SlashCommandBuilder()
    .setName("poap_join")
    .setDescription("bot joins the voice channel you're in"),
  new SlashCommandBuilder()
    .setName("poap_leave")
    .setDescription("bot shows the users list and leaves the voice channel"),
].map((command) => command.toJSON());

const rest = new REST({ version: "9" }).setToken(`${process.env.TOKEN}`);

rest
  .put(
    Routes.applicationGuildCommands(
      `${process.env.CLIENTID}`,
      `${process.env.SERVERID}`
    ),
    {
      body: commands,
    }
  )
  .then(() => console.log("Successfully registered application commands."))
  .catch(console.error);

client.on(
  "interactionCreate",
  async (interaction: {
    isCommand?: any;
    member?: any;
    reply?: any;
    commandName?: any;
  }) => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    if (commandName === "poap_join") {
      const channel = interaction.member?.voice.channel;
      if (channel && !connected) {
        try {
          connected = true;
          owner = interaction.member;
          voiceConnection = await connectToChannel(channel);

          userTimers = new Map();

          intervalObj = setInterval(() => {
            console.log("Get users list");
            channel.members.each((member: any) => {
              console.log(member.user.tag);
              userTimers.set(
                member.user.tag,
                userTimers.get(member.user.tag)
                  ? userTimers.get(member.user.tag) + 1
                  : 1
              );
            });
            console.log(JSON.stringify(Array.from(userTimers.entries())));
          }, 60 * 1000);

          await interaction.reply(`Joined channel ${channel.name}`);
        } catch (error) {
          await interaction.reply(`${error}`);
        }
      } else {
        await interaction.reply("Join a voice channel and try again!");
      }
    } else if (commandName === "poap_leave" && interaction.member == owner) {
      try {
        clearInterval(intervalObj);

        await interaction.reply(
          table(Array.from(userTimers.entries()), {
            align: ["l", "r"],
            hsep: "             |             ",
          })
        );

        voiceConnection.destroy();
        connected = false;
      } catch (error) {
        await interaction.reply(`${error}`);
      }
    }
  }
);

client.login(process.env.TOKEN);
