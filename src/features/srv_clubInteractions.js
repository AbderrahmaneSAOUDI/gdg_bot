import { PermissionFlagsBits } from 'discord.js';
import { clubServices } from './srv_club.js';
import { listEvents } from './srv_events.js';
import { uiSessions } from './srv_sessions.js';
import { confirmations } from './srv_confirmations.js';
import { acknowledge, respond, interactionContext } from '../utils/f_interactionResponse.js';
import * as club from '../ui/view_club.js';
import * as members from '../ui/view_members.js';
import * as departments from '../ui/view_departments.js';
import * as approvals from '../ui/view_approvals.js';
import { getHubPayload } from '../ui/view_hub.js';
import { INTERACTION_MESSAGES as M } from '../messages/msg_interactions.js';
import { eventId } from '../config/cfg_eventManagement.js';
import { CORE_TEAM, getTeam } from '../config/cfg_teams.js';
import { formatUserName } from '../utils/f_formatters.js';
import { resolveMemberNames } from './srv_memberNames.js';
import { clubPage } from '../ui/components/c_club.js';

function deny() { const error=new Error('Forbidden');error.code='FORBIDDEN';throw error; }
function requireCap(caps,key) { if(!caps[key])deny(); }
const departmentAccess=(caps,key)=>caps.clubManage||caps.managedDepartments.has(key);
const rolesFor=(member)=>[...(member?.roles?.cache?.values?.()||[])].filter(r=>r.id!==member.guild?.id).map(r=>r.name);
const display=(ctx,id)=>formatUserName(ctx.guild,id);
const statusValue=(value)=>value==='NONE'?null:value;

export async function getPersonalTeams(ctx,userId=ctx.actor.id) {
  const events=listEvents({...ctx,includeArchived:true});
  const result=[];
  for(const event of events) for(const [page,team] of event.teams.entries()) {
    const membership=team.members.includes(userId),mentorship=team.mentors.includes(userId);
    if(!membership&&!mentorship)continue;
    const channelId=team.textChannelId||team.channels?.chat;
    const channel=channelId?await ctx.guild.channels.fetch(channelId,{force:true}).catch(()=>null):null;
    const channelUrl=channel?.guild?.id===ctx.guild.id&&channel?.permissionsFor(ctx.actor)?.has(PermissionFlagsBits.ViewChannel)?`https://discord.com/channels/${ctx.guild.id}/${channel.id}`:undefined;
    result.push({eventId:event.id,eventName:event.name,teamId:team.id,teamName:team.name,type:[membership?'Member':null,mentorship?'Mentor':null].filter(Boolean).join(' / '),channelUrl,detailCustomId:eventId('teams',event.id,page)});
  }
  return result;
}

/** Parses interactions and renders supplied models. Business mutations stay in services. */
export async function handleClubInteraction(interaction, parsed, {services=clubServices,sessions=uiSessions,previews=confirmations}={}) {
  const trusted=interactionContext(interaction);
  const opensModal=['request_reject','member_search'].includes(parsed.action);
  if(!opensModal)await acknowledge(interaction);
  const actor=opensModal?trusted.actor:await trusted.guild.members.fetch({user:trusted.actor.id,force:true}).catch(()=>null);
  if(!actor||actor.guild?.id!==trusted.guild.id)deny();
  const ctx={...trusted,actor,...(services.eventStore?{store:services.eventStore}:{})},caps=services.capabilities(ctx);
  const [a,b,c,d]=parsed.params,action=parsed.action,value=interaction.values?.[0];
  const notice=(message=M.updated)=>club.getClubNoticePayload({message});
  const requireMember=()=>requireCap(caps,'memberManage');
  const requireSetup=()=>requireCap(caps,'setupManage');
  const currentMember=(id)=>{const record=services.getMember(ctx,id);if(!record){const err=new Error('Missing record');err.code='NOT_FOUND';throw err;}return record;};
  const roleBindings=()=>services.getConfig(ctx).departmentRoleIds;
  const namedRequests=async(requests,page=0)=>{
    const names=await resolveMemberNames(ctx.guild,clubPage(requests,page).items.map(request=>request.userId));
    return requests.map(request=>({...request,requesterName:names[request.userId]||display(ctx,request.userId)}));
  };
  const requestScope=(request)=>{
    if(request.type==='TRANSFER')return caps.clubManage;
    const current=services.getMember(ctx,request.userId);
    const source=request.type==='TRANSFER'?request.currentDepartmentKey:(current?.departmentKey||request.currentDepartmentKey);
    return caps.clubManage||(caps.managedDepartments.has(request.departmentKey)&&(!source||source===request.departmentKey));
  };
  const bindingTarget=(kind,key)=>{
    if(kind==='coreRoleId'&&key==='CORE')return;
    if(kind==='trustedRoleIds'&&Object.hasOwn(CORE_TEAM,key))return;
    if(kind==='departmentRoleIds'&&getTeam(key)?.key===key)return;
    deny();
  };
  const readSession=(token)=>{
    try{return sessions.get(ctx,token);}catch(error){error.code||='SESSION_EXPIRED';throw error;}
  };
  const navigation=(token,kind,own)=>{
    if(!token)return undefined;
    const state=readSession(token);
    if(state.kind!==kind||(own!==undefined&&state.own!==own)){const error=new Error('Expired navigation');error.code='SESSION_EXPIRED';throw error;}
    return state;
  };
  const memberPreview=(userId,departmentKey,status,navigationToken)=>{
    navigation(navigationToken,'members');
    if((departmentKey!==null&&getTeam(departmentKey)?.key!==departmentKey)||!['ACTIVE','ARCHIVED'].includes(status))deny();
    const record=services.getMember(ctx,userId);
    const preview={userId,departmentKey,status,version:record?.updatedAt||null,roleBindings:roleBindings()};
    previews.preview(ctx,'member',userId,preview);
    return members.getClubMemberConfirmationPayload({member:record,userId,departmentKey,status,displayName:display(ctx,userId),navigationToken});
  };
  const memberList=(page=0,dept='ALL',status='ALL',context='0')=>{
    const search=context!=='0'?readSession(context).search:'';
    const registered=services.listMembers(ctx,{search,departmentKey:dept==='NONE'?'ALL':dept,status}).filter(member=>dept!=='NONE'||member.departmentKey===null);
    return members.getClubMembersPayload({members:registered,page,departmentKey:dept,status,search,context,capabilities:caps});
  };
  const memberDetail=async(userId,teamPage=0,navigationToken)=>{
    navigation(navigationToken,'members');
    return members.getClubMemberDetailPayload({member:currentMember(userId),discordRoles:rolesFor(await ctx.guild.members.fetch({user:userId,force:true}).catch(()=>null)),teams:await getPersonalTeams(ctx,userId),teamPage,capabilities:caps,navigationToken});
  };
  const requestList=async({own=false,page=0,status='PENDING',departmentKey='ALL'}={})=>{
    if(own)return approvals.getClubMyRequestsPayload({requests:await namedRequests(services.listRequests(ctx,{own:true}),page),page});
    requireCap(caps,'approvalReview');
    const requests=services.listRequests(ctx,{status}).filter(request=>departmentKey==='ALL'||request.departmentKey===departmentKey);
    return approvals.getClubApprovalCenterPayload({requests:await namedRequests(requests,page),page,status,departmentKey});
  };
  const requestDetail=async(id,own,navigationToken)=>{
    navigation(navigationToken,'requests',own);
    const request=services.getRequest(ctx,id);
    if(own&&request.userId!==ctx.actor.id)deny();
    const canResolve=!own&&requestScope(request);
    const names=await resolveMemberNames(ctx.guild,[request.userId,...(request.resolvedBy?[request.resolvedBy]:[])]);
    return approvals.getClubRequestDetailPayload({request,requesterName:names[request.userId],resolverName:names[request.resolvedBy],own,canResolve,navigationToken});
  };
  // Modal openings must be acknowledged with showModal immediately.
  if(action==='request_reject') {
    navigation(b,'requests',false);
    const request=services.getRequest(ctx,a);
    if(!requestScope(request)||request.status!=='PENDING')deny();
    return interaction.showModal(approvals.createClubRejectRequestModal(a,b));
  }
  if(action==='member_search') return interaction.showModal(members.createClubMemberSearchModal(a||'0'));
  let payload;
  switch(action) {
    case 'profile': payload=club.getClubProfilePayload({user:interaction.user,member:ctx.actor,record:services.getMember(ctx),discordRoles:rolesFor(ctx.actor),teams:await getPersonalTeams(ctx)});break;
    case 'my_teams': payload=club.getClubMyTeamsPayload({teams:await getPersonalTeams(ctx),page:a});break;
    case 'home': payload=getHubPayload(interaction.user,ctx.actor,caps);break;
    case 'members': payload=memberList(a,b,c,d);break;
    case 'members_return': {
      const state=navigation(a,'members');previews.cancel(ctx,'member');
      payload=memberList(state.page,state.departmentKey,state.status,state.searchContext);break;
    }
    case 'member_search_submit': {
      const search=interaction.fields.getTextInputValue('search').trim().slice(0,100);
      const token=search?sessions.put(ctx,{search}):'0';payload=memberList(0,'ALL','ALL',token);break;
    }
    case 'member_filter_dept': payload=memberList(0,value,b||'ALL',a||'0');break;
    case 'member_filter_status': payload=memberList(0,b||'ALL',value,a||'0');break;
    case 'member_open': {
      const legacyContext=parsed.params.length===1&&Number.isNaN(Number(a));
      const token=sessions.put(ctx,{kind:'members',page:legacyContext?0:a||0,departmentKey:b||'ALL',status:c||'ALL',searchContext:legacyContext?a:d||'0'});
      payload=await memberDetail(value,0,token);break;
    }
    case 'member_detail': previews.cancel(ctx,'member',a);payload=await memberDetail(a,b,c);break;
    case 'member_register': requireMember();navigation(a,'members');previews.cancel(ctx,'member');payload=members.getClubMemberEditorPayload({navigationToken:a});break;
    case 'member_register_user': {
      requireMember(); const existing=services.getMember(ctx,value);
      navigation(a,'members');payload=existing?await memberDetail(value,0,a):members.getClubMemberEditorPayload({userId:value,displayName:display(ctx,value),status:'ACTIVE',navigationToken:a});break;
    }
    case 'member_transfer': {
      requireMember();navigation(b,'members');const record=currentMember(a);payload=members.getClubMemberEditorPayload({...record,userId:a,navigationToken:b});break;
    }
    case 'member_set_dept': requireMember();payload=memberPreview(a,statusValue(value),b||'ACTIVE',c);break;
    case 'member_archive': case 'member_reactivate': {
      requireMember();const record=currentMember(a);payload=memberPreview(a,record.departmentKey,action==='member_archive'?'ARCHIVED':'ACTIVE',b);break;
    }
    case 'member_confirm': {
      requireMember();const record=services.getMember(ctx,a),departmentKey=statusValue(b);
      navigation(d,'members');
      previews.verify(ctx,'member',a,{userId:a,departmentKey,status:c,version:record?.updatedAt||null,roleBindings:roleBindings()});
      if(record)await services.updateMembership(ctx,{userId:a,departmentKey,status:c,confirmed:true});
      else await services.registerMember(ctx,{userId:a,departmentKey,confirmed:true});
      payload=await memberDetail(a,0,d);break;
    }
    case 'departments': payload=departments.getClubDepartmentsPayload({departments:services.listDepartments(ctx)});break;
    case 'department_members': payload=memberList(0,a,'ACTIVE','0');break;
    case 'department_open': case 'department': {
      const key=action==='department_open'?value:a,department=services.listDepartments(ctx).find(item=>item.key===key);if(!department)deny();
      payload=departments.getClubDepartmentDetailPayload({department,members:services.listMembers(ctx,{departmentKey:key,status:'ACTIVE'}),page:action==='department_open'?0:b||0,capabilities:caps});break;
    }
    case 'department_manage': {
      previews.cancel(ctx,'leadership');
      if(!departmentAccess(caps,a))deny();const department=services.listDepartments(ctx).find(item=>item.key===a);if(!department)deny();
      payload=departments.getClubDepartmentManagePayload({department,capabilities:caps});break;
    }
    case 'leadership_pick': case 'leadership_review': {
      requireCap(caps,'clubManage');const userId=value||b,department=services.listDepartments(ctx).find(item=>item.key===a);if(!department)deny();
      previews.preview(ctx,'leadership',`${a}:${userId}`,{roleId:services.getConfig(ctx).trustedRoleIds[a]||null});
      payload=departments.getClubDepartmentManagePayload({department,capabilities:caps,userId,displayName:display(ctx,userId),confirm:true});break;
    }
    case 'leadership_confirm': {
      requireCap(caps,'clubManage');previews.verify(ctx,'leadership',`${a}:${b}`,{roleId:services.getConfig(ctx).trustedRoleIds[a]||null});
      await services.appointLeadership(ctx,{userId:b,roleKey:a,confirmed:true});payload=notice();break;
    }
    case 'request_department': payload=departments.getClubDepartmentRequestPayload({departmentKey:a==='NONE'?undefined:a,currentDepartmentKey:services.getMember(ctx)?.departmentKey});break;
    case 'request_choose': payload=departments.getClubDepartmentRequestPayload({departmentKey:value,currentDepartmentKey:services.getMember(ctx)?.departmentKey});break;
    case 'request_submit': await services.submitRequest(ctx,{departmentKey:value||a});payload=await requestList({own:true});break;
    case 'my_requests': payload=await requestList({own:true,page:a});break;
    case 'request_open': {
      const own=a==='own',token=sessions.put(ctx,{kind:'requests',own,page:b||0,status:c||(own?'ALL':'PENDING'),departmentKey:d||'ALL'});
      payload=await requestDetail(value,own,token);break;
    }
    case 'requests_return': payload=await requestList(navigation(a,'requests'));break;
    case 'request_detail': payload=await requestDetail(a,b==='own',c);break;
    case 'request_cancel': navigation(b,'requests',true);await services.cancelRequest(ctx,a);payload=await requestDetail(a,true,b);break;
    case 'request_approve': navigation(b,'requests',false);await services.resolveRequest(ctx,a,{decision:'APPROVED'});payload=await requestDetail(a,false,b);break;
    case 'reject_submit': navigation(b,'requests',false);await services.resolveRequest(ctx,a,{decision:'REJECTED',reason:interaction.fields.getTextInputValue('reason')});payload=await requestDetail(a,false,b);break;
    case 'approvals': case 'approval_filter_status': case 'approval_filter_dept': {
      requireCap(caps,'approvalReview');const page=action==='approvals'?a:0,status=action==='approval_filter_status'?value:action==='approvals'?(b||'PENDING'):(a||'PENDING'),dept=action==='approval_filter_dept'?value:action==='approvals'?(c||'ALL'):(a||'ALL');
      payload=await requestList({page,status,departmentKey:dept});break;
    }
    case 'overview': {
      requireCap(caps,'approvalReview');const events=listEvents({...ctx,includeArchived:true});
      payload=club.getClubOverviewPayload({overview:{...services.overview(ctx),activeEvents:events.filter(e=>e.status!=='ARCHIVED').length,archivedEvents:events.filter(e=>e.status==='ARCHIVED').length,teamsWithoutMentors:events.filter(e=>e.status!=='ARCHIVED').flatMap(e=>e.teams).filter(t=>!t.mentors.length).length,setupIssueCount:caps.setupManage?(await services.checkSetup(ctx)).issues?.length:undefined}});break;
    }
    case 'setup': requireSetup();previews.cancel(ctx,'repair');payload=club.getClubSetupPayload({report:await services.checkSetup(ctx),page:a});break;
    case 'setup_repair': case 'setup_repair_pick': {
      requireSetup();const record=currentMember(value||a);previews.preview(ctx,'repair',record.userId,{version:record.updatedAt,roleBindings:roleBindings()});
      payload=club.getClubSetupRepairPayload({member:record,preview:M.repair});break;
    }
    case 'setup_repair_confirm': {
      requireSetup();const record=currentMember(a);previews.verify(ctx,'repair',a,{version:record.updatedAt,roleBindings:roleBindings()});await services.repairMembership(ctx,{userId:a,confirmed:true});payload=club.getClubSetupPayload({report:await services.checkSetup(ctx)});break;
    }
    case 'role_bindings': requireSetup();previews.cancel(ctx,'binding');payload=club.getClubRoleBindingsPayload({config:services.getConfig(ctx)});break;
    case 'role_bind_target': {
      requireSetup();const [kind,key]=String(value).split('|');bindingTarget(kind,key);payload=club.getClubRoleBindingsPayload({config:services.getConfig(ctx),kind,key});break;
    }
    case 'role_bind_pick': {
      requireSetup();bindingTarget(a,b);const config=services.getConfig(ctx),role=await ctx.guild.roles.fetch(value);if(!role)deny();
      const prior=a==='coreRoleId'?config.coreRoleId:config[a]?.[b];
      previews.preview(ctx,'binding',`${a}:${b}:${value}`,{prior:prior||null});
      payload=club.getClubRoleBindingsPayload({config,kind:a,key:b,roleId:value,roleName:role.name,preview:true});break;
    }
    case 'role_bind_confirm': {
      requireSetup();bindingTarget(a,b);const config=services.getConfig(ctx),prior=a==='coreRoleId'?config.coreRoleId:config[a]?.[b];
      previews.verify(ctx,'binding',`${a}:${b}:${c}`,{prior:prior||null});
      if(!['trustedRoleIds','departmentRoleIds','coreRoleId'].includes(a))deny();
      await services.bindRoles(ctx,{...(a==='coreRoleId'?{coreRoleId:c}:{[a]:{[b]:c}}),confirmed:true});
      payload=club.getClubRoleBindingsPayload({config:services.getConfig(ctx)});break;
    }
    default: {const error=new Error('Expired screen');error.code='SESSION_EXPIRED';throw error;}
  }
  return respond(interaction,payload);
}
