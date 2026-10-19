import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

// In-memory cache synced with disk
let cachedEvents = null;

function ensureStorageDir() {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
}

/**
 * Reads events from disk or initializes seed data.
 */
export function getAllEvents() {
  if (cachedEvents) return cachedEvents;

  try {
    ensureStorageDir();
    if (fs.existsSync(STORAGE_FILE)) {
      const data = fs.readFileSync(STORAGE_FILE, 'utf8');
      cachedEvents = JSON.parse(data);
    } else {
      cachedEvents = getInitialSeedData();
      saveEventsToDisk(cachedEvents);
    }
  } catch (error) {
    console.error('[DATA] Failed to read events storage, using memory seed:', error);
    cachedEvents = getInitialSeedData();
  }

  return cachedEvents;
}

/**
 * Persists events to disk.
 */
function saveEventsToDisk(events) {
  try {
    ensureStorageDir();
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(events, null, 2), 'utf8');
  } catch (error) {
    console.error('[DATA] Failed to write events storage to disk:', error);
  }
}

/**
 * Retrieves a single event by ID.
 */
export function getEventById(eventId) {
  const events = getAllEvents();
  return events.find((e) => e.id === eventId) || null;
}

/**
 * Creates a new event.
 */
export function createEvent({ id, name, description, status = 'ACTIVE' }) {
  const events = getAllEvents();
  const eventId = id || `event_${Date.now()}`;

  const newEvent = {
    id: eventId,
    name,
    description: description || '',
    status,
    teams: [],
  };

  events.push(newEvent);
  saveEventsToDisk(events);
  return newEvent;
}

/**
 * Updates an event's top-level properties.
 */
export function updateEvent(eventId, updates) {
  const events = getAllEvents();
  const index = events.findIndex((e) => e.id === eventId);
  if (index === -1) return null;

  events[index] = { ...events[index], ...updates };
  saveEventsToDisk(events);
  return events[index];
}

/**
 * Deletes an event.
 */
export function deleteEvent(eventId) {
  let events = getAllEvents();
  const initialLength = events.length;
  events = events.filter((e) => e.id !== eventId);
  if (events.length !== initialLength) {
    cachedEvents = events;
    saveEventsToDisk(events);
    return true;
  }
  return false;
}

/**
 * Adds a team to an event.
 */
export function addTeam(eventId, { name, number, memberRoleId, mentorRoleId }) {
  const event = getEventById(eventId);
  if (!event) return null;

  const nextNumber = number || (event.teams.length > 0 ? Math.max(...event.teams.map((t) => t.number || 0)) + 1 : 1);
  const formattedName = name || `Team ${String(nextNumber).padStart(2, '0')}`;
  const teamId = `team_${String(nextNumber).padStart(2, '0')}_${Date.now()}`;

  const newTeam = {
    id: teamId,
    number: nextNumber,
    name: formattedName,
    memberRoleId: memberRoleId || null,
    mentorRoleId: mentorRoleId || null,
    members: [],
    mentors: [],
  };

  event.teams.push(newTeam);
  saveEventsToDisk(cachedEvents);
  return newTeam;
}

/**
 * Updates a team within an event.
 */
export function updateTeam(eventId, teamId, updates) {
  const event = getEventById(eventId);
  if (!event) return null;

  const team = event.teams.find((t) => t.id === teamId);
  if (!team) return null;

  Object.assign(team, updates);
  saveEventsToDisk(cachedEvents);
  return team;
}

/**
 * Deletes a team from an event.
 */
export function deleteTeam(eventId, teamId) {
  const event = getEventById(eventId);
  if (!event) return null;

  const initialLength = event.teams.length;
  const deletedTeam = event.teams.find((t) => t.id === teamId);
  event.teams = event.teams.filter((t) => t.id !== teamId);

  if (event.teams.length !== initialLength) {
    saveEventsToDisk(cachedEvents);
    return deletedTeam;
  }
  return null;
}

/**
 * Assigns one or more members to a team.
 */
export function assignMembers(eventId, teamId, userIds = []) {
  const event = getEventById(eventId);
  if (!event) return null;

  const team = event.teams.find((t) => t.id === teamId);
  if (!team) return null;

  for (const uid of userIds) {
    if (!team.members.includes(uid)) {
      team.members.push(uid);
    }
  }

  saveEventsToDisk(cachedEvents);
  return team;
}

/**
 * Assigns one or more mentors to a team.
 */
export function assignMentors(eventId, teamId, userIds = []) {
  const event = getEventById(eventId);
  if (!event) return null;

  const team = event.teams.find((t) => t.id === teamId);
  if (!team) return null;

  for (const uid of userIds) {
    if (!team.mentors.includes(uid)) {
      team.mentors.push(uid);
    }
  }

  saveEventsToDisk(cachedEvents);
  return team;
}

/**
 * Resets storage to seed state (useful in automated tests).
 */
export function resetEventsStore(seed = getInitialSeedData()) {
  cachedEvents = JSON.parse(JSON.stringify(seed));
  saveEventsToDisk(cachedEvents);
  return cachedEvents;
}
