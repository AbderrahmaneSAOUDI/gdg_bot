import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { createPreviousButton, createNextButton, createCloseButton } from './buttons.js';
import { buildCustomId, NAMESPACES } from '../../config/customIds.js';

/**
 * Creates a standard pagination ActionRow.
 *
 * Layout: [ ◀️ Previous ] [ Page X/Y ] [ Next ▶️ ] [ ✕ Close ]
 *
 * @param {object} params
 * @param {number} params.currentPage - 1-based page number
 * @param {number} params.totalPages - Total number of pages
 * @param {string} [params.customIdPrefix] - Prefix for pagination custom IDs (e.g. 'bot:page:team')
 * @param {boolean} [params.includeClose=true] - Whether to include the close button
 * @param {boolean} [params.disabled=false] - Whether to disable all controls
 * @returns {ActionRowBuilder}
 */
export function createPaginationActionRow({
  currentPage = 1,
  totalPages = 1,
  customIdPrefix = buildCustomId(NAMESPACES.PAGE, 'list'),
  includeClose = true,
  disabled = false,
}) {
  const isFirstPage = currentPage <= 1;
  const isLastPage = currentPage >= totalPages;

  const prevButton = createPreviousButton({
    customId: `${customIdPrefix}:prev:${currentPage - 1}`,
    disabled: isFirstPage || disabled,
  });

  const indicatorButton = new ButtonBuilder()
    .setCustomId(`${customIdPrefix}:indicator:${currentPage}`)
    .setLabel(`Page ${currentPage} of ${Math.max(1, totalPages)}`)
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(true);

  const nextButton = createNextButton({
    customId: `${customIdPrefix}:next:${currentPage + 1}`,
    disabled: isLastPage || disabled,
  });

  const row = new ActionRowBuilder().addComponents(prevButton, indicatorButton, nextButton);

  if (includeClose) {
    row.addComponents(
      createCloseButton({
        customId: `${customIdPrefix}:close`,
        disabled,
      })
    );
  }

  return row;
}

/**
 * Helper to paginate an array of items and generate a complete message payload.
 *
 * @param {object} params
 * @param {Array<any>} params.items - Full list of items
 * @param {number} [params.page=1] - Requested 1-based page
 * @param {number} [params.pageSize=5] - Items per page
 * @param {Function} params.renderEmbed - Callback (pageItems, page, totalPages) => EmbedBuilder
 * @param {string} [params.customIdPrefix] - Custom ID prefix for pagination buttons
 * @param {ActionRowBuilder} [params.navigationRow] - Optional secondary navigation row
 * @returns {{ embeds: any[], components: ActionRowBuilder[] }}
 */
export function createPaginatedPayload({
  items = [],
  page = 1,
  pageSize = 5,
  renderEmbed,
  customIdPrefix,
  navigationRow,
}) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);

  const startIndex = (currentPage - 1) * pageSize;
  const pageItems = items.slice(startIndex, startIndex + pageSize);

  const embed = renderEmbed({
    pageItems,
    page: currentPage,
    totalPages,
    totalItems: items.length,
  });

  const paginationRow = createPaginationActionRow({
    currentPage,
    totalPages,
    customIdPrefix,
    includeClose: !navigationRow,
  });

  const components = [paginationRow];
  if (navigationRow) {
    components.push(navigationRow);
  }

  return {
    embeds: [embed],
    components,
  };
}
