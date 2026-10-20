import { createPrimaryButton, createSecondaryButton, createDangerButton, createLinkButton } from './components/c_buttons.js';
import { createActionRows } from './components/c_actionRows.js';
import { createOptionSelectMenu, createMemberSelectMenu } from './components/c_selectMenus.js';
import { createConfirmationActionRow } from './components/c_confirmation.js';
import { createModal, createShortTextInput, createLongTextInput } from './components/c_modals.js';
import { GOOGLE_COLORS } from '../config/cfg_colors.js';
import { EVENT_CONTROLS as L, eventId as id } from '../config/cfg_eventManagement.js';
import { EVENT_MANAGEMENT_MESSAGES as M } from '../messages/msg_eventManagement.js';
import { clubText as text, clubPage as pageOf, clubPayload } from './components/c_club.js';

const button = (key, action, ...params) => createSecondaryButton({ label: L[key], customId: id(action, ...params) });
const primary = (key, action, ...params) => createPrimaryButton({ label: L[key], customId: id(action, ...params) });
const nav = (action, ...params) => createActionRows(button('home', 'home'), button('refresh', action, ...params), button('close', 'close'));
const payload = (title, description, components = [], fields = []) => clubPayload({ title, description: description || M.empty, fields, components });
const missing = () => payload(L.events, M.missing, nav('list', 'active', 0));
const teamIndex = (event, team) => Math.max(0, event.teams.findIndex((item) => item.id === team.id));

function pager(page, pages, action, ...params) {
  return createActionRows(
    createSecondaryButton({ label: L.previous, customId: id(action, ...params, Math.max(0, page - 1)), disabled: page === 0 }),
    createSecondaryButton({ label: action === 'teams' ? M.teamIndicator(page, pages) : M.pageIndicator(page, pages), customId: id('noop'), disabled: true }),
    createSecondaryButton({ label: L.next, customId: id(action, ...params, Math.min(pages - 1, page + 1)), disabled: page + 1 >= pages }),
  );
}

export function getManagedEventsPayload({ events = [], page = 0, archived = false, canManage = false } = {}) {
  const current = pageOf(events.filter((event) => archived ? event.status === 'ARCHIVED' : event.status !== 'ARCHIVED'), page, 8);
  const mode = archived ? 'archive' : 'active';
  const rows = [];
  if (current.items.length) rows.push(...createActionRows(createOptionSelectMenu({ customId: id('select'), options: current.items.map((event) => ({ label: text(event.name, 100), value: event.id })) })));
  rows.push(...pager(current.page, current.pages, 'list', mode));
  rows.push(...createActionRows(button(archived ? 'active' : 'archived', 'list', archived ? 'active' : 'archive', 0), canManage && primary('add', 'add')), ...nav('list', mode, current.page));
  return payload(archived ? L.archived : L.events, `${M.events}\n\n${current.items.length ? current.items.map((event) => M.line(text(event.name, 100))).join('\n') : M.empty}`, rows);
}

export function getManagedEventPayload({ event, canManage = false } = {}) {
  if (!event) return missing();
  const rows = createActionRows(primary('teams', 'teams', event.id, 0), button('mentors', 'mentors', event.id, 0),
    canManage && event.status !== 'ARCHIVED' && primary('edit', 'edit', event.id),
    canManage && event.status !== 'ARCHIVED' && button('archive', 'archive', event.id),
    button('back', 'list', event.status === 'ARCHIVED' ? 'archive' : 'active', 0));
  return payload(event.name, `${text(event.description, 2000)}\n\n${event.status === 'ARCHIVED' ? M.archived : ''}`, [...rows, ...nav('detail', event.id)], [{ name: L.teams, value: String(event.teams.length), inline: true }]);
}

export function getManagedTeamsPayload({ event, page = 0, canManage = false, channelUrl } = {}) {
  if (!event) return missing();
  const current = pageOf(event.teams, page, 1), team = current.items[0];
  const rows = [...pager(current.page, current.pages, 'teams', event.id)];
  if (team) {
    const mutable = canManage && event.status !== 'ARCHIVED';
    rows.push(...createActionRows(button('browse', 'roster', event.id, team.id, 0),
      mutable && button('roster', 'manage', event.id, team.id), mutable && button('editTeam', 'tedit', event.id, team.id),
      canManage && createDangerButton({ label: L.delete, customId: id('deletepick', event.id, Math.floor(current.page / 8)) }),
      mutable && button('repair', 'repair', event.id, team.id)));
    if (mutable) rows.push(...createActionRows(button('channels', 'channels', event.id, team.id), button('voice', 'voice', event.id, team.id)));
    if (channelUrl && /^https:\/\/discord\.com\/channels\/\d+\/\d+$/.test(channelUrl)) rows.push(...createActionRows(createLinkButton({ label: L.open, url: channelUrl })));
  }
  rows.push(...createActionRows(canManage && event.status !== 'ARCHIVED' && primary('addTeam', 'tadd', event.id), button('back', 'detail', event.id), button('home', 'home'), button('refresh', 'teams', event.id, current.page), button('close', 'close')));
  const summary = team ? `${M.teamSummary(text(team.name, 100), team.members.length, team.mentors.length)}\n\n${M.channels}` : M.empty;
  return payload(M.detailTitle(event.name, team?.name || L.teams), summary, rows);
}

/** Choosing a team only opens impact review. No deletion occurs from this menu. */
export function getManagedDeletePickerPayload({ event, page = 0, selectedTeamId } = {}) {
  if (!event) return missing();
  const current = pageOf(event.teams, page, 8);
  const rows = [];
  if (current.items.length) rows.push(...createActionRows(createOptionSelectMenu({ customId: id('deleteselect', event.id), placeholder: L.teamPicker,
    options: current.items.map((team) => ({ label: text(team.name, 100), value: team.id, description: M.rosterCounts(team.members.length, team.mentors.length), default: team.id === selectedTeamId })),
  })));
  rows.push(...pager(current.page, current.pages, 'deletepick', event.id), ...createActionRows(button('back', 'teams', event.id, current.page * 8)), ...nav('deletepick', event.id, current.page));
  return payload(M.detailTitle(event.name, L.deletePicker), `${M.deletePicker}\n\n${current.items.length ? current.items.map((team) => M.line(text(team.name, 100))).join('\n') : M.empty}`, rows);
}

export function getManagedRosterPayload({ event, team, page = 0, names = {}, manage = false, token } = {}) {
  if (!event || !team) return missing();
  if (manage) return payload(M.detailTitle(event.name, team.name), M.roster, [
    ...createActionRows(primary('members', 'pick', token, 'members'), primary('assignMentors', 'pick', token, 'mentors'), button('removeMembers', 'pick', token, 'removeMembers'), button('removeMentors', 'pick', token, 'removeMentors')),
    ...createActionRows(button('back', 'teams', event.id, teamIndex(event, team))), ...nav('manage', event.id, team.id),
  ]);
  const all = [...team.members.map((userId) => ({ userId, type: L.member })), ...team.mentors.map((userId) => ({ userId, type: L.mentor }))];
  const current = pageOf(all, page, 8);
  return payload(M.detailTitle(team.name, L.rosterTitle), current.items.map((record) => M.rosterLine(text(names[record.userId] || record.userId, 100), record.type)).join('\n'), [
    ...pager(current.page, current.pages, 'roster', event.id, team.id), ...createActionRows(button('back', 'teams', event.id, teamIndex(event, team))), ...nav('roster', event.id, team.id, current.page),
  ]);
}

export function getManagedMentorsPayload({ event, page = 0, names = {} } = {}) {
  if (!event) return missing();
  const all = event.teams.flatMap((team) => team.mentors.map((userId) => ({ userId, team: team.name })));
  const current = pageOf(all, page, 8);
  return payload(M.detailTitle(event.name, L.mentors), current.items.map((record) => M.mentorLine(text(names[record.userId] || record.userId, 100), text(record.team, 60))).join('\n'), [
    ...pager(current.page, current.pages, 'mentors', event.id), ...createActionRows(button('back', 'detail', event.id)), ...nav('mentors', event.id, current.page),
  ]);
}

export function getRosterPickerPayload({ event, team, token, type, page=0, names={} } = {}) {
  if (!event || !team) return missing();
  if(['removeMembers','removeMentors'].includes(type)) {
    const field=type==='removeMembers'?'members':'mentors',current=pageOf([...new Set(team[field])],page,8);
    const rows=[];
    if(current.items.length)rows.push(...createActionRows(createOptionSelectMenu({customId:id('assign',token,type),placeholder:L[type],maxValues:current.items.length,options:current.items.map(userId=>({label:text(names[userId]||userId,100),value:userId,description:M.storedIdentity(userId)}))})));
    rows.push(...pager(current.page,current.pages,'pickpage',token,type),...createActionRows(button('back','manage',event.id,team.id)),...nav('pickpage',token,type,current.page));
    return payload(M.detailTitle(team.name,L[type]),M.removeStored,rows);
  }
  return payload(M.detailTitle(team.name, L[type] || L.roster), M.roster, [...createActionRows(createMemberSelectMenu({ customId: id('assign', token, type), maxValues: 25 })), ...createActionRows(button('back', 'manage', event.id, team.id)), ...nav('manage', event.id, team.id)]);
}

export function getEventConfirmationPayload({ title, description, token, fields = [] } = {}) {
  return clubPayload({ title, description: text(description, 2800), fields: fields.map((field) => ({ ...field, value: text(field.value, 1000) })), color: GOOGLE_COLORS.RED,
    components: [createConfirmationActionRow({ confirmCustomId: id('confirm', token), cancelCustomId: id('cancel', token), isDestructive: true })],
  });
}

export function getEventNoticePayload({ message, eventId, teamId } = {}) {
  const action=teamId?'focus':eventId?'detail':'list';
  const params=teamId?[eventId,teamId]:eventId?[eventId]:['active',0];
  return payload(L.events,text(message,2800),[...createActionRows(button('back',action,...params)),...nav(action,...params)]);
}

export function createManagedEventModal({ event } = {}) {
  return createModal({ customId: id(event ? 'editsave' : 'addsave', event?.id), title: event ? L.edit : L.add, inputs: [
    createShortTextInput({ customId: L.nameField, label: L.eventName, value: event?.name?.slice(0, 50), maxLength: 50, minLength: 3 }),
    createLongTextInput({ customId: L.descriptionField, label: L.description, value: event?.description?.slice(0, 500), maxLength: 500, required: false }),
  ] });
}

export function createManagedTeamModal({ event, team } = {}) {
  return createModal({ customId: id(team ? 'teditsave' : 'taddsave', event.id, team?.id), title: team ? L.editTeam : L.addTeam,
    inputs: [createShortTextInput({ customId: L.nameField, label: L.teamName, value: team?.name?.slice(0, 30), maxLength: 30, minLength: 2 })],
  });
}
