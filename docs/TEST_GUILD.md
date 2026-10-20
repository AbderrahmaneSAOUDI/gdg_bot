# Manual test-guild checklist

Automated tests use mocked APIs. A real test guild is still required to validate
Discord role hierarchy, mobile/desktop layouts, API permissions, and channel
visibility. Do not use a production guild for the first validation pass.

1. Back up local JSON while the operator has stopped the bot. Check that only one
   process will use the stores. Install with `npm ci`, then run `npm test`.
2. Start the bot only when intended. The existing ready handler may send a public
   greeting. Register `/bot` only if the guild needs it (`npm run deploy`).
3. As Administrator/Manage Guild, open `/bot` → Check Setup. Confirm it creates no
   roles, channels, or messages. Bind distinct canonical leadership, membership,
   and CORE role IDs through the preview/confirmation controls. Put the bot above
   the roles it manages.
4. Review unscoped legacy events and confirm their owning guild only after checking
   the file's contents. Verify all records, team IDs, and old channels are preserved.
5. Deploy a public hub using `/bot deploy_channel:#club-hub`. As two different
   members, open profiles and directories. The public message must remain a shared
   entry point; personal/admin screens must remain private.
6. Browse registered members, search by name/user ID, combine department and status
   filters, and check later pages. Confirm unregistered Discord users are not
   presented as registered club records. Open department rosters and Co-Managers.
7. From My Profile choose a department, review the choice, Submit, and open My
   Requests. Duplicate clicks must leave one pending request. Cancel, then submit
   a new request. Try an already-active membership.
8. As a scoped Co-Manager, confirm only the department's permitted requests appear.
   A transfer or unrelated request must remain inaccessible. Department membership,
   forged leadership names, and Manage Roles alone must not grant authority.
9. Approve a permitted request. Check that the correct Discord membership role is
   added, the old configured membership role is removed after the grant, unrelated
   roles remain, and requester/manager private views show the same decision.
10. Remove the bot's Manage Roles permission or move a role above the bot and retry
    another request. It must remain pending with useful error guidance and prior
    access preserved where compensation succeeds. Restore permissions and repair
    any reported partial operation explicitly.
11. Reject a request with an optional reason. Verify requester history, resolver,
    timestamp, and reason. Click stale approve/reject controls; terminal history
    must not be rewritten. Test an actor whose management role was just revoked.
12. Register a Discord member, transfer, preview Archive then Cancel, confirm
    Archive, and reactivate. Check role changes, preserved metadata, and no kick/ban.
    Confirm leadership appointment requires club-wide authority and a separate review.
13. Create/edit/archive an event, browse archived records, add teams, delete one,
    and add another. Team numbers must remain unique; role names must stay
    `Event - Team NN - Member/Mentor`, with Blue/Yellow and mentor hoist.
14. Assign duplicate members/mentors, test a departed user, move a member through
    confirmation, and remove access through confirmation. Removal uses paginated
    stored roster entries so a departed user can also be selected. A mentor can serve
    multiple teams. Check success/failure counts and My Teams ownership.
15. Select Delete Team in its picker, read the exact event/team/role/channel impact,
    and Cancel. Confirm that nothing changed. Repeat and confirm; deny deletion of
    one resource and verify a retryable cleanup record and accurate partial result.
16. Explicitly create text and optional voice channels. Retry; stored IDs must be
    reused. Check Open Channel visibility for a team member, mentor, CORE, outsider,
    and the bot. Test overlapping CORE/team roles and an Administrator: diagnostics
    must explain conflicts instead of claiming a deny always wins.
17. Run Check Setup again. It must remain read-only. Create controlled membership
    drift, preview repair, Cancel, then confirm. Do the equivalent with a team role
    or channel using Repair Team. Check that pending deletion uses cleanup retry.
18. Restart the bot intentionally. Verify club/event data and request history
    survive. Old session previews should expire safely with a working Home path.
19. Use existing messages sent by releases 0.12/0.13. Test team Previous/Next,
    Add Event/Team, Assign Members/Mentors, and Delete Team. They must open the
    current screen privately; an old delete selection must show an impact review.
    Old modal submissions and user selections must expire without changing data.
20. Browse rosters, mentors, and requests immediately after a cache-cold restart.
    Visible names must resolve through individual member reads without requiring
    the privileged Guild Members intent. Verify controls acknowledge while those
    reads are delayed and modal-opening buttons still open their form directly.
21. Remove access to one export channel or its Read Message History permission,
    then invoke Extract Server Data. Verify the result says the export is partial,
    accessible histories remain saved, and both root/per-channel reports identify
    the incomplete history. Core `/bot` navigation must work with Message Content
    disabled; full exported message bodies require the app's Portal content access.

Never test corruption against populated production JSON. Automated corruption and
write-failure tests already run in temporary directories without Discord credentials.
