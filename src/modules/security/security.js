export const securityModule = {
  id: 'security',
  name: 'Security (basic placeholder)',

  async onMemberAdd(member) {
    const created = member.user.createdTimestamp;
    const ageDays = (Date.now() - created) / (1000 * 60 * 60 * 24);

    if (ageDays < 3) {
      const role = member.guild.roles.cache.find((r) => r.name === 'Quarantine');
      if (role) await member.roles.add(role).catch(() => {});
    }
  }
};
