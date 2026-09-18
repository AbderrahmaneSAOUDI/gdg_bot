import test from 'node:test';
import assert from 'node:assert/strict';
import { ButtonStyle, TextInputStyle, ComponentType } from 'discord.js';

import {
  GOOGLE_COLORS,
  GOOGLE_HEX_COLORS,
  DEPARTMENT_COLORS,
  DEPARTMENT_HEX_COLORS,
  ROLE_COLORS,
  ROLE_HEX_COLORS,
  STATUS_COLORS,
  resolveColor,
  teams,
  CORE_TEAM,
  CLUB_ROLES,
  CLUB_STRUCTURE_ORDER,
  getTeam,
  getTeamColor,
  getRoleColor,
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
  await t.test('Google Brand & theme colors are defined as integers', () => {
    assert.equal(GOOGLE_COLORS.BLUE, 0x4285f4);
    assert.equal(GOOGLE_COLORS.RED, 0xea4335);
    assert.equal(GOOGLE_COLORS.YELLOW, 0xffd427);
    assert.equal(GOOGLE_COLORS.GREEN, 0x34a853);
    assert.equal(GOOGLE_COLORS.PURPLE, 0xa142f4);
    assert.equal(GOOGLE_COLORS.BROWN, 0xa84300);
    assert.equal(GOOGLE_COLORS.DARK, 0x1e1e1e);
    assert.equal(GOOGLE_COLORS.BOT_BLACK, 0x000001);
  });

  await t.test('Status colors map to Google Brand Palette', () => {
    assert.equal(STATUS_COLORS.SUCCESS, GOOGLE_COLORS.GREEN);
    assert.equal(STATUS_COLORS.ERROR, GOOGLE_COLORS.RED);
    assert.equal(STATUS_COLORS.WARNING, GOOGLE_COLORS.YELLOW);
    assert.equal(STATUS_COLORS.INFO, GOOGLE_COLORS.BLUE);
  });

  await t.test('Department and Role color tokens are defined in colors.js', () => {
    assert.equal(DEPARTMENT_COLORS.RELATIONS, GOOGLE_COLORS.YELLOW);
    assert.equal(DEPARTMENT_COLORS.LOGISTICS, GOOGLE_COLORS.BROWN);
    assert.equal(DEPARTMENT_COLORS.MEDIA, GOOGLE_COLORS.BLUE);
    assert.equal(DEPARTMENT_COLORS.DESIGN, GOOGLE_COLORS.GREEN);
    assert.equal(DEPARTMENT_COLORS.DEV, GOOGLE_COLORS.PURPLE);

    assert.equal(DEPARTMENT_HEX_COLORS.RELATIONS, '#FFD427');
    assert.equal(DEPARTMENT_HEX_COLORS.LOGISTICS, '#A84300');
    assert.equal(DEPARTMENT_HEX_COLORS.MEDIA, '#4285F4');
    assert.equal(DEPARTMENT_HEX_COLORS.DESIGN, '#34A853');
    assert.equal(DEPARTMENT_HEX_COLORS.DEV, '#A142F4');

    assert.equal(ROLE_HEX_COLORS.CORE_TEAM, '#EA4335');
    assert.equal(ROLE_HEX_COLORS.MEMBER, '#5F6368');
    assert.equal(ROLE_HEX_COLORS.ALUMNI, '#5F6368');
    assert.equal(ROLE_HEX_COLORS.BOT, '#000001');
  });

  await t.test('resolveColor resolves hex strings, numbers, and fallbacks', () => {
    assert.equal(resolveColor('#4285F4'), 0x4285f4);
    assert.equal(resolveColor('34a853'), 0x34a853);
    assert.equal(resolveColor(0xea4335), 0xea4335);
    assert.equal(resolveColor('invalid_hex', GOOGLE_COLORS.BLUE), GOOGLE_COLORS.BLUE);
  });
});

test('2. Unified Core Team & Club Structure Configuration', async (t) => {
  await t.test('Canonical sort order matches the specified 9-tier structure', () => {
    assert.deepEqual(CLUB_STRUCTURE_ORDER, [
      'President',
      'Vice President',
      'SG',
      'HR',
      'Relations',
      'Logistics',
      'Media',
      'Design',
      'Dev',
    ]);
  });

  await t.test('teams object contains the 5 official departments sorted canonically', () => {
    assert.equal(teams.RELATIONS.color, DEPARTMENT_HEX_COLORS.RELATIONS);
    assert.equal(teams.LOGISTICS.color, DEPARTMENT_HEX_COLORS.LOGISTICS);
    assert.equal(teams.MEDIA.color, DEPARTMENT_HEX_COLORS.MEDIA);
    assert.equal(teams.DESIGN.color, DEPARTMENT_HEX_COLORS.DESIGN);
    assert.equal(teams.DEV.color, DEPARTMENT_HEX_COLORS.DEV);

    assert.equal(isValidTeam('relations'), true);
    assert.equal(isValidTeam('logistics'), true);
    assert.equal(isValidTeam('dev'), true);
    assert.equal(isValidTeam('development'), true);
    assert.equal(isValidTeam('UNKNOWN_SQUAD'), false);
  });

  await t.test('Core team contains all 9 roles unified without separation', () => {
    const coreKeys = Object.keys(CORE_TEAM);
    assert.deepEqual(coreKeys, [
      'PRESIDENT',
      'VICE_PRESIDENT',
      'SG',
      'HR',
      'RELATIONS',
      'LOGISTICS',
      'MEDIA',
      'DESIGN',
      'DEV',
    ]);

    // Executive leadership roles (Red)
    assert.equal(CORE_TEAM.PRESIDENT.color, ROLE_HEX_COLORS.CORE_TEAM);
    assert.equal(CORE_TEAM.VICE_PRESIDENT.color, ROLE_HEX_COLORS.CORE_TEAM);
    assert.equal(CORE_TEAM.SG.color, ROLE_HEX_COLORS.CORE_TEAM);
    assert.equal(CORE_TEAM.HR.color, ROLE_HEX_COLORS.CORE_TEAM);

    // Departments in Core Team take department colors
    assert.equal(CORE_TEAM.RELATIONS.color, DEPARTMENT_HEX_COLORS.RELATIONS);
    assert.equal(CORE_TEAM.LOGISTICS.color, DEPARTMENT_HEX_COLORS.LOGISTICS);
    assert.equal(CORE_TEAM.MEDIA.color, DEPARTMENT_HEX_COLORS.MEDIA);
    assert.equal(CORE_TEAM.DESIGN.color, DEPARTMENT_HEX_COLORS.DESIGN);
    assert.equal(CORE_TEAM.DEV.color, DEPARTMENT_HEX_COLORS.DEV);

    // Co-managers are named Department Co-Managers (never leads)
    assert.equal(CORE_TEAM.RELATIONS.description, 'Relations Department Co-Manager');
    assert.equal(CORE_TEAM.LOGISTICS.description, 'Logistics Department Co-Manager');
    assert.equal(CORE_TEAM.MEDIA.description, 'Media Department Co-Manager');
    assert.equal(CORE_TEAM.DESIGN.description, 'Design Department Co-Manager');
    assert.equal(CORE_TEAM.DEV.description, 'Dev Department Co-Manager');
  });

  await t.test('Other roles use canonical names: MEMBER, ALUMNI, BOT', () => {
    assert.equal(CLUB_ROLES.MEMBER.name, 'Member');
    assert.equal(CLUB_ROLES.MEMBER.color, ROLE_HEX_COLORS.MEMBER);

    assert.equal(CLUB_ROLES.ALUMNI.name, 'Alumni');
    assert.equal(CLUB_ROLES.ALUMNI.color, ROLE_HEX_COLORS.ALUMNI);

    assert.equal(CLUB_ROLES.BOT.name, 'Bot');
    assert.equal(CLUB_ROLES.BOT.color, ROLE_HEX_COLORS.BOT);

    // Strict naming adherence: MEMBER not MEMBER_NO_DEPT, BOT not BOTS_AND_APPS, CORE_TEAM token
    assert.equal(ROLE_COLORS.MEMBER_NO_DEPT, undefined);
    assert.equal(ROLE_COLORS.BOTS_AND_APPS, undefined);
    assert.equal(ROLE_COLORS.CORE_RED, undefined);
    assert.equal(ROLE_COLORS.CORE_TEAM, GOOGLE_COLORS.RED);
    assert.equal(CLUB_ROLES.MEMBER_NO_DEPT, undefined);
    assert.equal(CLUB_ROLES.BOTS_AND_APPS, undefined);
  });

  await t.test('getRoleColor resolves color for roles dynamically', () => {
    assert.equal(getRoleColor('President'), ROLE_HEX_COLORS.CORE_TEAM);
    assert.equal(getRoleColor('Vice President'), ROLE_HEX_COLORS.CORE_TEAM);
    assert.equal(getRoleColor('SG'), ROLE_HEX_COLORS.CORE_TEAM);
    assert.equal(getRoleColor('HR'), ROLE_HEX_COLORS.CORE_TEAM);
    assert.equal(getRoleColor('Relations'), DEPARTMENT_HEX_COLORS.RELATIONS);
    assert.equal(getRoleColor('Logistics'), DEPARTMENT_HEX_COLORS.LOGISTICS);
    assert.equal(getRoleColor('Media'), DEPARTMENT_HEX_COLORS.MEDIA);
    assert.equal(getRoleColor('Design'), DEPARTMENT_HEX_COLORS.DESIGN);
    assert.equal(getRoleColor('Dev'), DEPARTMENT_HEX_COLORS.DEV);

    assert.equal(getRoleColor('Member'), ROLE_HEX_COLORS.MEMBER);
    assert.equal(getRoleColor('Alumni'), ROLE_HEX_COLORS.ALUMNI);
    assert.equal(getRoleColor('Bot'), ROLE_HEX_COLORS.BOT);
  });

  await t.test('getTeamColor returns integer color for valid team', () => {
    const devColor = getTeamColor('DEV');
    assert.equal(devColor, GOOGLE_COLORS.PURPLE);

    const logColor = getTeamColor('LOGISTICS');
    assert.equal(logColor, GOOGLE_COLORS.BROWN);
  });

  await t.test('getAllTeams returns array of 5 official departments in canonical order', () => {
    const all = getAllTeams();
    assert.ok(Array.isArray(all));
    assert.equal(all.length, 5);
    assert.equal(all[0].key, 'RELATIONS');
    assert.equal(all[1].key, 'LOGISTICS');
    assert.equal(all[2].key, 'MEDIA');
    assert.equal(all[3].key, 'DESIGN');
    assert.equal(all[4].key, 'DEV');
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
    const id = buildCustomId('team', 'view', 'dev');
    assert.equal(id, 'bot:team:view:dev');

    const parsed = parseCustomId(id);
    assert.equal(parsed.prefix, 'bot');
    assert.equal(parsed.namespace, 'team');
    assert.equal(parsed.action, 'view');
    assert.deepEqual(parsed.params, ['dev']);
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

  await t.test('Team select menu populates configured squads in canonical order', () => {
    const teamMenu = createTeamSelectMenu({ customId: 'bot:select:team' }).toJSON();
    assert.equal(teamMenu.options.length, 5);
    assert.equal(teamMenu.options[0].value, 'RELATIONS');
    assert.equal(teamMenu.options[1].value, 'LOGISTICS');
    assert.equal(teamMenu.options[2].value, 'MEDIA');
    assert.equal(teamMenu.options[3].value, 'DESIGN');
    assert.equal(teamMenu.options[4].value, 'DEV');
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
    const breadcrumb = formatBreadcrumb(['Dashboard', 'My Team', 'Dev Department']);
    assert.equal(breadcrumb, 'Dashboard › My Team › Dev Department');
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
