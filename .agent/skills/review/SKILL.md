---
name: review
description: >-
  Pre-completion self-review checklist to verify code simplicity, test coverage,
  decision compliance, and zero unintended side effects.
---

# Code & Feature Review Skill

Run this self-review checklist before declaring any feature or bugfix complete.

---

## 📋 The Self-Review Checklist

1. **Functionality**:
   - [ ] Does the code satisfy all specified user requirements?
   - [ ] Do automated tests pass cleanly (`npm test`)?

2. **Simplicity & Cleanliness**:
   - [ ] Is this the simplest solution that correctly solves the problem?
   - [ ] Are there clever, convoluted, or over-engineered patterns that can be simplified?
   - [ ] Are variable and function names self-describing?
   - [ ] Do comments explain *WHY* rather than restating the obvious *WHAT*?

3. **Duplication & Asset Reuse**:
   - [ ] Did I reuse existing components from `src/ui/` rather than creating duplicates?
   - [ ] Are all color tokens imported from `src/config/colors.js` or `src/config/teams.js`?
   - [ ] Did I build custom IDs via `src/config/customIds.js`?

4. **Architecture & Invariants**:
   - [ ] Is the 4-tier separation preserved (no DB queries or raw embeds in interaction handlers)?
   - [ ] Does the change comply with [`.agent/sidecars/DECISIONS.md`](file:///home/saoudi26/Documents/GitHub/GDG/gdg_bot/.agent/sidecars/DECISIONS.md)?
   - [ ] Does the change stay strictly within [`.agent/sidecars/CURRENT_PHASE.md`](file:///home/saoudi26/Documents/GitHub/GDG/gdg_bot/.agent/sidecars/CURRENT_PHASE.md)?

5. **Safety & Error Handling**:
   - [ ] Are async exceptions caught and handled gracefully?
   - [ ] Will the user see an understandable Discord error message instead of an unhandled rejection?
   - [ ] Were any new dependencies added? If yes, was this approved?
