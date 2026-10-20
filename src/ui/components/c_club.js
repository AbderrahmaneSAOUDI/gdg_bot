import { escapeMarkdown } from 'discord.js';
import { CLUB_UI, CLUB_LABELS, clubId } from '../../config/cfg_club.js';
import { CUSTOM_IDS } from '../../config/cfg_customIds.js';
import { BUTTON_LABELS } from '../../config/cfg_labels.js';
import { GOOGLE_COLORS } from '../../config/cfg_colors.js';
import { getTeam } from '../../config/cfg_teams.js';
import { CLUB_MESSAGES as M } from '../../messages/msg_club.js';
import { createStandardEmbed } from '../embeds/c_embedBuilder.js';
import { createActionRows } from './c_actionRows.js';
import { createPrimaryButton, createSecondaryButton, createSuccessButton, createDangerButton, createHomeButton, createCloseButton, createBackButton, createRefreshButton, createNextButton, createPreviousButton } from './c_buttons.js';
import { createOptionSelectMenu } from './c_selectMenus.js';

/** User supplied text is escaped, bounded, and cannot emit mention syntax. */
export function clubText(value, max = 300) {
  const normalized = String(value ?? '').replace(/<(@[!&]?|#)\d+>/g, M.UNKNOWN)
    .replace(/@/g, '@\u200b').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
  const escaped = escapeMarkdown(normalized);
  return escaped.length > max ? `${escaped.slice(0, Math.max(0, max - 1))}…` : escaped;
}

export function clubPage(items = [], requestedPage = 0, size = CLUB_UI.PAGE_SIZE) {
  const pages = Math.max(1, Math.ceil(items.length / size));
  const candidate = Number(requestedPage);
  const page = Math.max(0, Math.min(pages - 1, Number.isSafeInteger(candidate) ? candidate : 0));
  return { page, pages, total: items.length, items: items.slice(page * size, (page + 1) * size) };
}

export function clubDepartment(key) { return getTeam(key)?.name || CLUB_LABELS.NO_DEPARTMENT; }
export function clubName(member) { return clubText(member?.displayName || member?.name || M.UNKNOWN_USER(member?.userId || member?.id || '?'), 90); }
export function clubDate(value) {
  const date = new Date(value);
  return value && Number.isFinite(date.getTime()) ? date.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC') : M.UNKNOWN;
}
export function clubStatus(status) { return CLUB_LABELS[String(status || '').toUpperCase()] || clubText(status || M.UNKNOWN, 40); }

export function clubButton(action, label, params = [], variant = 'secondary') {
  const factory = { primary: createPrimaryButton, success: createSuccessButton, danger: createDangerButton, secondary: createSecondaryButton }[variant] || createSecondaryButton;
  return factory({ customId: clubId(action, ...params), label });
}

export function clubNav({ backAction, backParams = [], refreshAction, refreshParams = [] } = {}) {
  return [
    backAction ? createBackButton({ customId: clubId(backAction, ...backParams) }) : null,
    createHomeButton({ customId: CUSTOM_IDS.HUB_MAIN }),
    refreshAction ? createRefreshButton({ customId: clubId(refreshAction, ...refreshParams) }) : null,
    createCloseButton(),
  ].filter(Boolean);
}

export function clubPager(page, action, params = []) {
  if (page.pages <= 1) return [];
  return [
    createPreviousButton({ customId: clubId(action, Math.max(0, page.page - 1), ...params), disabled: page.page === 0 }),
    createNextButton({ customId: clubId(action, Math.min(page.pages - 1, page.page + 1), ...params), disabled: page.page === page.pages - 1 }),
  ];
}

export function clubSelect(action, placeholder, options, params = []) {
  if (!options.length) return null;
  if (options.length > 25) throw new Error('Club select options must be paginated');
  return createOptionSelectMenu({ customId: clubId(action, ...params), placeholder, options: options.map((option) => ({ ...option, label: clubText(option.label, 100), description: option.description ? clubText(option.description, 100) : undefined })) });
}

/** Cap embeds below Discord's combined 6000-character limit and rows below five. */
export function clubPayload({ title, description, fields = [], components = [], color = GOOGLE_COLORS.BLUE, footerText = M.FOOTER, thumbnail } = {}) {
  const boundedTitle = clubText(title || M.NOTICE, 256);
  const boundedDescription = String(description || '').slice(0, 3000);
  let remaining = 5600 - boundedTitle.length - boundedDescription.length - footerText.length;
  const boundedFields = [];
  for (const field of fields.slice(0, 25)) {
    const name = clubText(field.name, 100);
    if (remaining <= name.length + 1) break;
    const value = String(field.value || M.NONE).slice(0, Math.min(1024, remaining - name.length));
    boundedFields.push({ name, value, inline: Boolean(field.inline) });
    remaining -= name.length + value.length;
  }
  const rows = createActionRows(...components);
  if (rows.length > 5) throw new Error('Club view exceeds Discord action row limits');
  return { embeds: [createStandardEmbed({ title: boundedTitle, description: boundedDescription || undefined, fields: boundedFields, color, footerText, thumbnail })], components: rows, allowedMentions: { parse: [] } };
}

export { clubId, CLUB_LABELS, CLUB_UI, BUTTON_LABELS };
