import test from 'node:test';
import assert from 'node:assert/strict';
import { ButtonStyle, TextInputStyle, ComponentType } from 'discord.js';

import {
  GOOGLE_COLORS,
  GOOGLE_HEX_COLORS,
  STATUS_COLORS,
  resolveColor,
  teams,
  getTeam,
  getTeamColor,
  isValidTeam,
  getAllTeams,
  EMOJIS,
  BUTTON_LABELS,
  SELECT_LABELS,
  CUSTOM_IDS,
  buildCustomId,
  parseCustomId,
} from '../src/config/index.js';

import {
  COMMON_MESSAGES,
  ERROR_MESSAGES,
  CONFIRMATION_MESSAGES,
  DASHBOARD_MESSAGES,
} from '../src/messages/index.js';

import {
  createPrimaryButton,
  createSecondaryButton,
  createSuccessButton,
  createDangerButton,
  createLinkButton,
  createBackButton,
  createHomeButton,
  createCloseButton,
  createCancelButton,
  createConfirmButton,
  createSaveButton,
  createEditButton,
  createDeleteButton,
  createCreateButton,
  createRefreshButton,
  createNextButton,
  createPreviousButton,
  createViewButton,
  createOpenButton,
  createOptionSelectMenu,
  createMemberSelectMenu,
  createRoleSelectMenu,
  createTeamSelectMenu,
  createActivitySelectMenu,
  createCategorySelectMenu,
  createModal,
  createShortTextInput,
  createLongTextInput,
  createUrlInput,
  createDateInput,
  createTimeInput,
  createNumberInput,
  createPaginationActionRow,
  createPaginatedPayload,
  createConfirmationActionRow,
  createConfirmationPayload,
  createActionRows,
  createStandardEmbed,
  createProfileEmbed,
  createListEmbed,
  createDetailEmbed,
  createSuccessEmbed,
  createWarningEmbed,
  createErrorEmbed,
  createEmptyEmbed,
  createLoadingEmbed,
  createNavigationRow,
  formatBreadcrumb,
  getHubPayload,
  getPersistentHubPayload,
} from '../src/ui/index.js';

test('1. Colors & Design Tokens', async (t) => {
  await t.test('Google Brand colors are defined as integers', () => {
    assert.equal(GOOGLE_COLORS.BLUE, 0x4285f4);
    assert.equal(GOOGLE_COLORS.RED, 0xea4335);
    assert.equal(GOOGLE_COLORS.YELLOW, 0xfbbc04);
    assert.equal(GOOGLE_COLORS.GREEN, 0x34a853);
    assert.equal(GOOGLE_COLORS.DARK, 0x202124);
  });

  await t.test('Status colors map to Google Brand Palette', () => {
    assert.equal(STATUS_COLORS.SUCCESS, GOOGLE_COLORS.GREEN);
    assert.equal(STATUS_COLORS.ERROR, GOOGLE_COLORS.RED);
    assert.equal(STATUS_COLORS.WARNING, GOOGLE_COLORS.YELLOW);
    assert.equal(STATUS_COLORS.INFO, GOOGLE_COLORS.BLUE);
  });

  await t.test('resolveColor resolves hex strings, numbers, and fallbacks', () => {
    assert.equal(resolveColor('#4285F4'), 0x4285f4);
    assert.equal(resolveColor('34a853'), 0x34a853);
    assert.equal(resolveColor(0xea4335), 0xea4335);
    assert.equal(resolveColor('invalid_hex', GOOGLE_COLORS.BLUE), GOOGLE_COLORS.BLUE);
  });
});

test('2. Team Colors Configuration', async (t) => {
  await t.test('teams object contains required GDG squads with hex colors', () => {
    assert.ok(teams.TECH);
    assert.ok(teams.TECH.name);
    assert.ok(teams.TECH.color.startsWith('#'));
    assert.equal(isValidTeam('tech'), true);
    assert.equal(isValidTeam('UNKNOWN_SQUAD'), false);
  });

  await t.test('getTeamColor returns integer color for valid team', () => {
    const color = getTeamColor('TECH');
    assert.equal(typeof color, 'number');
  });

  await t.test('getAllTeams returns array of teams', () => {
    const all = getAllTeams();
    assert.ok(Array.isArray(all));
    assert.ok(all.length >= 5);
  });
});

test('3. Emojis, Labels & Custom IDs', async (t) => {
  await t.test('Centralized emojis are defined', () => {
    assert.ok(EMOJIS.HOME);
    assert.ok(EMOJIS.PROFILE);
    assert.ok(EMOJIS.TEAM);
    assert.ok(EMOJIS.SUCCESS);
    assert.ok(EMOJIS.ERROR);
  });

  await t.test('Button labels are defined', () => {
    assert.equal(BUTTON_LABELS.BACK, 'Back');
    assert.equal(BUTTON_LABELS.HOME, 'Home');
    assert.equal(BUTTON_LABELS.CONFIRM, 'Confirm');
    assert.equal(BUTTON_LABELS.CANCEL, 'Cancel');
  });

  await t.test('Custom ID builder and parser follow naming convention', () => {
    const id = buildCustomId('team', 'view', 'tech');
    assert.equal(id, 'bot:team:view:tech');

    const parsed = parseCustomId(id);
    assert.equal(parsed.prefix, 'bot');
    assert.equal(parsed.namespace, 'team');
    assert.equal(parsed.action, 'view');
    assert.deepEqual(parsed.params, ['tech']);
    assert.equal(parsed.isBotCustomId, true);
  });
});

test('4. Centralized Messages', async (t) => {
  await t.test('Common, error, confirmation and dashboard messages exist', () => {
    assert.equal(COMMON_MESSAGES.LOADING, 'Loading...');
    assert.equal(COMMON_MESSAGES.EMPTY, 'Nothing to show here yet.');
    assert.ok(ERROR_MESSAGES.PERMISSION_DENIED);
    assert.ok(CONFIRMATION_MESSAGES.DESTRUCTIVE_DESCRIPTION);
    assert.ok(DASHBOARD_MESSAGES.HUB_TITLE);
  });
});

test('5. Reusable Button Components', async (t) => {
  await t.test('Variants produce valid Discord button JSON', () => {
    const primary = createPrimaryButton({ customId: 'test:primary', label: 'Primary' }).toJSON();
    assert.equal(primary.style, ButtonStyle.Primary);
    assert.equal(primary.custom_id, 'test:primary');
    assert.equal(primary.label, 'Primary');

    const link = createLinkButton({ url: 'https://example.com', label: 'Link' }).toJSON();
    assert.equal(link.style, ButtonStyle.Link);
    assert.equal(link.url, 'https://example.com');
  });

  await t.test('Common action buttons have consistent defaults', () => {
    const backBtn = createBackButton().toJSON();
    assert.equal(backBtn.style, ButtonStyle.Secondary);
    assert.equal(backBtn.custom_id, CUSTOM_IDS.NAV_BACK);
    assert.equal(backBtn.label, BUTTON_LABELS.BACK);

    const deleteBtn = createDeleteButton({ customId: 'bot:item:delete:1' }).toJSON();
    assert.equal(deleteBtn.style, ButtonStyle.Danger);
    assert.equal(deleteBtn.label, BUTTON_LABELS.DELETE);

    const confirmDestructive = createConfirmButton({ isDestructive: true }).toJSON();
    assert.equal(confirmDestructive.style, ButtonStyle.Danger);

    const confirmNormal = createConfirmButton({ isDestructive: false }).toJSON();
    assert.equal(confirmNormal.style, ButtonStyle.Success);
  });
});

test('6. Reusable Select Menus', async (t) => {
  await t.test('Option select menu generates valid JSON', () => {
    const menu = createOptionSelectMenu({
      customId: 'bot:test:menu',
      placeholder: 'Choose one',
      options: [
        { label: 'Option A', value: 'a' },
        { label: 'Option B', value: 'b' },
      ],
    }).toJSON();

    assert.equal(menu.custom_id, 'bot:test:menu');
    assert.equal(menu.placeholder, 'Choose one');
    assert.equal(menu.options.length, 2);
  });

  await t.test('User and Role select menus generate valid JSON', () => {
    const userMenu = createMemberSelectMenu({ customId: 'bot:select:member' }).toJSON();
    assert.equal(userMenu.type, ComponentType.UserSelect);

    const roleMenu = createRoleSelectMenu({ customId: 'bot:select:role' }).toJSON();
    assert.equal(roleMenu.type, ComponentType.RoleSelect);
  });

  await t.test('Team select menu populates configured squads', () => {
    const teamMenu = createTeamSelectMenu({ customId: 'bot:select:team' }).toJSON();
    assert.ok(teamMenu.options.length >= 5);
    assert.ok(teamMenu.options.some((o) => o.value === 'TECH'));
  });
});

test('7. Reusable Modals & Text Inputs', async (t) => {
  await t.test('Modal wraps inputs in ActionRows automatically', () => {
    const shortInput = createShortTextInput({ customId: 'name', label: 'Name' });
    const longInput = createLongTextInput({ customId: 'bio', label: 'Bio' });
    const modal = createModal({
      customId: 'bot:modal:create_profile',
      title: 'Create Profile',
      inputs: [shortInput, longInput],
    }).toJSON();

    assert.equal(modal.custom_id, 'bot:modal:create_profile');
    assert.equal(modal.title, 'Create Profile');
    assert.equal(modal.components.length, 2);
    assert.equal(modal.components[0].components[0].custom_id, 'name');
    assert.equal(modal.components[1].components[0].custom_id, 'bio');
  });

  await t.test('Specialized text inputs (URL, Date, Time, Number)', () => {
    const urlInput = createUrlInput({ customId: 'url' }).toJSON();
    assert.equal(urlInput.style, TextInputStyle.Short);

    const dateInput = createDateInput({ customId: 'date' }).toJSON();
    assert.equal(dateInput.min_length, 10);
    assert.equal(dateInput.max_length, 10);

    const timeInput = createTimeInput({ customId: 'time' }).toJSON();
    assert.equal(timeInput.min_length, 5);

    const numberInput = createNumberInput({ customId: 'count' }).toJSON();
    assert.equal(numberInput.style, TextInputStyle.Short);
  });
});

test('8. Reusable Pagination & Confirmation', async (t) => {
  await t.test('Pagination row disables previous on first page', () => {
    const row = createPaginationActionRow({
      currentPage: 1,
      totalPages: 3,
      customIdPrefix: 'bot:page:items',
    }).toJSON();

    // Components: Previous, Indicator, Next, Close
    assert.equal(row.components[0].disabled, true);
    assert.equal(row.components[1].label, 'Page 1 of 3');
    assert.equal(row.components[2].disabled, false);
  });

  await t.test('createPaginatedPayload slices items correctly', () => {
    const items = ['Item 1', 'Item 2', 'Item 3', 'Item 4', 'Item 5'];
    const payload = createPaginatedPayload({
      items,
      page: 1,
      pageSize: 2,
      renderEmbed: ({ pageItems, page, totalPages }) =>
        createListEmbed({
          title: 'Items List',
          items: pageItems,
          page,
          totalPages,
        }),
      customIdPrefix: 'bot:page:test',
    });

    assert.equal(payload.embeds.length, 1);
    const json = payload.embeds[0].toJSON();
    assert.ok(json.description.includes('Item 1'));
    assert.ok(json.description.includes('Item 2'));
    assert.ok(!json.description.includes('Item 3'));
  });

  await t.test('Confirmation payload constructs warning embed and action row', () => {
    const payload = createConfirmationPayload({
      title: 'Confirm Deletion',
      description: 'Are you sure?',
      confirmCustomId: 'bot:confirm:yes:123',
      cancelCustomId: 'bot:confirm:no:123',
      isDestructive: true,
    });

    assert.equal(payload.embeds.length, 1);
    assert.equal(payload.components.length, 1);
    assert.equal(payload.embeds[0].toJSON().color, STATUS_COLORS.ERROR);
  });
});

test('9. Embed System Archetypes', async (t) => {
  await t.test('Standard embed builds with Google Blue by default', () => {
    const embed = createStandardEmbed({
      title: 'Informational Notice',
      description: 'Notice content',
    }).toJSON();

    assert.equal(embed.color, GOOGLE_COLORS.BLUE);
    assert.equal(embed.title, 'Informational Notice');
  });

  await t.test('Success embed uses Google Green and success emoji', () => {
    const embed = createSuccessEmbed({ title: 'Task Done' }).toJSON();
    assert.equal(embed.color, STATUS_COLORS.SUCCESS);
    assert.ok(embed.title.includes(EMOJIS.SUCCESS));
  });

  await t.test('Warning embed uses Google Yellow', () => {
    const embed = createWarningEmbed({ title: 'Heads Up' }).toJSON();
    assert.equal(embed.color, STATUS_COLORS.WARNING);
  });

  await t.test('Error embed uses Google Red and safe message', () => {
    const embed = createErrorEmbed({ title: 'Error Occurred' }).toJSON();
    assert.equal(embed.color, STATUS_COLORS.ERROR);
    assert.ok(embed.description.includes('unexpected error'));
  });

  await t.test('Empty and Loading embeds build properly', () => {
    const emptyEmbed = createEmptyEmbed({ title: 'No Events' }).toJSON();
    assert.ok(emptyEmbed.title.includes(EMOJIS.EMPTY));

    const loadingEmbed = createLoadingEmbed().toJSON();
    assert.ok(loadingEmbed.title.includes(EMOJIS.LOADING));
  });
});

test('10. ActionRows Chunking and Navigation', async (t) => {
  await t.test('createActionRows chunks more than 5 buttons into multiple rows', () => {
    const buttons = [1, 2, 3, 4, 5, 6, 7].map((n) =>
      createPrimaryButton({ customId: `btn:${n}`, label: `Btn ${n}` })
    );

    const rows = createActionRows(...buttons);
    assert.equal(rows.length, 2);
    assert.equal(rows[0].components.length, 5);
    assert.equal(rows[1].components.length, 2);
  });

  await t.test('createNavigationRow constructs standard Back, Home, Close controls', () => {
    const navRow = createNavigationRow().toJSON();
    assert.equal(navRow.components.length, 3);
    assert.equal(navRow.components[0].custom_id, CUSTOM_IDS.NAV_BACK);
    assert.equal(navRow.components[1].custom_id, CUSTOM_IDS.NAV_HOME);
    assert.equal(navRow.components[2].custom_id, CUSTOM_IDS.NAV_CLOSE);
  });

  await t.test('formatBreadcrumb formats hierarchy correctly', () => {
    const breadcrumb = formatBreadcrumb(['Dashboard', 'My Team', 'Tech Squad']);
    assert.equal(breadcrumb, 'Dashboard › My Team › Tech Squad');
  });
});

test('11. Hub Compatibility', async (t) => {
  await t.test('Hub payloads build without errors', () => {
    const mockUser = {
      username: 'TestUser',
      displayName: 'Test User',
      tag: 'TestUser#0001',
      displayAvatarURL: () => 'https://example.com/avatar.png',
    };
    const mockMember = {
      displayName: 'Test User',
      joinedAt: new Date(),
      roles: { cache: new Map() },
      guild: { iconURL: () => 'https://example.com/icon.png' },
    };

    const hub = getHubPayload(mockUser, mockMember);
    assert.equal(hub.embeds.length, 1);
    assert.equal(hub.components.length, 3);

    const persistent = getPersistentHubPayload();
    assert.equal(persistent.embeds.length, 1);
    assert.equal(persistent.components.length, 2);
  });
});
