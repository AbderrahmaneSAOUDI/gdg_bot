---
name: decision-management
description: >-
  Procedures for reading project memory, logging user directives, detecting architectural conflicts,
  and updating persistent sidecars in .agent/sidecars/.
---

# Decision Management Skill

This skill guides agents in maintaining persistent project memory and processing user decisions so orders are never repeated.

---

## 1. Reading Project Memory

Before starting any task:
1. Open and read [`.agent/sidecars/DECISIONS.md`](file:///home/saoudi26/Documents/GitHub/GDG/gdg_bot/.agent/sidecars/DECISIONS.md).
2. Check [`.agent/sidecars/CURRENT_PHASE.md`](file:///home/saoudi26/Documents/GitHub/GDG/gdg_bot/.agent/sidecars/CURRENT_PHASE.md) for active scope boundaries.
3. Check [`.agent/sidecars/PROJECT_STATE.md`](file:///home/saoudi26/Documents/GitHub/GDG/gdg_bot/.agent/sidecars/PROJECT_STATE.md) for current sprint context.

Never propose an architecture, library, or feature flow that contradicts an `Accepted` decision in `DECISIONS.md`.

---

## 2. Syncing Decisions from Chat (Decision Capture)

When the user gives a clear preference, chooses an architectural direction, or provides a sync block in chat:

1. **Format Decision**:
   Draft the entry with the standard schema:
   ```markdown
   ### D-XXX
   - **Decision**: [Concise statement]
   - **Status**: Accepted
   - **Rationale**: [Reasoning / context]
   - **Affected Files / Scope**: [Files or modules affected]
   ```
2. **Append to `DECISIONS.md`**:
   Write the entry to [`.agent/sidecars/DECISIONS.md`](file:///home/saoudi26/Documents/GitHub/GDG/gdg_bot/.agent/sidecars/DECISIONS.md).
3. **Update State**:
   If the decision updates current goals or backlog, update [`.agent/sidecars/PROJECT_STATE.md`](file:///home/saoudi26/Documents/GitHub/GDG/gdg_bot/.agent/sidecars/PROJECT_STATE.md) and [`.agent/sidecars/TODO.md`](file:///home/saoudi26/Documents/GitHub/GDG/gdg_bot/.agent/sidecars/TODO.md).

---

## 3. Detecting & Handling Conflicts

If existing code or a requested change conflicts with an accepted decision:
- **STOP**: Do not guess or silently choose one.
- **FLAG**: Alert the user:
  > "Conflict detected: The request proposes `[Approach A]`, but decision `D-XXX` states `[Approach B]`. Would you like to revise decision `D-XXX` or proceed with `[Approach B]`?"
- Await explicit user instruction.
