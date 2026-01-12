import fs from 'fs/promises';

const PATH = './data/guilds.json';

async function ensureFile() {
  try {
    await fs.access('./data');
  } catch {
    await fs.mkdir('./data', { recursive: true });
  }
  try {
    await fs.access(PATH);
  } catch {
    await fs.writeFile(PATH, JSON.stringify({ guilds: {} }, null, 2));
  }
}

async function read() {
  await ensureFile();
  const raw = await fs.readFile(PATH, 'utf8');
  return JSON.parse(raw);
}

async function write(db) {
  await fs.writeFile(PATH, JSON.stringify(db, null, 2));
}

export const guildStore = {
  async init() {
    await ensureFile();
  },

  async getEnabledModules(guildId) {
    const db = await read();
    return db.guilds[guildId]?.enabledModules ?? [];
  },

  async isModuleEnabled(guildId, moduleId) {
    const enabled = await this.getEnabledModules(guildId);
    return enabled.includes(moduleId);
  },

  async enableModule(guildId, moduleId) {
    const db = await read();
    db.guilds[guildId] ??= { enabledModules: [] };
    const set = new Set(db.guilds[guildId].enabledModules);
    set.add(moduleId);
    db.guilds[guildId].enabledModules = [...set];
    await write(db);
  },

  async disableModule(guildId, moduleId) {
    const db = await read();
    db.guilds[guildId] ??= { enabledModules: [] };
    db.guilds[guildId].enabledModules = (db.guilds[guildId].enabledModules ?? []).filter((x) => x !== moduleId);
    await write(db);
  }
};
