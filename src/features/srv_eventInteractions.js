import { PermissionFlagsBits } from 'discord.js';
import * as events from './srv_events.js';
import * as teams from './srv_teams.js';
import { eventsStore } from '../data/json_events.js';
import { clubServices } from './srv_club.js';
import { uiSessions } from './srv_sessions.js';
import { confirmations } from './srv_confirmations.js';
import { getHubPayload } from '../ui/view_hub.js';
import * as ui from '../ui/view_event_management.js';
import { clubText, clubPage } from '../ui/components/c_club.js';
import { acknowledge, respond, interactionContext } from '../utils/f_interactionResponse.js';
import { EVENT_MANAGEMENT_MESSAGES as M } from '../messages/msg_eventManagement.js';
import { EVENT_CONTROLS as L } from '../config/cfg_eventManagement.js';
import { INTERACTION_MESSAGES } from '../messages/msg_interactions.js';
import { resolveMemberNames } from './srv_memberNames.js';

function fail(code='FORBIDDEN') {const error=new Error(code);error.code=code;throw error;}
const version = (value) => JSON.stringify(value);

/** Old public messages remain entry points; stale mutation submissions never apply. */
export function resolveLegacyEventRoute(parsed, values = []) {
  const { namespace, action, params: [eventId, teamOrPage] } = parsed;
  if (namespace === 'event' && action === 'add') return { action: 'add', params: [] };
  if (namespace === 'event' && ['detail', 'select'].includes(action)) return { action: 'detail', params: [values[0] || eventId] };
  if (namespace === 'mentor' && action === 'view') return { action: 'mentors', params: [eventId, 0] };
  if (namespace !== 'team') return null;
  if (['view', 'page'].includes(action)) return { action: 'teams', params: [eventId, Math.max(0, Number(teamOrPage || 1) - 1)] };
  if (action === 'add') return { action: 'tadd', params: [eventId] };
  if (action === 'delete_menu') return { action: 'deletepick', params: [eventId, 0] };
  if (action === 'delete_confirm' && values[0]) return { action: 'delete', params: [eventId, values[0]] };
  if (['assign_members', 'assign_mentors'].includes(action)) return teamOrPage
    ? { action: 'legacy_pick', params: [eventId, teamOrPage, action === 'assign_members' ? 'members' : 'mentors'] }
    : { action: 'teams', params: [eventId, 0] };
  if (action === 'assign_target' && values[0]) return { action: 'legacy_pick', params: [eventId, values[0], teamOrPage] };
  return null;
}

export async function handleEventInteraction(interaction,parsed,{club=clubServices,sessions=uiSessions,previews=confirmations,eventServices=events,teamServices=teams}={}) {
  const ctx={...interactionContext(interaction),store:club.eventStore||eventsStore},[a,b,c]=parsed.params,action=parsed.action;
  let caps;
  const manage=()=>{if(!caps.eventManage)fail();};
  const getEvent=(id)=>{const event=eventServices.getEvent(id,ctx);if(!event)fail('NOT_FOUND');return event;};
  const getTeam=(eventId,teamId)=>{const event=getEvent(eventId),team=event.teams.find(t=>t.id===teamId);if(!team)fail('NOT_FOUND');return {event,team};};
  const detail=(id)=>ui.getManagedEventPayload({event:getEvent(id),canManage:caps.eventManage});
  const teamPage=async(eventId,page)=>{
    const event=getEvent(eventId),number=Math.max(0,Math.min(event.teams.length-1,Number(page)||0)),team=event.teams[number];
    const channelId=team?.textChannelId||team?.channels?.chat;
    const channel=channelId?await ctx.guild.channels.fetch(channelId,{force:true}).catch(()=>null):null;
    const channelUrl=channel?.guild?.id===ctx.guild.id&&channel?.permissionsFor(ctx.actor)?.has(PermissionFlagsBits.ViewChannel)?`https://discord.com/channels/${ctx.guild.id}/${channel.id}`:undefined;
    return ui.getManagedTeamsPayload({event,page:number,canManage:caps.eventManage,channelUrl});
  };
  const review=(data,title,description,fields=[])=>{
    const token=sessions.put(ctx,data);previews.preview(ctx,'event',token,{version:data.version});
    return ui.getEventConfirmationPayload({title,description,token,fields});
  };
  // Modal triggers perform permission checks without slow work or deferring.
  if(['add','edit','tadd','tedit'].includes(action)) {
    caps=club.capabilities(ctx);
    manage();const event=action==='add'?undefined:getEvent(a);
    if(event?.status==='ARCHIVED')fail('EVENT_ARCHIVED');
    const team=action==='tedit'?getTeam(a,b).team:undefined;
    return interaction.showModal(action.startsWith('t')?ui.createManagedTeamModal({event,team}):ui.createManagedEventModal({event}));
  }
  await acknowledge(interaction);
  ctx.actor=await ctx.guild.members.fetch({user:ctx.actor.id,force:true}).catch(()=>null);
  if(!ctx.actor||ctx.actor.guild?.id!==ctx.guild.id)fail('GUILD_REQUIRED');
  caps=club.capabilities(ctx);
  let payload;
  switch(action) {
    case 'home': payload=getHubPayload(interaction.user,ctx.actor,caps);break;
    case 'close': payload={content:INTERACTION_MESSAGES.closed,embeds:[],components:[]};break;
    case 'list': payload=ui.getManagedEventsPayload({events:eventServices.listEvents({...ctx,includeArchived:true}),archived:a==='archive',page:b,canManage:caps.eventManage});break;
    case 'select': payload=detail(interaction.values[0]);break;
    case 'detail': payload=detail(a);break;
    case 'teams': payload=await teamPage(a,b);break;
    case 'focus': {const {event,team}=getTeam(a,b);payload=await teamPage(a,event.teams.findIndex(item=>item.id===team.id));break;}
    case 'mentors': {
      const event=getEvent(a),userIds=clubPage(event.teams.flatMap(team=>team.mentors),b,8).items;
      payload=ui.getManagedMentorsPayload({event,page:b,names:await resolveMemberNames(ctx.guild,userIds)});break;
    }
    case 'roster': {
      const pair=getTeam(a,b),userIds=clubPage([...pair.team.members,...pair.team.mentors],c,8).items;
      payload=ui.getManagedRosterPayload({...pair,page:c,names:await resolveMemberNames(ctx.guild,userIds)});break;
    }
    case 'manage': {
      manage();const pair=getTeam(a,b);if(pair.event.status==='ARCHIVED')fail('EVENT_ARCHIVED');
      const token=sessions.put(ctx,{eventId:a,teamId:b});payload=ui.getManagedRosterPayload({...pair,manage:true,token});break;
    }
    case 'legacy_pick': {
      manage();if(!['members','mentors'].includes(c))fail();
      const pair=getTeam(a,b);if(pair.event.status==='ARCHIVED')fail('EVENT_ARCHIVED');
      const token=sessions.put(ctx,{eventId:a,teamId:b});
      payload=ui.getRosterPickerPayload({...pair,token,type:c});break;
    }
    case 'pick': case 'pickpage': {
      manage();if(!['members','mentors','removeMembers','removeMentors'].includes(b))fail();
      const data=sessions.get(ctx,a),pair=getTeam(data.eventId,data.teamId);
      const field=b==='removeMembers'?'members':b==='removeMentors'?'mentors':null;
      const userIds=field?clubPage([...new Set(pair.team[field])],c,8).items:[];
      payload=ui.getRosterPickerPayload({...pair,token:a,type:b,page:c||0,names:await resolveMemberNames(ctx.guild,userIds)});break;
    }
    case 'assign': {
      manage();const data=sessions.get(ctx,a),pair=getTeam(data.eventId,data.teamId),userIds=[...new Set(interaction.values||[])];
      if(!['members','mentors','removeMembers','removeMentors'].includes(b)||!userIds.length||userIds.length>25)fail();
      const moves=b==='members'?userIds.flatMap(userId=>pair.event.teams.filter(t=>t.id!==pair.team.id&&t.members.includes(userId)).map(t=>({userId,sourceTeamId:t.id}))):[];
      if(b.startsWith('remove')||moves.length) {
        const data={kind:'roster',eventId:pair.event.id,teamId:pair.team.id,type:b,userIds,moves,version:version(pair.event.teams)};
        const names=await resolveMemberNames(ctx.guild,userIds);
        payload=review(data,b.startsWith('remove')?M.titleRemove:M.titleMove,b.startsWith('remove')?M.remove:M.move,[{name:L.eventTeam,value:`${clubText(pair.event.name,100)} / ${clubText(pair.team.name,100)}`},{name:L.people,value:userIds.map(id=>clubText(names[id],60)).join('\n').slice(0,1000)}]);
      } else {
        const result=await teamServices[b==='members'?'assignMembersWithRoles':'assignMentorsWithRoles']({...ctx,...data,userIds});payload=ui.getEventNoticePayload({message:M.assignment(result),...data});
      }
      break;
    }
    case 'addsave': manage(); {const event=await eventServices.registerEvent({...ctx,name:interaction.fields.getTextInputValue(L.nameField),description:interaction.fields.getTextInputValue(L.descriptionField)});payload=detail(event.id);break;}
    case 'editsave': manage();await eventServices.editEvent({...ctx,eventId:a,name:interaction.fields.getTextInputValue(L.nameField),description:interaction.fields.getTextInputValue(L.descriptionField)});payload=detail(a);break;
    case 'taddsave': manage();await teamServices.createTeamWithRoles({...ctx,eventId:a,name:interaction.fields.getTextInputValue(L.nameField)});payload=await teamPage(a,getEvent(a).teams.length-1);break;
    case 'teditsave': manage();await teamServices.editTeamWithRoles({...ctx,eventId:a,teamId:b,name:interaction.fields.getTextInputValue(L.nameField)});payload=await teamPage(a,getEvent(a).teams.findIndex(t=>t.id===b));break;
    case 'archive': manage(); {const event=getEvent(a);payload=review({kind:'archive',eventId:a,version:version(event)},M.titleArchive,`${clubText(event.name,100)}\n\n${M.archive}`);break;}
    case 'delete': {
      manage();const impact=teamServices.getTeamDeletionImpact({...ctx,eventId:a,teamId:b});
      payload=review({kind:'delete',eventId:a,teamId:b,version:version(impact.team)},M.titleDelete,M.delete,[
        {name:L.eventTeam,value:`${clubText(impact.event.name,100)} / ${clubText(impact.team.name,100)}`},
        {name:L.rosterTitle,value:M.rosterCounts(impact.memberCount,impact.mentorCount)},
        {name:L.rolesChannels,value:impact.resources.map(r=>M.resourceLine(r.type,clubText(r.name,90),r.id)).join('\n').slice(0,1000)||M.noResources},
      ]);break;
    }
    case 'deletepick': {
      manage();payload=ui.getManagedDeletePickerPayload({event:getEvent(a),page:b});break;
    }
    case 'deleteselect': return handleEventInteraction(interaction,{...parsed,action:'delete',params:[a,interaction.values?.[0]]},{club,sessions,previews,eventServices,teamServices});
    case 'repair': {
      manage();const {event,team}=getTeam(a,b);
      const impact=teamServices.getTeamDeletionImpact({...ctx,eventId:a,teamId:b});
      payload=review({kind:'repair',eventId:a,teamId:b,version:version(team)},M.titleRepair,M.repair,[
        {name:L.eventTeam,value:`${clubText(event.name,100)} / ${clubText(team.name,100)}`},
        {name:L.rosterTitle,value:M.rosterCounts(team.members.length,team.mentors.length)},
        {name:L.rolesChannels,value:impact.resources.map(resource=>M.resourceLine(resource.type,clubText(resource.name,90),resource.id)).join('\n').slice(0,1000)||M.noResources},
      ]);break;
    }
    case 'channels': case 'voice': {
      manage();const result=await teamServices.createTeamChannels({...ctx,eventId:a,teamId:b,voice:action==='voice'});
      payload=ui.getEventNoticePayload({message:`${M.channelsCreated(result)} ${M.channels}`,eventId:a,teamId:b});break;
    }
    case 'legacy': {
      if(!caps.setupManage)fail();const legacy=ctx.store.getAllEvents().filter(e=>!e.guildId);
      payload=review({kind:'legacy',version:version(legacy)},M.titleLegacy,M.legacy(legacy.length,clubText(ctx.guild.name||ctx.guild.id,100),ctx.guild.id));break;
    }
    case 'cancel': {
      const data=sessions.get(ctx,a);previews.cancel(ctx,'event',a);payload=data.eventId?detail(data.eventId):ui.getEventNoticePayload({message:M.cancelled});break;
    }
    case 'confirm': {
      const data=sessions.get(ctx,a);if(data.kind==='legacy'){if(!caps.setupManage)fail();}else manage();
      const current=data.kind==='legacy'?ctx.store.getAllEvents().filter(e=>!e.guildId):data.kind==='archive'?getEvent(data.eventId):['delete','repair'].includes(data.kind)?getTeam(data.eventId,data.teamId).team:getEvent(data.eventId).teams;
      previews.verify(ctx,'event',a,{version:version(current)});
      if(data.kind==='archive') {await eventServices.archiveEvent({...ctx,eventId:data.eventId,expectedVersion:data.version,confirmed:true});payload=detail(data.eventId);}
      else if(data.kind==='delete') {const result=await teamServices.removeTeamWithRoles({...ctx,...data,expectedVersion:data.version,confirmed:true});payload=ui.getEventNoticePayload({message:M.cleanup(result),eventId:data.eventId});}
      else if(data.kind==='legacy') {await eventServices.bindLegacyEvents({...ctx,confirmed:true});payload=ui.getEventNoticePayload({message:INTERACTION_MESSAGES.updated});}
      else if(data.kind==='repair') {await teamServices.repairTeamWithRoles({...ctx,eventId:data.eventId,teamId:data.teamId,expectedVersion:data.version,confirmed:true});payload=ui.getEventNoticePayload({message:M.repaired,eventId:data.eventId,teamId:data.teamId});}
      else if(data.kind==='roster') {
        let result;
        if(data.type.startsWith('remove'))result=await teamServices.removeRosterWithRoles({...ctx,...data,type:data.type==='removeMembers'?'members':'mentors',expectedRosterVersion:data.version,confirmed:true});
        else {
          const remaining=data.userIds.filter(id=>!data.moves.some(m=>m.userId===id));
          result=remaining.length?await teamServices.assignMembersWithRoles({...ctx,...data,userIds:remaining,expectedRosterVersion:data.version}):{successCount:0,failedCount:0,rosterVersion:data.version};
          for(const [index,move] of data.moves.entries()) {
            try {
              const moved=await teamServices.moveMemberWithRoles({...ctx,...data,...move,expectedRosterVersion:result.rosterVersion,confirmed:true});
              result.rosterVersion=moved.rosterVersion;result.successCount++;
            } catch(error) {
              if(error.code==='STALE_CONFIRMATION')throw error;
              result.failedCount+=data.moves.length-index;break;
            }
          }
        }
        payload=ui.getEventNoticePayload({message:M.assignment(result),eventId:data.eventId,teamId:data.teamId});
      }else fail('SESSION_EXPIRED');
      break;
    }
    default: fail('SESSION_EXPIRED');
  }
  return respond(interaction,payload);
}
