import {
  getAllEvents as dbGetAllEvents,
  getEventById as dbGetEventById,
  createEvent as dbCreateEvent,
  deleteEvent as dbDeleteEvent,
} from '../data/json_events.js';

export function listEvents() {
  return dbGetAllEvents();
}

export function getEvent(eventId) {
  return dbGetEventById(eventId);
}

export function registerEvent({ name, description, status }) {
  return dbCreateEvent({ name, description, status });
}

export function removeEvent(eventId) {
  return dbDeleteEvent(eventId);
}
