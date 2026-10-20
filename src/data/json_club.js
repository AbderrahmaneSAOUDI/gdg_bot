import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { getAllTeams } from '../config/cfg_teams.js';

export const CLUB_SCHEMA_VERSION = 1;
const defaultPath = fileURLToPath(new URL('../../data/club.json', import.meta.url));
const clone = (value) => structuredClone(value);
const departments = new Set(getAllTeams().map(({ key }) => key));
const requiredId = (value) => typeof value === 'string' && value.length > 0 && value.length <= 100;
const validTime = (value) => typeof value === 'string' && !Number.isNaN(Date.parse(value));
export const emptyClubData = () => ({ schemaVersion: CLUB_SCHEMA_VERSION, members: [], requests: [], guilds: [], audit: [], operations: [] });

export function validateClubData(data) {
  if (!data || data.schemaVersion !== CLUB_SCHEMA_VERSION) throw new Error('Unsupported club storage schema. Restore a supported backup or migrate explicitly.');
  for (const key of ['members', 'requests', 'guilds', 'audit', 'operations']) {
    if (!Array.isArray(data[key])) throw new Error(`Invalid club storage collection: ${key}`);
    const ids = new Set();
    for (const item of data[key]) {
      if (!item || !requiredId(item.guildId)) throw new Error(`Invalid guild scope in ${key}`);
      const id = key === 'members' ? item.userId : key === 'guilds' ? item.guildId : item.id;
      if (!requiredId(id) || ids.has(`${item.guildId}:${id}`)) throw new Error(`Invalid or duplicate identity in ${key}`);
      ids.add(`${item.guildId}:${id}`);
      if (key === 'members') {
        if (!['ACTIVE', 'ARCHIVED'].includes(item.status) || !(item.departmentKey === null || departments.has(item.departmentKey)) || typeof item.displayName !== 'string' || !validTime(item.createdAt) || !validTime(item.updatedAt)) throw new Error('Invalid club member record');
      }
      if (key === 'requests') {
        if (!requiredId(item.userId) || !['JOIN', 'TRANSFER'].includes(item.type) || !departments.has(item.departmentKey) || !['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'].includes(item.status) || !validTime(item.createdAt)) throw new Error('Invalid department request');
        if (item.status !== 'PENDING' && (!validTime(item.resolvedAt) || !requiredId(item.resolvedBy))) throw new Error('Invalid request resolution');
        if (!(item.currentDepartmentKey == null || departments.has(item.currentDepartmentKey))) throw new Error('Invalid request source department');
      }
      if (key === 'guilds') {
        for (const mapping of ['trustedRoleIds', 'departmentRoleIds']) {
          if (!item[mapping] || Array.isArray(item[mapping]) || typeof item[mapping] !== 'object' || Object.values(item[mapping]).some((value) => !requiredId(value))) throw new Error(`Invalid ${mapping}`);
        }
        if (Object.keys(item.departmentRoleIds).some((departmentKey) => !departments.has(departmentKey))) throw new Error('Invalid department role binding');
        const roleIds = [...Object.values(item.trustedRoleIds), ...Object.values(item.departmentRoleIds)];
        if (new Set(roleIds).size !== roleIds.length) throw new Error('Ambiguous guild role bindings');
      }
      if (key === 'audit') {
        if (!requiredId(item.actorId) || !requiredId(item.action) || !validTime(item.timestamp) || !['SUCCESS', 'FAILURE', 'PARTIAL'].includes(item.outcome)) throw new Error('Invalid club audit entry');
      }
      if (key === 'operations') {
        if (!requiredId(item.actorId) || !requiredId(item.userId) || !requiredId(item.action) || !validTime(item.createdAt) || !['PREPARED', 'COMPLETED', 'ROLLED_BACK', 'REPAIR_REQUIRED', 'REPAIRED'].includes(item.status)) throw new Error('Invalid club operation journal');
      }
    }
  }
  const pending = new Set();
  for (const request of data.requests.filter((item) => item.status === 'PENDING')) {
    const key = `${request.guildId}:${request.userId}`;
    if (pending.has(key)) throw new Error('Duplicate pending department request');
    pending.add(key);
  }
  return data;
}

/** Single-process serialized transactions. Reads and returned values never expose cached objects. */
export function createClubStore(storagePath = defaultPath, { fileSystem = fs } = {}) {
  const target = path.resolve(storagePath);
  let cache;
  let needsMigration = false;
  let migrationBackupCreated = false;
  let queue = Promise.resolve();
  function write(data) {
    validateClubData(data);
    fileSystem.mkdirSync(path.dirname(target), { recursive: true });
    const temporary = `${target}.${randomUUID()}.tmp`;
    let fd;
    try {
      fd = fileSystem.openSync(temporary, 'wx');
      fileSystem.writeFileSync(fd, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
      fileSystem.fsyncSync(fd);
      fileSystem.closeSync(fd);
      fd = undefined;
      if (needsMigration && !migrationBackupCreated && fileSystem.existsSync(target)) {
        fileSystem.copyFileSync(target, `${target}.v0.${randomUUID()}.bak`, fs.constants.COPYFILE_EXCL);
        migrationBackupCreated = true;
      }
      fileSystem.renameSync(temporary, target);
      needsMigration = false;
    } finally {
      if (fd !== undefined) fileSystem.closeSync(fd);
      if (fileSystem.existsSync(temporary)) fileSystem.unlinkSync(temporary);
    }
  }
  function read() {
    if (cache) return cache;
    if (!fileSystem.existsSync(target)) return (cache = emptyClubData());
    let data;
    try { data = JSON.parse(fileSystem.readFileSync(target, 'utf8')); }
    catch (error) { throw new Error('Club storage cannot be read. Original file preserved.', { cause: error }); }
    // The only legacy format is the same explicit collections without a version.
    if (data.schemaVersion === undefined && ['members', 'requests', 'guilds', 'audit', 'operations'].every((key) => Array.isArray(data[key]))) {
      data.schemaVersion = CLUB_SCHEMA_VERSION;
      validateClubData(data);
      needsMigration = true;
    }
    return (cache = validateClubData(data));
  }
  return {
    storagePath: target,
    snapshot() { return clone(read()); },
    transaction(fn) {
      const run = queue.then(async () => {
        const draft = clone(read());
        const originalOperationIds = new Set(draft.operations.map((item) => item.id));
        let rollback;
        const tx = {
          // Persist a recovery journal before starting external effects.
          checkpoint() { write(draft); cache = clone(draft); },
          onRollback(callback) { rollback = callback; },
        };
        try {
          const result = await fn(draft, tx);
          write(draft);
          cache = clone(draft);
          return clone(result);
        } catch (error) {
          if (rollback) {
            let compensated = false;
            try { compensated = await rollback(); } catch { /* journal remains repairable */ }
            const recovery = clone(cache);
            for (const op of recovery.operations.filter((item) => !originalOperationIds.has(item.id) && item.status === 'PREPARED')) {
              op.status = compensated ? 'ROLLED_BACK' : 'REPAIR_REQUIRED';
              op.updatedAt = new Date().toISOString();
            }
            try { write(recovery); cache = recovery; } catch { /* PREPARED remains durable */ }
          }
          throw error;
        }
      });
      queue = run.catch(() => {});
      return run;
    },
  };
}

export const clubStore = createClubStore();
export default clubStore;
