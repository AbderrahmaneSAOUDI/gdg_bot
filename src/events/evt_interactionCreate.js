import path from 'node:path';
import { Events } from 'discord.js';
import { parseCustomId } from '../config/cfg_customIds.js';
import { getHubPayload, getKnowledgePayload } from '../ui/view_hub.js';
import { getClubNoticePayload } from '../ui/view_club.js';
import { clubServices } from '../features/srv_club.js';
import { handleClubInteraction } from '../features/srv_clubInteractions.js';
import { handleEventInteraction } from '../features/srv_eventInteractions.js';
import { extractServerData } from '../features/srv_extractor.js';
import { EXTRACTOR_MESSAGES } from '../messages/msg_extractor.js';
import { INTERACTION_MESSAGES, INTERACTION_ERRORS } from '../messages/msg_interactions.js';
import { acknowledge, respond, interactionContext, reportInteractionError } from '../utils/f_interactionResponse.js';

export const name = Events.InteractionCreate;
export const once = false;

/** Small dispatcher. Each feature owns its own interaction workflow. */
export function createInteractionHandler({services=clubServices,clubHandler=handleClubInteraction,eventHandler=handleEventInteraction}={}) {
  return async function handle(interaction) {
    try {
      if(interaction.isChatInputCommand?.()) {
        const command=interaction.client.commands.get(interaction.commandName);
        if(command)await command.execute(interaction);
        return;
      }
      const parsed=parseCustomId(interaction.customId);
      if(!parsed.isBotCustomId)return;
      const ctx=interactionContext(interaction),caps=services.capabilities(ctx);
      if(parsed.namespace==='club')return await clubHandler(interaction,parsed,{services});
      if(parsed.namespace==='em')return await eventHandler(interaction,parsed,{club:services});
      if(parsed.namespace==='hub'&&parsed.action==='profile')return await clubHandler(interaction,{...parsed,namespace:'club',action:'profile',params:[]},{services});
      if(parsed.namespace==='hub'&&parsed.action==='events')return await eventHandler(interaction,{...parsed,namespace:'em',action:'list',params:['active','0']},{club:services});
      // Previously sent navigation remains usable; mutations require fresh feature screens.
      if(parsed.namespace==='event'&&['detail','select'].includes(parsed.action))return await eventHandler(interaction,{...parsed,namespace:'em',action:'detail',params:[interaction.values?.[0]||parsed.params[0]]},{club:services});
      if(parsed.namespace==='team'&&parsed.action==='view')return await eventHandler(interaction,{...parsed,namespace:'em',action:'teams',params:[parsed.params[0],Math.max(0,Number(parsed.params[1]||1)-1)]},{club:services});
      if(parsed.namespace==='mentor'&&parsed.action==='view')return await eventHandler(interaction,{...parsed,namespace:'em',action:'mentors',params:[parsed.params[0],0]},{club:services});
      await acknowledge(interaction);
      if(parsed.namespace==='nav'&&parsed.action==='close')return await respond(interaction,{content:INTERACTION_MESSAGES.closed,embeds:[],components:[]});
      if((parsed.namespace==='hub'&&parsed.action==='main')||parsed.namespace==='nav')return await respond(interaction,getHubPayload(interaction.user,ctx.actor,caps));
      if(parsed.namespace==='hub'&&parsed.action==='knowledge')return await respond(interaction,getKnowledgePayload(interaction.user,ctx.actor));
      if(parsed.namespace==='hub'&&parsed.action==='extract_server') {
        if(!caps.administrator){const err=new Error('Forbidden');err.code='FORBIDDEN';throw err;}
        const stats=await extractServerData({guild:ctx.guild,outputDir:path.resolve(process.cwd(),'server_data')});
        return await respond(interaction,getClubNoticePayload({title:EXTRACTOR_MESSAGES.SUCCESS_TITLE,message:EXTRACTOR_MESSAGES.SUCCESS_DESC(stats)}));
      }
      return await respond(interaction,getClubNoticePayload({message:INTERACTION_ERRORS.SESSION_EXPIRED}));
    } catch(error) { await reportInteractionError(interaction,error); }
  };
}
export const execute=createInteractionHandler();
