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
      description: 'Annual flagship hackathon & developer competition with categorized team tracks and dedicated mentorship.',
      status: 'ACTIVE',
      teams: [
        {
          id: 'team_01',
          number: 1,
          name: 'Team 01',
          category: 'Web & Mobile',
          memberRoleId: null,
          mentorRoleId: null,
          members: [],
          mentors: [],
        },
        {
          id: 'team_02',
          number: 2,
          name: 'Team 02',
          category: 'AI / ML',
          memberRoleId: null,
          mentorRoleId: null,
          members: [],
          mentors: [],
        },
        {
          id: 'team_03',
          number: 3,
          name: 'Team 03',
          category: 'Cloud & Infrastructure',
          memberRoleId: null,
          mentorRoleId: null,
          members: [],
          mentors: [],
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
export function addTeam(eventId, { name, number, category, memberRoleId, mentorRoleId }) {
  const event = getEventById(eventId);
  if (!event) return null;

  const nextNumber = number || (event.teams.length > 0 ? Math.max(...event.teams.map((t) => t.number || 0)) + 1 : 1);
  const formattedName = name || `Team ${String(nextNumber).padStart(2, '0')}`;
  const teamId = `team_${String(nextNumber).padStart(2, '0')}_${Date.now()}`;

  const newTeam = {
    id: teamId,
    number: nextNumber,
    name: formattedName,
    category: category || 'General',
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
