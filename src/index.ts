import { SlashCommandBuilder } from "@discordjs/builders";
import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/rest/v9";
import { StageInstance } from "discord.js";

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
let channelOuput: string;

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
  channelOuput = "912365656719114330";
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

client.on("stageInstanceCreate", async (stageInstance: StageInstance) => {
  const channel = stageInstance.channel;
  if (channel && !connected) {
    try {
      connected = true;
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

      await client.channels.cache
        .get(channelOuput)
        .send(`Joined channel ${channel.name}`);
    } catch (error) {
      client.channels.cache.get(channelOuput).send(`${error}`);
    }
  } else {
    await client.channels.cache
      .get(channelOuput)
      .send(
        "Sorry, I can't! I'm in a channel already or you're not in a voice channel."
      );
  }
});

client.on("stageInstanceDelete", async (stageInstance: StageInstance) => {
  try {
    clearInterval(intervalObj);

    let output;

    if (userTimers.size == 0) {
      output = "No users spent more than 1 minute in the voice chat.";
      await client.channels.cache.get(channelOuput).send(output);
    }

    let userTimersArray = Array.from(userTimers.entries());

    const chunkSize = 10;
    for (let i = 0; i < userTimersArray.length; i += chunkSize) {
      const chunk = userTimersArray.slice(i, i + chunkSize);

      output = table(chunk, {
        align: ["l", "r"],
        hsep: " - ",
      });

      await client.channels.cache.get(channelOuput).send(output);
    }

    voiceConnection.destroy();
    connected = false;
  } catch (error) {
    await client.channels.cache.get(channelOuput).send(`${error}`);
    voiceConnection.destroy();
    connected = false;
  }
});

client.login(process.env.TOKEN);
