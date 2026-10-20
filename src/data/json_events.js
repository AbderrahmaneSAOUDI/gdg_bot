import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORAGE_DIR = path.resolve(__dirname, '../../data');
const STORAGE_FILE = path.join(STORAGE_DIR, 'events.json');

/**
 * Initial Default Seed Data with EventX 3.0 and the 3 Teams.
 */
function getInitialSeedData() {
  return [
    {
      id: 'eventx',
      name: 'EventX 3.0',
      description: 'Internal simulation program by GDG Ghardaia where members step into a Core Team to plan a DevFest-scale event from start to finish—learning real event management through practice and developing future community leaders.',
      status: 'ACTIVE',
      coreRoleId: '1415741707420696657',
      teams: [
        {
          id: 'team_01',
          number: 1,
          name: 'Team 1',
          categoryId: '1559996031318626374',
          memberRoleId: '1559995383671685231',
          mentorRoleId: '1559995589519867916',
          channels: {
            chat: '1559996366720340079',
            resources: '1559996462488625232',
            results: '1559996572413067264',
            room: '1559996731704475699',
            mentorsChat: '1560786013821992960',
            mentorsRoom: '1560968071756128357',
          },
          mentors: [
            '1201981300127563859',
            '898562659228725269',
          ],
          members: [
            '1451171369239842946',
            '1556612740724822048',
            '1559525606851612735',
            '1475368924555251744',
            '1553989983004790871',
            '1557000941654253570',
            '1559527533936910369',
            '1064576599237865533',
            '1538987457234735196',
            '1558055798163116070',
            '1425914947400896573',
            '1559528310218694700',
            '281888053121777664',
          ],
        },
        {
          id: 'team_02',
          number: 2,
          name: 'Team 2',
          categoryId: '1559996209643651253',
          memberRoleId: '1559995509400408094',
          mentorRoleId: '1559995645119438932',
          channels: {
            chat: '1559997308932857947',
            resources: '1559997469507715212',
            results: '1559997838501478420',
            room: '1559998005699149924',
            mentorsChat: '1560786195129049158',
          },
          mentors: [
            '1442993500399472710',
          ],
          members: [
            '1337739935884513292',
            '1558434329330458758',
            '789255935377801226',
            '1558440540645761066',
            '1558963729767600241',
            '1497669917946806452',
            '1431733331409502248',
            '1057325829216022540',
            '1558570359933112481',
            '709202881747746886',
            '1447897064943128588',
          ],
        },
        {
          id: 'team_03',
          number: 3,
          name: 'Team 3',
          categoryId: '1560695112366039090',
          memberRoleId: '1560694286096277544',
          mentorRoleId: '1560694227871080479',
          channels: {
            chat: '1560696156424642581',
            resources: '1560695959640346734',
            results: '1560696676426055840',
            room: '1560696976235040829',
            mentorsChat: '1560786290700451910',
          },
          mentors: [
            '1381681602924380231',
            '1537947084370608198',
          ],
          members: [
            '1399342429961719852',
            '1396555970079101028',
            '1219858934144434258',
            '1560363858621767747',
            '785205701462196265',
            '1531461820655603867',
            '1452909727942967320',
            '1423083729542316164',
            '1446437500657602632',
            '1434621716193345597',
            '1434524555929452706',
          ],
        },
      ],
    },
  ];
}

const DEFAULT_PATH = STORAGE_FILE;
const copy = (value) => structuredClone(value);
const now = () => new Date().toISOString();

function validate(snapshot) {
  if (!snapshot || snapshot.schemaVersion !== 2 || !Array.isArray(snapshot.events)) throw new Error('Invalid event storage schema. Original file preserved.');
  const identities = new Set();
  for (const event of snapshot.events) {
    if (!event || typeof event.id !== 'string' || !event.id || typeof event.name !== 'string' || !event.name.trim() || !Array.isArray(event.teams) || !['ACTIVE', 'ARCHIVED'].includes(event.status)) throw new Error('Invalid event record. Original file preserved.');
    if (event.guildId != null && (typeof event.guildId !== 'string' || !event.guildId)) throw new Error('Invalid event guild scope.');
    const key = `${event.guildId ?? ''}:${event.id}`;
    if (identities.has(key)) throw new Error('Duplicate event identity.');
    identities.add(key);
    const numbers = new Set();
    const ids = new Set();
    for (const team of event.teams) {
      if (!team || typeof team.id !== 'string' || !team.id || !Number.isSafeInteger(team.number) || team.number < 1 || typeof team.name !== 'string' || !Array.isArray(team.members) || !Array.isArray(team.mentors) || [...team.members, ...team.mentors].some((id) => typeof id !== 'string' || !id)) throw new Error('Invalid team record. Original file preserved.');
      if (numbers.has(team.number) || ids.has(team.id)) throw new Error('Duplicate team number or identity.');
      if (team.guildId != null && team.guildId !== event.guildId) throw new Error('Team guild does not match its event.');
      if (team.eventId != null && team.eventId !== event.id) throw new Error('Team event reference does not match.');
      numbers.add(team.number); ids.add(team.id);
    }
  }
  return snapshot;
}

/** Atomic validated transactions for the supported single-process runtime. No mutable cached records. */
export function createEventsStore({ filePath = DEFAULT_PATH, initialEvents = [], fileSystem = fs } = {}) {
  const resolvedPath = path.resolve(filePath);
  let needsMigration = false;
  function read() {
    if (!fileSystem.existsSync(resolvedPath)) return validate({ schemaVersion: 2, events: copy(initialEvents) });
    let parsed;
    try { parsed = JSON.parse(fileSystem.readFileSync(resolvedPath, 'utf8')); }
    catch (cause) { throw new Error('Cannot read event storage. Original file preserved; repair it before continuing.', { cause }); }
    if (Array.isArray(parsed)) {
      needsMigration = true;
      parsed = { schemaVersion: 2, events: parsed.map((event) => ({ ...event, guildId: event.guildId ?? null })) };
    }
    return validate(parsed);
  }
  function write(snapshot) {
    validate(snapshot);
    fileSystem.mkdirSync(path.dirname(resolvedPath), { recursive: true });
    if (needsMigration && fileSystem.existsSync(resolvedPath)) {
      const backup = `${resolvedPath}.pre-v2.bak`;
      if (!fileSystem.existsSync(backup)) fileSystem.copyFileSync(resolvedPath, backup, fileSystem.constants.COPYFILE_EXCL);
    }
    const temporary = `${resolvedPath}.${randomUUID()}.tmp`;
    let descriptor;
    try {
      descriptor = fileSystem.openSync(temporary, 'wx');
      fileSystem.writeFileSync(descriptor, JSON.stringify(snapshot, null, 2) + '\n', 'utf8');
      fileSystem.fsyncSync(descriptor); fileSystem.closeSync(descriptor); descriptor = undefined;
      fileSystem.renameSync(temporary, resolvedPath);
      needsMigration = false;
    } catch (cause) {
      if (descriptor !== undefined) fileSystem.closeSync(descriptor);
      if (fileSystem.existsSync(temporary)) fileSystem.unlinkSync(temporary);
      throw new Error('Cannot save event storage; previous snapshot preserved.', { cause });
    }
  }
  function transaction(mutate) {
    const draft = copy(read());
    const result = mutate(draft);
    if (result?.then) throw new Error('Event storage transactions must be synchronous.');
    write(draft);
    return copy(result);
  }
  function select(snapshot, id, guildId) {
    return snapshot.events.find((event) => event.id === id && (guildId === undefined || event.guildId === guildId));
  }
  const store = {
    filePath: resolvedPath,
    snapshot: () => copy(read()),
    transaction,
    getAllEvents(guildId) { return copy(read().events.filter((event) => guildId === undefined || event.guildId === guildId)); },
    getEventById(id, guildId) { return copy(select(read(), id, guildId) ?? null); },
    createEvent({ id = randomUUID(), guildId = null, name, description = '', status = 'ACTIVE', ...extra }) {
      return transaction((draft) => {
        if (select(draft, id, guildId)) throw new Error('Event already exists.');
        const event = { ...extra, id, guildId, name: String(name ?? '').trim(), description, status, teams: [], createdAt: now(), updatedAt: now() };
        draft.events.push(event); return event;
      });
    },
    updateEvent(id, updates, guildId) {
      return transaction((draft) => {
        const event = select(draft, id, guildId); if (!event) return null;
        Object.assign(event, updates, { id: event.id, guildId: event.guildId, updatedAt: now() }); return event;
      });
    },
    deleteEvent(id, guildId) {
      return transaction((draft) => {
        const event = select(draft, id, guildId); if (!event) return false;
        draft.events.splice(draft.events.indexOf(event), 1); return true;
      });
    },
    addTeam(eventId, values = {}, guildId) {
      return transaction((draft) => {
        const event = select(draft, eventId, guildId); if (!event) return null;
        const number = values.number ?? Math.max(0, ...event.teams.map((team) => team.number), event.lastTeamNumber ?? 0) + 1;
        if (!Number.isSafeInteger(number) || number < 1 || event.teams.some((team) => team.number === number)) throw new Error('Team number must be a unique positive integer.');
        const team = { ...values, id: values.id ?? randomUUID(), guildId: event.guildId ?? null, eventId, number, name: values.name?.trim() || `Team ${String(number).padStart(2, '0')}`, memberRoleId: values.memberRoleId ?? null, mentorRoleId: values.mentorRoleId ?? null, textChannelId: values.textChannelId ?? null, voiceChannelId: values.voiceChannelId ?? null, members: [], mentors: [], provisioningStatus: values.provisioningStatus ?? 'READY', createdAt: now(), updatedAt: now() };
        event.lastTeamNumber = Math.max(event.lastTeamNumber ?? 0, number);
        event.teams.push(team); event.updatedAt = now(); return team;
      });
    },
    updateTeam(eventId, teamId, updates, guildId) {
      return transaction((draft) => {
        const event = select(draft, eventId, guildId);
        const team = event?.teams.find((item) => item.id === teamId); if (!team) return null;
        Object.assign(team, updates, { id: team.id, eventId, guildId: event.guildId ?? null, updatedAt: now() });
        event.lastTeamNumber = Math.max(event.lastTeamNumber ?? 0, team.number);
        event.updatedAt = team.updatedAt;
        return team;
      });
    },
    deleteTeam(eventId, teamId, guildId) {
      return transaction((draft) => {
        const event = select(draft, eventId, guildId);
        const index = event?.teams.findIndex((team) => team.id === teamId) ?? -1; if (index < 0) return null;
        return event.teams.splice(index, 1)[0];
      });
    },
    assignMembers(eventId, teamId, userIds, guildId) { return assign(eventId, teamId, userIds, guildId, 'members'); },
    assignMentors(eventId, teamId, userIds, guildId) { return assign(eventId, teamId, userIds, guildId, 'mentors'); },
    bindLegacyEvents(guildId) {
      if (!guildId) throw new Error('Explicit guild binding is required.');
      return transaction((draft) => {
        let count = 0;
        for (const event of draft.events.filter((item) => !item.guildId)) {
          event.guildId = guildId; event.updatedAt = now();
          for (const team of event.teams) { team.guildId = guildId; team.eventId = event.id; }
          count += 1;
        }
        return count;
      });
    },
  };
  function assign(eventId, teamId, userIds = [], guildId, field) {
    return transaction((draft) => {
      const team = select(draft, eventId, guildId)?.teams.find((item) => item.id === teamId); if (!team) return null;
      team[field] = [...new Set([...team[field], ...userIds])]; team.updatedAt = now(); return team;
    });
  }
  return store;
}

export const eventsStore = createEventsStore();
let activeStore = eventsStore;
/** Explicit fixture injection; refuses the production events path. */
export function setEventsStoreForTests(store) {
  if (!store?.filePath || path.resolve(store.filePath) === DEFAULT_PATH) throw new Error('Tests require a separate event storage path.');
  activeStore = store;
}
export function getAllEvents(guildId) { return activeStore.getAllEvents(guildId); }
export function getEventById(eventId, guildId) { return activeStore.getEventById(eventId, guildId); }
export function createEvent(values) { return activeStore.createEvent(values); }
export function updateEvent(id, updates, guildId) { return activeStore.updateEvent(id, updates, guildId); }
export function deleteEvent(id, guildId) { return activeStore.deleteEvent(id, guildId); }
export function addTeam(id, values, guildId) { return activeStore.addTeam(id, values, guildId); }
export function updateTeam(id, teamId, updates, guildId) { return activeStore.updateTeam(id, teamId, updates, guildId); }
export function deleteTeam(id, teamId, guildId) { return activeStore.deleteTeam(id, teamId, guildId); }
export function assignMembers(id, teamId, users, guildId) { return activeStore.assignMembers(id, teamId, users, guildId); }
export function assignMentors(id, teamId, users, guildId) { return activeStore.assignMentors(id, teamId, users, guildId); }
export function resetEventsStore(seed = getInitialSeedData()) {
  if (activeStore === eventsStore) throw new Error('Reset is only allowed with an explicitly injected test store.');
  activeStore.transaction((draft) => { draft.events = copy(seed); });
  return activeStore.getAllEvents();
}
