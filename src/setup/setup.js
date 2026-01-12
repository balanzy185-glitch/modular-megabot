import { PermissionFlagsBits, ChannelType } from 'discord.js';

export function buildDefaultBlueprint() {
  return {
    roles: [
      { name: 'Owner', color: 0xf1c40f, perms: ['Administrator'] },
      { name: 'Admin', color: 0xe74c3c, perms: ['Administrator'] },
      { name: 'Mod', color: 0x3498db, perms: ['ManageGuild', 'ManageMessages', 'KickMembers', 'BanMembers', 'ManageChannels'] },
      { name: 'Member', color: 0x2ecc71, perms: [] },
      { name: 'Quarantine', color: 0x95a5a6, perms: [] }
    ],
    categories: [
      {
        name: 'INFO',
        channels: [
          { name: 'rules', type: 'text', readonly: true },
          { name: 'announcements', type: 'text', readonly: true }
        ]
      },
      {
        name: 'COMMUNITY',
        channels: [
          { name: 'chat', type: 'text' },
          { name: 'media', type: 'text' }
        ]
      },
      {
        name: 'SUPPORT',
        channels: [{ name: 'support', type: 'text' }]
      }
    ]
  };
}

function permFromString(s) {
  const map = {
    Administrator: PermissionFlagsBits.Administrator,
    ManageGuild: PermissionFlagsBits.ManageGuild,
    ManageMessages: PermissionFlagsBits.ManageMessages,
    KickMembers: PermissionFlagsBits.KickMembers,
    BanMembers: PermissionFlagsBits.BanMembers,
    ManageChannels: PermissionFlagsBits.ManageChannels
  };
  return map[s];
}

export async function runSetup(guild, blueprint) {
  const existingRoles = new Map(guild.roles.cache.map((r) => [r.name, r]));

  for (const r of blueprint.roles) {
    if (existingRoles.has(r.name)) continue;

    const perms = r.perms.map(permFromString).filter(Boolean);
    await guild.roles.create({
      name: r.name,
      color: r.color,
      permissions: perms
    });
  }

  const existingChannels = new Map(guild.channels.cache.map((c) => [c.name, c]));

  const everyone = guild.roles.everyone;
  const quarantine = guild.roles.cache.find((r) => r.name === 'Quarantine');

  for (const cat of blueprint.categories) {
    let category = existingChannels.get(cat.name);
    if (!category) {
      category = await guild.channels.create({
        name: cat.name,
        type: ChannelType.GuildCategory
      });
    }

    for (const ch of cat.channels) {
      if (existingChannels.has(ch.name)) continue;

      const type = ch.type === 'voice' ? ChannelType.GuildVoice : ChannelType.GuildText;

      const permissionOverwrites = [];

      if (quarantine) {
        permissionOverwrites.push({
          id: quarantine.id,
          deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.AddReactions]
        });
      }

      if (ch.readonly) {
        permissionOverwrites.push({
          id: everyone.id,
          deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.AddReactions]
        });
      }

      await guild.channels.create({
        name: ch.name,
        type,
        parent: category.id,
        permissionOverwrites
      });
    }
  }

  return {
    summary:
      `Roles ensured: ${blueprint.roles.map((r) => r.name).join(', ')}\n` +
      `Categories ensured: ${blueprint.categories.map((c) => c.name).join(', ')}`
  };
}
