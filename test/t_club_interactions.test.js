import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { MessageFlags, PermissionFlagsBits } from 'discord.js';
import { createClubStore } from '../src/data/json_club.js';
import { createClubServices } from '../src/features/srv_club.js';
import { createEventsStore, setEventsStoreForTests } from '../src/data/json_events.js';
import { createInteractionHandler } from '../src/events/evt_interactionCreate.js';
import { createSessionStore } from '../src/features/srv_sessions.js';
import { createConfirmationStore } from '../src/features/srv_confirmations.js';
import { handleClubInteraction } from '../src/features/srv_clubInteractions.js';
import { handleEventInteraction } from '../src/features/srv_eventInteractions.js';
import { getManagedEventsPayload, getManagedTeamsPayload, getManagedMentorsPayload, getManagedRosterPayload } from '../src/ui/view_event_management.js';
import { execute as botCommand } from '../src/commands/general/cmd_bot.js';

function fixture(t) {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gdg-interactions-'));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const eventStore=createEventsStore({filePath:path.join(dir,'events.json')});
  setEventsStoreForTests(eventStore);
  const store=createClubStore(path.join(dir,'club.json')),roleCache=new Map(),memberCache=new Map();
  const guild={id:'100000000000000001',name:'Test Guild',roles:{cache:roleCache,fetch:async(id)=>id?roleCache.get(id)||null:roleCache},channels:{cache:new Map(),fetch:async()=>null},members:{cache:memberCache,fetch:async(query)=>{const id=typeof query==='string'?query:query.user;if(!memberCache.has(id))throw new Error('Unknown Member');return memberCache.get(id);}}};
  const member=(id,admin=false)=>{
    const roles=new Map(),actor={id,guild,displayName:`Member ${id}`,user:{id,username:'Test User',bot:false,displayAvatarURL:()=>undefined},permissions:{has:(bit)=>admin&&[PermissionFlagsBits.Administrator,PermissionFlagsBits.ManageGuild].includes(bit)},roles:{cache:roles,add:async(id)=>roles.set(id,roleCache.get(id)),remove:async(id)=>roles.delete(id)}};
    memberCache.set(id,actor);return actor;
  };
  const user=member('100000000000000002'),admin=member('100000000000000003',true);
  guild.members.me={id:'100000000000000004',permissions:{has:()=>true},roles:{highest:{position:100}}};
  roleCache.set('100000000000000005',{id:'100000000000000005',name:'Dev Department',editable:true,position:1});
  const services=createClubServices({store,eventStore});
  const sessions=createSessionStore(),previews=createConfirmationStore();
  const dispatch=createInteractionHandler({services,clubHandler:(i,p)=>handleClubInteraction(i,p,{services,sessions,previews}),eventHandler:(i,p)=>handleEventInteraction(i,p,{club:services,sessions,previews})});
  const interaction=(customId,{actor=user,publicMessage=false,kind='button',values=[],fields={}}={})=>{
    const calls=[];
    const i={customId,user:actor.user,member:actor,guild,values,fields:{getTextInputValue:(key)=>fields[key]||''},message:{flags:{has:()=>!publicMessage}},isChatInputCommand:()=>false,isModalSubmit:()=>kind==='modal',isButton:()=>kind==='button',isStringSelectMenu:()=>kind==='select',isUserSelectMenu:()=>kind==='users',
      async deferReply(p){calls.push(['deferReply',p]);this.deferred=true;},async deferUpdate(){calls.push(['deferUpdate']);this.deferred=true;},async reply(p){calls.push(['reply',p]);this.replied=true;},async update(p){calls.push(['update',p]);this.replied=true;},async editReply(p){calls.push(['editReply',p]);this.payload=p;},async showModal(m){calls.push(['showModal',m.toJSON()]);this.replied=true;}};
    return {i,calls};
  };
  return {services,store,eventStore,guild,user,admin,member,dispatch,interaction};
}
const serialized=(payload)=>JSON.stringify(payload,(key,value)=>value?.toJSON?.()||value);
const buttons=(payload)=>payload.components.flatMap(row=>row.toJSON().components);

test('a public persistent hub click creates a private profile session and evaluates the clicker',async(t)=>{
  const f=fixture(t),{i,calls}=f.interaction('bot:hub:profile',{publicMessage:true});
  await f.dispatch(i);
  assert.equal(calls[0][0],'deferReply');assert.equal(calls[0][1].flags,MessageFlags.Ephemeral);
  assert.equal(calls.some(([method])=>method==='update'||method==='deferUpdate'),false);
  assert.match(serialized(i.payload),/Stored Club Membership|club record/i);
  assert.equal(serialized(i.payload).includes('Approval Center'),false);
});

test('hub controls use current capabilities and private navigation updates only private messages',async(t)=>{
  const f=fixture(t);
  const regular=f.interaction('bot:hub:main');await f.dispatch(regular.i);
  const manager=f.interaction('bot:hub:main',{actor:f.admin});await f.dispatch(manager.i);
  const labels=buttons(regular.i.payload).map(b=>b.label);
  assert.deepEqual(labels.slice(0,5),['Events','Members','Departments','Knowledge','My Profile']);
  assert.equal(labels.includes('Approval Center'),false);
  assert.equal(buttons(manager.i.payload).some(b=>b.label==='Approval Center'),true);
  assert.equal(regular.calls[0][0],'deferUpdate');
});

test('unauthorized buttons, native selectors, and modal submissions cannot mutate club or events',async(t)=>{
  const f=fixture(t),before=f.store.snapshot();
  for(const [customId,kind,values] of [
    ['bot:club:member_register','button',[]],['bot:club:member_register_user','users',[f.admin.id]],
    ['bot:club:member_confirm:100000000000000003:DEV:ACTIVE','button',[]],
    ['bot:club:role_bind_confirm:trustedRoleIds:PRESIDENT:100000000000000005','button',[]],
    ['bot:em:addsave','modal',[]],['bot:em:assign:guessed:members','users',[f.admin.id]],
  ]){
    const {i}=f.interaction(customId,{kind,values,fields:{name:'Unauthorized'}});await f.dispatch(i);
    assert.match(serialized(i.payload),/current roles|action failed|expired/i);
  }
  assert.deepEqual(f.store.snapshot(),before);assert.equal(f.eventStore.getAllEvents().length,0);
});

test('request department supports choose then submit, duplicates, own history and cancellation',async(t)=>{
  const f=fixture(t);
  const choose=f.interaction('bot:club:request_choose',{kind:'select',values:['DEV']});await f.dispatch(choose.i);
  assert.equal(buttons(choose.i.payload).some(b=>b.custom_id==='bot:club:request_submit:DEV'),true);
  const submit=f.interaction('bot:club:request_submit:DEV');await f.dispatch(submit.i);await f.dispatch(f.interaction('bot:club:request_submit:DEV').i);
  assert.equal(f.store.snapshot().requests.length,1);
  const request=f.store.snapshot().requests[0];assert.equal(request.userId,f.user.id);
  const cancel=f.interaction(`bot:club:request_cancel:${request.id}`);await f.dispatch(cancel.i);
  assert.equal(f.store.snapshot().requests[0].status,'CANCELLED');
  const other=f.member('100000000000000006');
  const guessed=f.interaction(`bot:club:request_detail:${request.id}:own`,{actor:other});await f.dispatch(guessed.i);
  assert.match(serialized(guessed.i.payload),/unavailable/);
});

test('member registration requires its preview and cancellation does not mutate storage',async(t)=>{
  const f=fixture(t),target=f.user.id;
  const forged=f.interaction(`bot:club:member_confirm:${target}:DEV:ACTIVE`,{actor:f.admin});await f.dispatch(forged.i);
  assert.match(serialized(forged.i.payload),/record changed|preview/i);assert.equal(f.store.snapshot().members.length,0);
  await f.services.bindRoles({guild:f.guild,actor:f.admin},{departmentRoleIds:{DEV:'100000000000000005'},confirmed:true});
  const select=f.interaction(`bot:club:member_set_dept:${target}:ACTIVE`,{actor:f.admin,kind:'select',values:['DEV']});await f.dispatch(select.i);
  assert.equal(f.store.snapshot().members.length,0);
  const confirm=f.interaction(`bot:club:member_confirm:${target}:DEV:ACTIVE`,{actor:f.admin});await f.dispatch(confirm.i);
  assert.equal(f.services.getMember({guild:f.guild,actor:f.admin},target).departmentKey,'DEV');
  assert.equal(f.user.roles.cache.has('100000000000000005'),true);
});

test('reject opens its modal immediately; forged reject submissions recheck service authorization',async(t)=>{
  const f=fixture(t),request=await f.services.submitRequest({guild:f.guild,actor:f.user},{departmentKey:'DEV'});
  const open=f.interaction(`bot:club:request_reject:${request.id}`,{actor:f.admin});await f.dispatch(open.i);
  assert.equal(open.calls.length,1);assert.equal(open.calls[0][0],'showModal');
  const forged=f.interaction(`bot:club:reject_submit:${request.id}`,{kind:'modal',fields:{reason:'No'}});await f.dispatch(forged.i);
  assert.equal(f.store.snapshot().requests[0].status,'PENDING');
  const submit=f.interaction(`bot:club:reject_submit:${request.id}`,{actor:f.admin,kind:'modal',fields:{reason:'Capacity reached'}});await f.dispatch(submit.i);
  const record=f.store.snapshot().requests[0];assert.equal(record.status,'REJECTED');assert.equal(record.reason,'Capacity reached');assert.equal(record.resolvedBy,f.admin.id);
});

test('Check Setup is read-only through the interaction path and repair cannot skip its preview',async(t)=>{
  const f=fixture(t),before=f.store.snapshot();
  const check=f.interaction('bot:club:setup:0',{actor:f.admin});await f.dispatch(check.i);
  assert.deepEqual(f.store.snapshot(),before);assert.equal(fs.existsSync(f.store.storagePath),false);
  const repair=f.interaction(`bot:club:setup_repair_confirm:${f.user.id}`,{actor:f.admin});await f.dispatch(repair.i);
  assert.deepEqual(f.store.snapshot(),before);
});

test('DM management is rejected and stale or unknown component IDs have a working Home route',async(t)=>{
  const f=fixture(t),dm=f.interaction('bot:club:members:0');dm.i.guild=null;dm.i.member=null;await f.dispatch(dm.i);
  assert.match(serialized(dm.i.payload||dm.calls.at(-1)[1]),/Discord server/i);
  const stale=f.interaction('bot:modal:event_add',{kind:'modal',fields:{name:'Unsafe old action'}});await f.dispatch(stale.i);
  assert.match(serialized(stale.i.payload),/expired/i);assert.equal(f.eventStore.getAllEvents().length,0);
});

test('member, request, event, team and mentor pages beyond 25 remain reachable',async(t)=>{
  const f=fixture(t),timestamp=new Date().toISOString();
  await f.store.transaction(data=>{
    for(let n=0;n<35;n++)data.members.push({guildId:f.guild.id,userId:`person-${n}`,displayName:`Person ${String(n).padStart(2,'0')}`,departmentKey:null,status:'ACTIVE',createdAt:timestamp,updatedAt:timestamp});
  });
  const last=f.interaction('bot:club:members:4:ALL:ALL:0');await f.dispatch(last.i);assert.match(serialized(last.i.payload),/Person 34/);
  const fakeEvents=Array.from({length:35},(_,n)=>({id:`event-${n}`,name:`Event ${n}`,status:'ACTIVE',teams:[]}));
  const eventPayload=getManagedEventsPayload({events:fakeEvents,page:4});assert.match(serialized(eventPayload),/Event 34/);
  const event={id:'event',name:'Event',status:'ACTIVE',teams:Array.from({length:35},(_,n)=>({id:`team-${n}`,name:`Team ${n}`,number:n+1,members:['member'],mentors:[`mentor-${n}`]}))};
  assert.match(serialized(getManagedTeamsPayload({event,page:34})),/Team 34/);
  assert.match(serialized(getManagedMentorsPayload({event,page:4})),/mentor.*34/);
  const roster={...event.teams[0],members:Array.from({length:35},(_,n)=>`person-${n}`)};
  assert.match(serialized(getManagedRosterPayload({event,team:roster,page:4})),/person.*34/);
});

test('event deletion selection renders a review; Cancel and forged confirms perform no deletion',async(t)=>{
  const f=fixture(t);let deletes=0;
  const event={id:'event',name:'Event',teams:[{id:'team',name:'Team 01',members:[],mentors:[]}]};
  const eventServices={getEvent:()=>event};
  const teamServices={getTeamDeletionImpact:()=>({event,team:event.teams[0],memberCount:0,mentorCount:0,resources:[{type:'role',id:'role',name:'Event - Team 01 - Member'}]}),removeTeamWithRoles:async()=>{deletes++;return{deleted:true};}};
  const sessions=createSessionStore(),previews=createConfirmationStore();
  const run=async(action,params)=>{const {i}=f.interaction('bot:em:any',{actor:f.admin});await handleEventInteraction(i,{action,params},{club:f.services,sessions,previews,eventServices,teamServices});return i;};
  const review=await run('delete',['event','team']);assert.equal(deletes,0);
  const token=buttons(review.payload).find(b=>b.custom_id?.includes(':confirm:')).custom_id.split(':').at(-1);
  await run('cancel',[token]);assert.equal(deletes,0);
  await assert.rejects(run('confirm',[token]),{code:'STALE_CONFIRMATION'});assert.equal(deletes,0);
});

test('UI session and confirmation contexts reject cross-user/guild replay and expiration',()=>{
  let now=100;const sessions=createSessionStore({now:()=>now,ttl:100}),previews=createConfirmationStore({now:()=>now,ttl:100});
  const ctx={guild:{id:'guild'},actor:{id:'user'}},token=sessions.put(ctx,{eventId:'event'});
  assert.throws(()=>sessions.get({...ctx,actor:{id:'other'}},token),/expired/);
  previews.preview(ctx,'delete','team',{version:1});assert.throws(()=>previews.verify({...ctx,guild:{id:'other'}},'delete','team',{version:1}),{code:'STALE_CONFIRMATION'});
  now=201;assert.throws(()=>sessions.get(ctx,token),/expired/);assert.throws(()=>previews.verify(ctx,'delete','team',{version:1}),{code:'STALE_CONFIRMATION'});
});

test('event interactions acknowledge before fresh actor reads and result navigation preserves the selected team',async(t)=>{
  const f=fixture(t);
  const event=f.eventStore.createEvent({guildId:f.guild.id,name:'Navigation Event'});
  for(let n=0;n<31;n++)f.eventStore.addTeam(event.id,{name:`Team ${n+1}`},f.guild.id);
  const last=f.eventStore.getEventById(event.id,f.guild.id).teams.at(-1);
  const {i,calls}=f.interaction(`bot:em:focus:${event.id}:${last.id}`);
  const original=f.guild.members.fetch;
  f.guild.members.fetch=async(input)=>{assert.equal(i.deferred,true);return original(input);};
  await f.dispatch(i);
  assert.equal(calls[0][0],'deferUpdate');assert.match(serialized(i.payload),/Team 31/);
});

test('event deletion picker selects an impact review and confirm passes the exact preview version once',async(t)=>{
  const f=fixture(t),event={id:'event',name:'Test Event',status:'ACTIVE',teams:[{id:'first',name:'First',members:[],mentors:[]},{id:'last',name:'Last',members:[],mentors:[]}]};
  const sessions=createSessionStore(),previews=createConfirmationStore();let mutation;
  const eventServices={getEvent:()=>event};
  const teamServices={getTeamDeletionImpact:({teamId})=>({event,team:event.teams.find(team=>team.id===teamId),memberCount:0,mentorCount:0,resources:[]}),removeTeamWithRoles:async(ctx)=>{mutation=ctx;return{deleted:true,failedResources:[]};}};
  const run=async(action,params,values=[])=>{const{i}=f.interaction('bot:em:test',{actor:f.admin,values,kind:values.length?'select':'button'});await handleEventInteraction(i,{action,params},{club:f.services,sessions,previews,eventServices,teamServices});return i;};
  const picker=await run('deletepick',['event',0]);assert.equal(mutation,undefined);
  assert.equal(buttons(picker.payload).find(c=>c.custom_id==='bot:em:deleteselect:event').options.length,2);
  const review=await run('deleteselect',['event'],['last']);assert.equal(mutation,undefined);assert.match(serialized(review.payload),/Last/);
  const token=buttons(review.payload).find(b=>b.custom_id?.includes(':confirm:')).custom_id.split(':').at(-1);
  await run('confirm',[token]);assert.equal(mutation.teamId,'last');assert.equal(mutation.confirmed,true);assert.equal(mutation.expectedVersion,JSON.stringify(event.teams[1]));
  await assert.rejects(run('confirm',[token]),{code:'STALE_CONFIRMATION'});
});

test('expired search contexts report an expired screen with a working Home route',async(t)=>{
  const f=fixture(t),{i}=f.interaction('bot:club:members:0:ALL:ALL:expired');await f.dispatch(i);
  assert.match(serialized(i.payload),/expired/i);assert.equal(buttons(i.payload).some(b=>b.custom_id==='bot:hub:main'),true);
});

test('persistent deployment acknowledges before send and rechecks current administrator authority',async(t)=>{
  const f=fixture(t);let sends=0;
  const channel={id:'100000000000000009',guild:f.guild,permissionsFor:()=>({has:()=>true}),async send(payload){assert.equal(i.deferred,true);assert.equal(buttons(payload).length,5);sends++;}};
  const {i}=f.interaction('',{actor:f.admin});i.options={getChannel:()=>channel};i.client={user:f.guild.members.me};
  await botCommand(i);assert.equal(sends,1);
  const second=f.interaction('',{actor:f.admin});second.i.options=i.options;second.i.client=i.client;
  const original=f.guild.members.fetch;
  f.guild.members.fetch=async(input)=>{const actor=await original(input);return{...actor,permissions:{has:()=>false}};};
  await botCommand(second.i);assert.equal(sends,1);
});

test('canonical department selector opens its detail and rejects guessed department keys',async(t)=>{
  const f=fixture(t);
  const open=f.interaction('bot:club:department_open',{kind:'select',values:['DEV']});await f.dispatch(open.i);
  assert.match(serialized(open.i.payload),/Dev Department/);
  assert.equal(buttons(open.i.payload).some(button=>button.custom_id==='bot:club:request_department:DEV'),true);
  const forged=f.interaction('bot:club:department_open',{kind:'select',values:['UNKNOWN']});await f.dispatch(forged.i);
  assert.match(serialized(forged.i.payload),/current roles|unavailable/i);
});

test('No Department member filter reaches registered members with null primary department',async(t)=>{
  const f=fixture(t),timestamp=new Date().toISOString();
  await f.store.transaction(data=>{
    for(const [userId,displayName,departmentKey] of [['unassigned','Unassigned Person',null],['assigned','Assigned Person','DEV']])data.members.push({guildId:f.guild.id,userId,displayName,departmentKey,status:'ACTIVE',createdAt:timestamp,updatedAt:timestamp});
  });
  const filtered=f.interaction('bot:club:member_filter_dept:0:ALL',{kind:'select',values:['NONE']});await f.dispatch(filtered.i);
  assert.match(serialized(filtered.i.payload),/Unassigned Person/);
  assert.equal(serialized(filtered.i.payload).includes('Assigned Person'),false);
  const refreshed=f.interaction('bot:club:members:0:NONE:ALL:0');await f.dispatch(refreshed.i);
  assert.match(serialized(refreshed.i.payload),/Unassigned Person/);
});

test('Cancel invalidates a registration preview and an archived-member preview without mutations',async(t)=>{
  const f=fixture(t),target=f.user.id;
  await f.services.bindRoles({guild:f.guild,actor:f.admin},{departmentRoleIds:{DEV:'100000000000000005'},confirmed:true});
  const select=()=>f.interaction(`bot:club:member_set_dept:${target}:ACTIVE`,{actor:f.admin,kind:'select',values:['DEV']});
  await f.dispatch(select().i);
  await f.dispatch(f.interaction('bot:club:member_register',{actor:f.admin}).i);
  const replay=f.interaction(`bot:club:member_confirm:${target}:DEV:ACTIVE`,{actor:f.admin});await f.dispatch(replay.i);
  assert.match(serialized(replay.i.payload),/record changed|preview/i);assert.equal(f.store.snapshot().members.length,0);
  await f.dispatch(select().i);await f.dispatch(f.interaction(`bot:club:member_confirm:${target}:DEV:ACTIVE`,{actor:f.admin}).i);
  await f.dispatch(f.interaction(`bot:club:member_archive:${target}`,{actor:f.admin}).i);
  await f.dispatch(f.interaction(`bot:club:member_detail:${target}`,{actor:f.admin}).i);
  const archiveReplay=f.interaction(`bot:club:member_confirm:${target}:DEV:ARCHIVED`,{actor:f.admin});await f.dispatch(archiveReplay.i);
  assert.match(serialized(archiveReplay.i.payload),/record changed|preview/i);
  assert.equal(f.store.snapshot().members[0].status,'ACTIVE');assert.equal(f.user.roles.cache.has('100000000000000005'),true);
});

test('member confirmations reject role-binding changes after impact preview',async(t)=>{
  const f=fixture(t),target=f.user.id,ctx={guild:f.guild,actor:f.admin};
  await f.services.bindRoles(ctx,{departmentRoleIds:{DEV:'100000000000000005'},confirmed:true});
  await f.dispatch(f.interaction(`bot:club:member_set_dept:${target}:ACTIVE`,{actor:f.admin,kind:'select',values:['DEV']}).i);
  const replacement='100000000000000020';f.guild.roles.cache.set(replacement,{id:replacement,name:'Dev Department',editable:true,position:2});
  await f.services.bindRoles(ctx,{departmentRoleIds:{DEV:replacement},confirmed:true});
  const confirm=f.interaction(`bot:club:member_confirm:${target}:DEV:ACTIVE`,{actor:f.admin});await f.dispatch(confirm.i);
  assert.match(serialized(confirm.i.payload),/record changed|preview/i);assert.equal(f.store.snapshot().members.length,0);
});

test('own request views enforce requester identity even for an authorized administrator',async(t)=>{
  const f=fixture(t),request=await f.services.submitRequest({guild:f.guild,actor:f.user},{departmentKey:'DEV'});
  const own=f.interaction(`bot:club:request_detail:${request.id}:own`,{actor:f.admin});await f.dispatch(own.i);
  assert.match(serialized(own.i.payload),/current roles/i);
  const review=f.interaction(`bot:club:request_detail:${request.id}:review`,{actor:f.admin});await f.dispatch(review.i);
  assert.equal(buttons(review.i.payload).some(button=>button.label==='Approve'),true);
});

test('pending join scope follows current membership before opening a rejection modal',async(t)=>{
  const f=fixture(t),manager=f.member('100000000000000021'),ctx={guild:f.guild,actor:f.admin};
  const managerRole='100000000000000022',mediaRole='100000000000000023';
  f.guild.roles.cache.set(managerRole,{id:managerRole,name:'Dev',editable:true,position:1});manager.roles.cache.set(managerRole,f.guild.roles.cache.get(managerRole));
  f.guild.roles.cache.set(mediaRole,{id:mediaRole,name:'Media Department',editable:true,position:1});
  await f.services.bindRoles(ctx,{trustedRoleIds:{DEV:managerRole},departmentRoleIds:{MEDIA:mediaRole},confirmed:true});
  const request=await f.services.submitRequest({guild:f.guild,actor:f.user},{departmentKey:'DEV'});
  const initial=f.interaction(`bot:club:request_reject:${request.id}`,{actor:manager});await f.dispatch(initial.i);assert.equal(initial.calls[0][0],'showModal');
  await f.services.registerMember(ctx,{userId:f.user.id,departmentKey:'MEDIA'});
  const stale=f.interaction(`bot:club:request_reject:${request.id}`,{actor:manager});await f.dispatch(stale.i);
  assert.equal(stale.calls.some(([method])=>method==='showModal'),false);
  assert.equal(f.services.listRequests({guild:f.guild,actor:manager}).length,0);
  assert.equal(f.store.snapshot().requests[0].status,'PENDING');
});

test('club buttons refresh the actual actor rather than trusting a stale interaction member',async(t)=>{
  const f=fixture(t),stale=f.admin;
  f.member(stale.id,false);
  const replay=f.interaction('bot:club:member_register',{actor:stale});await f.dispatch(replay.i);
  assert.match(serialized(replay.i.payload),/current roles/i);assert.equal(f.store.snapshot().members.length,0);
});

test('club buttons acknowledge before forcing any Discord member read',async(t)=>{
  const f=fixture(t),{i,calls}=f.interaction('bot:club:profile'),fetch=f.guild.members.fetch;
  f.guild.members.fetch=async(query)=>{
    assert.equal(i.deferred,true,'the interaction must be acknowledged before Discord REST work');
    return fetch(query);
  };
  await f.dispatch(i);
  assert.equal(calls[0][0],'deferUpdate');
  assert.match(serialized(i.payload),/club record|Stored Club Membership/i);
});

test('My Teams uses the injected event store and shows only the requester current-guild assignments',async(t)=>{
  const f=fixture(t);
  const event=f.eventStore.createEvent({id:'owned',guildId:f.guild.id,name:'Assigned Event'});
  const own=f.eventStore.addTeam(event.id,{name:'My Own Team'},f.guild.id),other=f.eventStore.addTeam(event.id,{name:'Other Person Team'},f.guild.id);
  f.eventStore.assignMembers(event.id,own.id,[f.user.id],f.guild.id);f.eventStore.assignMentors(event.id,other.id,[f.admin.id],f.guild.id);
  const foreign=f.eventStore.createEvent({id:'foreign',guildId:'other-guild',name:'Foreign Event'}),foreignTeam=f.eventStore.addTeam(foreign.id,{name:'Foreign Team'},'other-guild');
  f.eventStore.assignMembers(foreign.id,foreignTeam.id,[f.user.id],'other-guild');
  const myTeams=f.interaction('bot:club:my_teams:0');await f.dispatch(myTeams.i);
  assert.match(serialized(myTeams.i.payload),/My Own Team/);
  assert.equal(serialized(myTeams.i.payload).includes('Other Person Team'),false);
  assert.equal(serialized(myTeams.i.payload).includes('Foreign Event'),false);
});

test('member detail Refresh and Back restore later directory page, search, department and status',async(t)=>{
  const f=fixture(t),timestamp=new Date().toISOString();
  await f.store.transaction(data=>{
    for(let n=0;n<24;n++)data.members.push({guildId:f.guild.id,userId:`navigation-person-${n}`,displayName:`Needle ${String(n).padStart(2,'0')}`,departmentKey:'DEV',status:'ARCHIVED',createdAt:timestamp,updatedAt:timestamp});
    data.members.push({guildId:f.guild.id,userId:'outside-search',displayName:'Unrelated Person',departmentKey:'DEV',status:'ARCHIVED',createdAt:timestamp,updatedAt:timestamp});
  });
  const searched=f.interaction('bot:club:member_search_submit:0',{actor:f.admin,kind:'modal',fields:{search:'Needle'}});await f.dispatch(searched.i);
  const searchMenu=buttons(searched.i.payload).find(component=>component.custom_id?.startsWith('bot:club:member_open:'));
  const searchContext=searchMenu.custom_id.split(':').at(-1);
  const later=f.interaction(`bot:club:members:2:DEV:ARCHIVED:${searchContext}`,{actor:f.admin});await f.dispatch(later.i);
  const menu=buttons(later.i.payload).find(component=>component.custom_id?.startsWith('bot:club:member_open:'));
  assert.match(menu.custom_id,/member_open:2:DEV:ARCHIVED:/);
  const opened=f.interaction(menu.custom_id,{actor:f.admin,kind:'select',values:[menu.options[0].value]});await f.dispatch(opened.i);
  const refresh=buttons(opened.i.payload).find(component=>component.custom_id?.startsWith('bot:club:member_detail:'));
  const refreshed=f.interaction(refresh.custom_id,{actor:f.admin});await f.dispatch(refreshed.i);
  const reactivate=buttons(refreshed.i.payload).find(component=>component.custom_id?.startsWith('bot:club:member_reactivate:'));
  const preview=f.interaction(reactivate.custom_id,{actor:f.admin});await f.dispatch(preview.i);
  const cancel=buttons(preview.i.payload).find(component=>component.label==='Cancel');
  const cancelled=f.interaction(cancel.custom_id,{actor:f.admin});await f.dispatch(cancelled.i);
  const back=buttons(cancelled.i.payload).find(component=>component.custom_id?.startsWith('bot:club:members_return:'));
  const returned=f.interaction(back.custom_id,{actor:f.admin});await f.dispatch(returned.i);
  assert.match(serialized(returned.i.payload),/Page 3 of 3/);assert.match(serialized(returned.i.payload),/Needle 16/);
  assert.equal(serialized(returned.i.payload).includes('Unrelated Person'),false);
  const restoredMenu=buttons(returned.i.payload).find(component=>component.custom_id?.startsWith('bot:club:member_open:'));
  assert.equal(restoredMenu.custom_id,menu.custom_id);
});

test('request details restore Approval Center filters and later own-history pages',async(t)=>{
  const f=fixture(t),timestamp=new Date().toISOString();
  await f.store.transaction(data=>{
    for(let n=0;n<24;n++)data.requests.push({id:`history-request-${n}`,guildId:f.guild.id,userId:f.user.id,type:'JOIN',currentDepartmentKey:null,departmentKey:'DEV',status:'REJECTED',createdAt:timestamp,resolvedAt:timestamp,resolvedBy:f.admin.id,reason:'History item'});
    data.requests.push({id:'other-department-history',guildId:f.guild.id,userId:f.user.id,type:'JOIN',currentDepartmentKey:null,departmentKey:'MEDIA',status:'REJECTED',createdAt:timestamp,resolvedAt:timestamp,resolvedBy:f.admin.id});
  });
  const later=f.interaction('bot:club:approvals:2:REJECTED:DEV',{actor:f.admin});await f.dispatch(later.i);
  const menu=buttons(later.i.payload).find(component=>component.custom_id?.startsWith('bot:club:request_open:'));
  assert.equal(menu.custom_id,'bot:club:request_open:review:2:REJECTED:DEV');
  const detail=f.interaction(menu.custom_id,{actor:f.admin,kind:'select',values:[menu.options[0].value]});await f.dispatch(detail.i);
  const refresh=buttons(detail.i.payload).find(component=>component.custom_id?.startsWith('bot:club:request_detail:'));
  const refreshed=f.interaction(refresh.custom_id,{actor:f.admin});await f.dispatch(refreshed.i);
  const back=buttons(refreshed.i.payload).find(component=>component.custom_id?.startsWith('bot:club:requests_return:'));
  const returned=f.interaction(back.custom_id,{actor:f.admin});await f.dispatch(returned.i);
  assert.match(serialized(returned.i.payload),/Page 3 of 3/);
  assert.equal(buttons(returned.i.payload).find(component=>component.custom_id?.startsWith('bot:club:request_open:')).custom_id,menu.custom_id);
  const own=f.interaction('bot:club:my_requests:2');await f.dispatch(own.i);
  const ownMenu=buttons(own.i.payload).find(component=>component.custom_id?.startsWith('bot:club:request_open:'));
  const ownDetail=f.interaction(ownMenu.custom_id,{kind:'select',values:[ownMenu.options[0].value]});await f.dispatch(ownDetail.i);
  const ownBack=buttons(ownDetail.i.payload).find(component=>component.custom_id?.startsWith('bot:club:requests_return:'));
  const ownReturned=f.interaction(ownBack.custom_id);await f.dispatch(ownReturned.i);
  assert.match(serialized(ownReturned.i.payload),/Page 3 of 4/);
});

test('request rejection modal preserves its filtered approval-page return context after resolution',async(t)=>{
  const f=fixture(t),timestamp=new Date().toISOString();
  await f.store.transaction(data=>{
    for(let n=0;n<12;n++)data.requests.push({id:`pending-navigation-${n}`,guildId:f.guild.id,userId:`requester-${n}`,type:'JOIN',currentDepartmentKey:null,departmentKey:'DEV',status:'PENDING',createdAt:timestamp,resolvedAt:null,resolvedBy:null});
  });
  const page=f.interaction('bot:club:approvals:1:PENDING:DEV',{actor:f.admin});await f.dispatch(page.i);
  const menu=buttons(page.i.payload).find(component=>component.custom_id?.startsWith('bot:club:request_open:'));
  const detail=f.interaction(menu.custom_id,{actor:f.admin,kind:'select',values:[menu.options[0].value]});await f.dispatch(detail.i);
  const reject=buttons(detail.i.payload).find(component=>component.custom_id?.startsWith('bot:club:request_reject:'));
  const modal=f.interaction(reject.custom_id,{actor:f.admin});await f.dispatch(modal.i);
  const submit=f.interaction(modal.calls[0][1].custom_id,{actor:f.admin,kind:'modal',fields:{reason:'Reviewed with the member'}});await f.dispatch(submit.i);
  assert.match(serialized(submit.i.payload),/Rejected|REJECTED/);
  const back=buttons(submit.i.payload).find(component=>component.custom_id?.startsWith('bot:club:requests_return:'));
  const returned=f.interaction(back.custom_id,{actor:f.admin});await f.dispatch(returned.i);
  assert.match(serialized(returned.i.payload),/Page 2 of 2/);
  assert.equal(buttons(returned.i.payload).find(component=>component.custom_id?.startsWith('bot:club:request_open:')).custom_id,'bot:club:request_open:review:1:PENDING:DEV');
});
