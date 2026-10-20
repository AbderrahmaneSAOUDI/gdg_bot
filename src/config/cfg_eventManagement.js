import { buildCustomId } from './cfg_customIds.js';
export function eventId(action, ...params) {
  const parts = [action, ...params.filter((value) => value !== undefined && value !== null)].map(String);
  if (parts.some((part) => !part || part.includes(':'))) throw new Error('Invalid event component identifier');
  const customId = buildCustomId('em', ...parts);
  if (customId.length > 100) throw new Error('Event component identifier exceeds Discord limits');
  return customId;
}
export const EVENT_CONTROLS = Object.freeze({
  events: 'Events', archived: 'Archived Events', active: 'Active Events', add: 'Add Event', edit: 'Edit',
  archive: 'Archive Event', teams: 'Teams', mentors: 'Mentors', addTeam: 'Add Team', editTeam: 'Edit Team',
  roster: 'Manage Roster', browse: 'View Roster', members: 'Add Members', assignMentors: 'Assign Mentors',
  removeMembers: 'Remove Members', removeMentors: 'Remove Mentors', channels: 'Create Text Channel',
  voice: 'Create Text + Voice', open: 'Open Channel', delete: 'Delete Team', confirm: 'Confirm', cancel: 'Cancel',
  previous: 'Previous', next: 'Next', back: 'Back', home: 'Home', refresh: 'Refresh', close: 'Close',
  eventName: 'Event / Competition Name', description: 'Description', teamName: 'Team Name',
  repair: 'Repair Team', deletePicker: 'Choose a Team to Delete', teamPicker: 'Choose the exact team for impact review',
  rosterTitle: 'Roster', member: 'Member', mentor: 'Mentor',
  eventTeam: 'Event / Team', people: 'People', rolesChannels: 'Roles and Channels',
  nameField: 'name', descriptionField: 'description',
});
