import { modModule } from './mod/mod.js';
import { ticketsModule } from './tickets/tickets.js';
import { securityModule } from './security/security.js';

export async function loadModules(client) {
  const modules = [modModule, ticketsModule, securityModule];

  for (const m of modules) {
    client.modules.set(m.id, m);
    if (typeof m.onLoad === 'function') await m.onLoad(client);
  }

  return modules.map((m) => m.id);
}
