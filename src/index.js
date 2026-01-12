import 'dotenv/config';
import {
  Client,
  GatewayIntentBits,
  Partials,
  Collection,
  REST,
  Routes,
  PermissionFlagsBits
} from 'discord.js';

import { loadModules } from './modules/loader.js';
import { guildStore } from './store/guildStore.js';
import { buildDefaultBlueprint, runSetup } from './setup/setup.js';

const token = process.env.DISCORD_TOKEN;
const guildId = process.env.GUILD_ID;

if (!token) throw new Error('Missing DISCORD_TOKEN in .env');
if (!guildId) throw new Error('Missing GUILD_ID in .env');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages
  ],
  partials: [Partials.Channel]
});

client.commands = new Collection();
client.modules = new Map(); // moduleId -> module

const slashCommands = [
  { name: 'ping', description: 'Health check' },
  {
    name: 'setup',
    description: 'Auto-setup server (channels/roles/permissions)',
    default_member_permissions: String(PermissionFlagsBits.Administrator)
  },
  {
    name: 'modules',
    description: 'Enable/disable bot modules',
    default_member_permissions: String(PermissionFlagsBits.Administrator),
    options: [
      { type: 1, name: 'list', description: 'List modules' },
      {
        type: 1,
        name: 'enable',
        description: 'Enable a module for this server',
        options: [{ type: 3, name: 'id', description: 'module id', required: true }]
      },
      {
        type: 1,
        name: 'disable',
        description: 'Disable a module for this server',
        options: [{ type: 3, name: 'id', description: 'module id', required: true }]
      }
    ]
  }
];

async function registerSlash() {
  const rest = new REST({ version: '10' }).setToken(token);
  await rest.put(Routes.applicationGuildCommands(client.user.id, guildId), {
    body: slashCommands
  });
}

client.on('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);

  await guildStore.init();

  const loaded = await loadModules(client);
  console.log(`Loaded modules: ${loaded.join(', ')}`);

  await registerSlash();
  console.log('Slash commands registered.');
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  try {
    if (interaction.commandName === 'ping') {
      return interaction.reply({ content: 'pong ✅', ephemeral: true });
    }

    if (interaction.commandName === 'setup') {
      await interaction.deferReply({ ephemeral: true });
      const blueprint = buildDefaultBlueprint();
      const result = await runSetup(interaction.guild, blueprint);
      return interaction.editReply(`✅ Setup complete.\n${result.summary}`);
    }

    if (interaction.commandName === 'modules') {
      const sub = interaction.options.getSubcommand();

      if (sub === 'list') {
        const enabled = await guildStore.getEnabledModules(interaction.guildId);
        const enabledSet = new Set(enabled);
        const lines = [...client.modules.values()].map((m) => {
          const status = enabledSet.has(m.id) ? '✅ enabled' : '⛔ disabled';
          return `• \`${m.id}\` — ${m.name} (${status})`;
        });
        return interaction.reply({ content: lines.join('\n'), ephemeral: true });
      }

      const id = interaction.options.getString('id', true);
      const mod = client.modules.get(id);
      if (!mod) return interaction.reply({ content: `❌ Unknown module id: ${id}`, ephemeral: true });

      if (sub === 'enable') {
        await guildStore.enableModule(interaction.guildId, id);
        return interaction.reply({ content: `✅ Enabled \`${id}\``, ephemeral: true });
      }

      if (sub === 'disable') {
        await guildStore.disableModule(interaction.guildId, id);
        return interaction.reply({ content: `⛔ Disabled \`${id}\``, ephemeral: true });
      }
    }

    // Optional: let modules handle slash commands later
    for (const mod of client.modules.values()) {
      if (typeof mod.onSlash === 'function') {
        const handled = await mod.onSlash(interaction);
        if (handled) return;
      }
    }
  } catch (err) {
    console.error(err);
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply('❌ حصل خطأ. شيّك الكونسول.');
    } else {
      await interaction.reply({ content: '❌ حصل خطأ. شيّك الكونسول.', ephemeral: true });
    }
  }
});

client.on('guildMemberAdd', async (member) => {
  for (const mod of client.modules.values()) {
    if (typeof mod.onMemberAdd === 'function') {
      const enabled = await guildStore.isModuleEnabled(member.guild.id, mod.id);
      if (enabled) mod.onMemberAdd(member);
    }
  }
});

client.login(token);
