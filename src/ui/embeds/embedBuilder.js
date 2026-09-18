import { EmbedBuilder } from 'discord.js';
import { GOOGLE_COLORS, STATUS_COLORS, resolveColor } from '../../config/colors.js';
import { getTeamColor } from '../../config/teams.js';
import { EMOJIS } from '../../config/emojis.js';
import { COMMON_MESSAGES } from '../../messages/common.js';
import { ERROR_MESSAGES } from '../../messages/errors.js';

const DEFAULT_FOOTER_TEXT = 'GDG Ghardaia • Google Developer Groups';

/**
 * Creates a base EmbedBuilder with standard GDG Ghardaia styling.
 */
function createBaseEmbed({ color = GOOGLE_COLORS.BLUE, footerText = DEFAULT_FOOTER_TEXT, footerIconUrl } = {}) {
  const embed = new EmbedBuilder()
    .setColor(resolveColor(color))
    .setTimestamp();

  if (footerText) {
    embed.setFooter({
      text: footerText,
      iconURL: footerIconUrl || undefined,
    });
  }

  return embed;
}

// ==========================================
// 1. Standard Embed
// ==========================================

export function createStandardEmbed({
  title,
  description,
  color = GOOGLE_COLORS.BLUE,
  fields = [],
  footerText,
  footerIconUrl,
  thumbnail,
  url,
} = {}) {
  const embed = createBaseEmbed({ color, footerText, footerIconUrl });

  if (title) embed.setTitle(title);
  if (description) embed.setDescription(description);
  if (thumbnail) embed.setThumbnail(thumbnail);
  if (url) embed.setURL(url);
  if (fields.length > 0) embed.addFields(fields);

  return embed;
}

// ==========================================
// 2. Profile Embed
// ==========================================

export function createProfileEmbed({
  user,
  member,
  fields = [],
  color = GOOGLE_COLORS.BLUE,
  footerText = 'GDG Ghardaia • Member Profile',
} = {}) {
  const displayName = member?.displayName || user?.displayName || user?.username || 'Member';
  const avatarUrl = user?.displayAvatarURL?.({ dynamic: true, size: 256 });

  const embed = createBaseEmbed({ color, footerText })
    .setTitle(`${EMOJIS.PROFILE} Profile: ${displayName}`);

  if (avatarUrl) {
    embed.setThumbnail(avatarUrl);
  }

  const defaultFields = [];

  if (user?.tag) {
    defaultFields.push({
      name: '🆔 Username / Tag',
      value: `\`${user.tag}\``,
      inline: true,
    });
  }

  if (member?.joinedAt) {
    const joinedAt = member.joinedAt.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    defaultFields.push({
      name: '📅 Joined Server',
      value: joinedAt,
      inline: true,
    });
  }

  if (member?.roles?.cache) {
    const roles = member.roles.cache
      .filter((r) => r.id !== member.guild?.id)
      .map((r) => r.name)
      .slice(0, 10)
      .join(', ');

    defaultFields.push({
      name: '🎖️ Roles',
      value: roles || 'No special roles',
      inline: false,
    });
  }

  embed.addFields([...defaultFields, ...fields]);

  return embed;
}

// ==========================================
// 3. List Embed
// ==========================================

export function createListEmbed({
  title,
  description,
  items = [],
  page,
  totalPages,
  color = GOOGLE_COLORS.BLUE,
  teamKey,
  emptyMessage = COMMON_MESSAGES.EMPTY,
} = {}) {
  const finalColor = teamKey ? getTeamColor(teamKey, color) : color;
  const embed = createBaseEmbed({ color: finalColor });

  let pageTitle = title;
  if (page && totalPages && totalPages > 1) {
    pageTitle = `${title} (${page}/${totalPages})`;
  }
  if (pageTitle) embed.setTitle(pageTitle);

  if (items.length === 0) {
    embed.setDescription(description ? `${description}\n\n*${emptyMessage}*` : `*${emptyMessage}*`);
    return embed;
  }

  let body = description ? `${description}\n\n` : '';
  body += items
    .map((item, idx) => {
      if (typeof item === 'string') {
        return `• ${item}`;
      }
      const prefix = item.emoji ? `${item.emoji} ` : '• ';
      const name = item.name || item.title || `Item ${idx + 1}`;
      const desc = item.value || item.description ? ` — ${item.value || item.description}` : '';
      return `${prefix}**${name}**${desc}`;
    })
    .join('\n');

  embed.setDescription(body);
  return embed;
}

// ==========================================
// 4. Detail Embed
// ==========================================

export function createDetailEmbed({
  title,
  description,
  fields = [],
  color = GOOGLE_COLORS.BLUE,
  teamKey,
  thumbnail,
  footerText = 'GDG Ghardaia • Details',
} = {}) {
  const finalColor = teamKey ? getTeamColor(teamKey, color) : color;
  const embed = createBaseEmbed({ color: finalColor, footerText });

  if (title) embed.setTitle(title);
  if (description) embed.setDescription(description);
  if (thumbnail) embed.setThumbnail(thumbnail);
  if (fields.length > 0) embed.addFields(fields);

  return embed;
}

// ==========================================
// 5. Success Embed
// ==========================================

export function createSuccessEmbed({
  title = 'Operation Successful',
  description = COMMON_MESSAGES.ACTION_SUCCESS,
  fields = [],
} = {}) {
  const embed = createBaseEmbed({
    color: STATUS_COLORS.SUCCESS,
    footerText: 'GDG Ghardaia • Success',
  })
    .setTitle(`${EMOJIS.SUCCESS} ${title}`)
    .setDescription(description);

  if (fields.length > 0) embed.addFields(fields);
  return embed;
}

// ==========================================
// 6. Warning Embed
// ==========================================

export function createWarningEmbed({
  title = 'Warning',
  description,
  fields = [],
} = {}) {
  const embed = createBaseEmbed({
    color: STATUS_COLORS.WARNING,
    footerText: 'GDG Ghardaia • Warning',
  })
    .setTitle(`${EMOJIS.WARNING} ${title}`);

  if (description) embed.setDescription(description);
  if (fields.length > 0) embed.addFields(fields);
  return embed;
}

// ==========================================
// 7. Error Embed
// ==========================================

export function createErrorEmbed({
  title = 'Error Encountered',
  description = ERROR_MESSAGES.UNEXPECTED_ERROR,
  fields = [],
} = {}) {
  const embed = createBaseEmbed({
    color: STATUS_COLORS.ERROR,
    footerText: 'GDG Ghardaia • Notice',
  })
    .setTitle(`${EMOJIS.ERROR} ${title}`)
    .setDescription(description);

  if (fields.length > 0) embed.addFields(fields);
  return embed;
}

// ==========================================
// 8. Empty Embed
// ==========================================

export function createEmptyEmbed({
  title = 'No Data Found',
  message = COMMON_MESSAGES.EMPTY,
  color = GOOGLE_COLORS.GREY,
} = {}) {
  return createBaseEmbed({
    color,
    footerText: 'GDG Ghardaia • Empty State',
  })
    .setTitle(`${EMOJIS.EMPTY} ${title}`)
    .setDescription(message);
}

// ==========================================
// 9. Loading Embed
// ==========================================

export function createLoadingEmbed({
  title = 'Processing Request',
  message = COMMON_MESSAGES.LOADING,
  color = GOOGLE_COLORS.BLUE,
} = {}) {
  return createBaseEmbed({
    color,
    footerText: 'GDG Ghardaia • Please Wait',
  })
    .setTitle(`${EMOJIS.LOADING} ${title}`)
    .setDescription(message);
}
