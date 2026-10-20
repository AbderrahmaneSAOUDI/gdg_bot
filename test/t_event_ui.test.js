import test from 'node:test';
import assert from 'node:assert/strict';
import { ComponentType } from 'discord.js';
import * as ui from '../src/ui/view_event_management.js';
import { eventId } from '../src/config/cfg_eventManagement.js';

const eventKey = '12345678-1234-4234-8234-123456789012';
const teamKey = '87654321-4321-4321-8321-210987654321';
const hostile = '**spoof** @everyone <@123456789012345678> <#123456789012345678> ';
const components = (payload) => payload.components.flatMap((row) => row.toJSON().components);
const ids = (payload) => components(payload).map((component) => component.custom_id).filter(Boolean);
const makeTeam = (index) => ({ id: `87654321-4321-4321-8321-${String(index).padStart(12, '0')}`, name: `Team ${index}`, members: [`member-${index}`], mentors: [`mentor-${index}`] });
const event = { id: eventKey, name: 'Example Event', description: 'Example competition', status: 'ACTIVE', teams: Array.from({ length: 57 }, (_, index) => makeTeam(index)) };

test('removal pickers paginate stored roster identities including departed users',()=>{
  const memberIds=Array.from({length:57},(_,n)=>`departed-${n}`),team={...event.teams[0],members:memberIds},seen=[];
  for(let page=0;page<8;page++){
    const payload=ui.getRosterPickerPayload({event,team,token:'context',type:'removeMembers',page});valid(payload);
    const picker=components(payload).find(component=>component.custom_id==='bot:em:assign:context:removeMembers');
    assert.equal(picker.type,ComponentType.StringSelect);seen.push(...picker.options.map(option=>option.value));
    assert.ok(ids(payload).some(id=>id.startsWith('bot:em:pickpage:context:removeMembers:')));
  }
  assert.deepEqual(seen,memberIds);
  const addition=ui.getRosterPickerPayload({event,team,token:'context',type:'members'});
  assert.equal(components(addition).find(c=>c.custom_id==='bot:em:assign:context:members').type,ComponentType.UserSelect);
});

function valid(payload) {
  assert.ok(payload.components.length <= 5);
  let combined = 0;
  for (const builder of payload.embeds) {
    const embed = builder.toJSON();
    assert.ok((embed.title?.length || 0) <= 256);
    assert.ok((embed.description?.length || 0) <= 4096);
    const parts = [embed.title, embed.description, embed.footer?.text];
    for (const field of embed.fields || []) {
      assert.ok(field.name.length <= 256);
      assert.ok(field.value.length <= 1024);
      parts.push(field.name, field.value);
    }
    const output = parts.filter(Boolean).join('\n');
    assert.doesNotMatch(output, /@(everyone|here)|<(@[!&]?|#)\d+>/);
    combined += output.length;
  }
  assert.ok(combined <= 6000);
  for (const row of payload.components) {
    const json = row.toJSON();
    assert.ok(json.components.length > 0 && json.components.length <= 5);
    if (json.components.some((component) => component.type !== ComponentType.Button)) assert.equal(json.components.length, 1);
    for (const component of json.components) {
      if (component.custom_id) assert.ok(component.custom_id.length <= 100);
      if (component.options) assert.ok(component.options.length > 0 && component.options.length <= 25);
    }
  }
}

test('event lists paginate every active and archived event beyond 25 with correct routing', () => {
  const events = Array.from({ length: 101 }, (_, index) => ({ ...event, id: `event-${index}`, name: `Event ${index}`, status: index < 67 ? 'ACTIVE' : 'ARCHIVED' }));
  for (const [archived, count] of [[false, 67], [true, 34]]) {
    const seen = new Set();
    for (let page = 0; page < Math.ceil(count / 8); page++) {
      const payload = ui.getManagedEventsPayload({ events, page, archived, canManage: true });
      valid(payload);
      const picker = components(payload).find((component) => component.custom_id === 'bot:em:select');
      picker.options.forEach((option) => seen.add(option.value));
      const next = components(payload).find((component) => component.label === 'Next');
      if (page < Math.ceil(count / 8) - 1) assert.equal(next.custom_id, `bot:em:list:${archived ? 'archive' : 'active'}:${page + 1}`);
    }
    assert.equal(seen.size, count);
  }
});

test('delete picker exposes every team and selection can only route to impact review', () => {
  const seen = new Set();
  for (let page = 0; page < Math.ceil(event.teams.length / 8); page++) {
    const payload = ui.getManagedDeletePickerPayload({ event, page });
    valid(payload);
    const picker = components(payload).find((component) => component.custom_id === `bot:em:deleteselect:${event.id}`);
    picker.options.forEach((option) => seen.add(option.value));
    assert.ok(!ids(payload).some((id) => id.startsWith('bot:em:confirm:')));
    assert.ok(payload.embeds[0].toJSON().description.includes('separate confirmation'));
  }
  assert.equal(seen.size, event.teams.length);
  const team = ui.getManagedTeamsPayload({ event, page: 17, canManage: true });
  assert.ok(ids(team).includes(`bot:em:deletepick:${event.id}:2`));
  assert.ok(!ids(team).some((id) => id.startsWith('bot:em:delete:')));
});

test('single-team browsing preserves page, all management controls, and five-row budget', () => {
  for (let page = 0; page < event.teams.length; page++) {
    const payload = ui.getManagedTeamsPayload({ event, page, canManage: true, channelUrl: 'https://discord.com/channels/111111111111111111/222222222222222222' });
    valid(payload);
    assert.equal(payload.components.length, 5);
    assert.ok(components(payload).some((component) => component.label === `Team ${page + 1} of ${event.teams.length}`));
    assert.ok(ids(payload).includes(`bot:em:repair:${event.id}:${event.teams[page].id}`));
    assert.ok(ids(payload).includes(`bot:em:teams:${event.id}:${page}`));
  }
  const ordinary = ui.getManagedTeamsPayload({ event });
  assert.ok(!ids(ordinary).some((id) => /bot:em:(manage|tedit|deletepick|repair|channels|voice|tadd):/.test(id)));
  const archived = ui.getManagedTeamsPayload({ event: { ...event, status: 'ARCHIVED' }, canManage: true });
  assert.ok(!ids(archived).some((id) => /bot:em:(manage|tedit|repair|channels|voice|tadd):/.test(id)));
  assert.ok(ids(archived).some((id) => id.startsWith('bot:em:deletepick:')));
  assert.ok(!components(ui.getManagedTeamsPayload({ event, channelUrl: 'https://unsafe.example/' })).some((component) => component.url));
});

test('rosters and mentors paginate all assignments beyond 25', () => {
  const team = { id: teamKey, name: 'Large Team', members: Array.from({ length: 53 }, (_, index) => `member-${index}`), mentors: Array.from({ length: 24 }, (_, index) => `mentor-${index}`) };
  const big = { ...event, teams: [team] };
  const pages = [];
  for (let page = 0; page < Math.ceil(77 / 8); page++) {
    const payload = ui.getManagedRosterPayload({ event: big, team, page });
    valid(payload);
    pages.push(payload.embeds[0].toJSON().description);
  }
  for (const id of [...team.members, ...team.mentors]) assert.ok(pages.some((page) => page.includes(id)));
  const mentorPages = [];
  for (let page = 0; page < Math.ceil(event.teams.length / 8); page++) {
    const payload = ui.getManagedMentorsPayload({ event, page });
    valid(payload);
    mentorPages.push(payload.embeds[0].toJSON().description);
  }
  for (const item of event.teams) assert.ok(mentorPages.some((page) => page.includes(item.name)));
});

test('malicious names and large confirmation content remain bounded without mentions', () => {
  const badTeam = { ...event.teams[0], name: hostile.repeat(100) };
  const badEvent = { ...event, name: hostile.repeat(100), description: hostile.repeat(100), teams: [badTeam] };
  [
    ui.getManagedEventPayload({ event: badEvent, canManage: true }),
    ui.getManagedTeamsPayload({ event: badEvent, canManage: true }),
    ui.getManagedDeletePickerPayload({ event: badEvent }),
    ui.getManagedRosterPayload({ event: badEvent, team: badTeam, names: { 'member-0': hostile } }),
    ui.getManagedRosterPayload({ event: badEvent, team: badTeam, manage: true, token: eventKey }),
    ui.getManagedMentorsPayload({ event: badEvent, names: { 'mentor-0': hostile } }),
    ui.getRosterPickerPayload({ event: badEvent, team: badTeam, type: 'members', token: eventKey }),
    ui.getEventConfirmationPayload({ title: hostile.repeat(100), description: hostile.repeat(100), token: eventKey, fields: Array.from({ length: 25 }, () => ({ name: hostile, value: hostile.repeat(100) })) }),
    ui.getEventNoticePayload({ message: hostile.repeat(100), eventId: eventKey, teamId: teamKey }),
  ].forEach(valid);
  const modal = ui.createManagedEventModal({ event: badEvent }).toJSON();
  assert.equal(modal.components.length, 2);
  assert.ok(modal.components[0].components[0].value.length <= 50);
  assert.ok(modal.components[1].components[0].value.length <= 500);
  const teamModal = ui.createManagedTeamModal({ event: badEvent, team: badTeam }).toJSON();
  assert.ok(teamModal.components[0].components[0].value.length <= 30);
});

test('empty/stale event screens retain a working navigation path; IDs reject invalid limits', () => {
  [ui.getManagedEventsPayload(), ui.getManagedEventPayload(), ui.getManagedTeamsPayload(), ui.getManagedDeletePickerPayload(), ui.getManagedRosterPayload(), ui.getManagedMentorsPayload(), ui.getRosterPickerPayload()].forEach((payload) => {
    valid(payload);
    assert.ok(ids(payload).includes('bot:em:home'));
  });
  assert.throws(() => eventId('view', 'bad:identifier'), /Invalid/);
  assert.throws(() => eventId('view', 'a'.repeat(100)), /limits/);
});
