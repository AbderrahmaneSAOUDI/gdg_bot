---
name: feature-development
description: >-
  Standard 7-step procedure for implementing new bot features:
  Understand -> Inspect -> Propose -> Implement -> Test -> Review.
---

# Feature Development Skill

Follow this systematic 7-step approach for every non-trivial task or feature.

---

## The 7-Step Feature Lifecycle

```text
Understand
    ↓
Inspect Existing Code
    ↓
Scope & Pre-Flight Checks
    ↓
Propose Approach
    ↓
Implement Surgically
    ↓
Test & Validate
    ↓
Self-Review & Document
```

### Step 1: Understand
- Carefully review user requirements.
- Identify the user experience goal, permissions needed, and expected interaction flow.

### Step 2: Inspect Existing Code
- Search for reusable components in `src/ui/`.
- Inspect existing schemas, configuration in `src/config/`, and helper functions.
- Do not build from scratch what already exists.

### Step 3: Scope & Pre-Flight Checks
- Check [`.agent/sidecars/CURRENT_PHASE.md`](file:///home/saoudi26/Documents/GitHub/GDG/gdg_bot/.agent/sidecars/CURRENT_PHASE.md) to ensure the work is allowed in the current phase.
- Check [`.agent/sidecars/DECISIONS.md`](file:///home/saoudi26/Documents/GitHub/GDG/gdg_bot/.agent/sidecars/DECISIONS.md) to ensure compliance with prior decisions.

### Step 4: Propose Approach
- If the feature introduces non-obvious design choices or alternative approaches, present a concise proposal to the user before writing code.
- "Agent proposes → User decides → Agent implements."

### Step 5: Implement Surgically
- Follow 4-tier decoupling:
  `Interaction Handler -> Feature Service -> Data Access -> UI Builder`
- Keep edits localized and minimal.

### Step 6: Test & Validate
- Execute automated unit tests: `npm test`.
- Add test coverage in `test/` for new components or service logic.

### Step 7: Self-Review & Document
- Run the `review` skill checklist.
- Update `PROJECT_STATE.md` and `CHANGELOG.md` upon completion.
