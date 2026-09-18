# Project Decisions & Persistent Memory Rules

## The Zero Repetition Invariant

The user must never need to repeat architectural, design, or procedural decisions across conversations.

### 1. Source of Truth for Decisions
- The persistent project memory resides in [`.agent/sidecars/DECISIONS.md`](file:///home/saoudi26/Documents/GitHub/GDG/gdg_bot/.agent/sidecars/DECISIONS.md).
- Every decision recorded as `Accepted` is an active project constraint.
- Agents must consult this document at the start of every session before proposing architectures or writing code.

### 2. Immediate Decision Capture
- Whenever the user makes an explicit decision, establishes a constraint, sets a preference, or corrects an approach in conversation:
  1. Record the decision immediately into [`.agent/sidecars/DECISIONS.md`](file:///home/saoudi26/Documents/GitHub/GDG/gdg_bot/.agent/sidecars/DECISIONS.md).
  2. Assign the next sequential ID (`D-XXX`).
  3. Document the status (`Accepted`), user directive, context, concrete rules, and affected files.

### 3. Conflict & Inconsistency Protocol
- **Sidecars are project memory, not a second source of truth.**
- If code implementation and `DECISIONS.md` conflict:
  - Do NOT silently guess or override either one.
  - Flag the inconsistency clearly to the user: state what the decision says and what the code currently does.
  - Await user confirmation before proceeding.

### 4. No Unilateral Reversals
- Never revert, overwrite, or contradict past accepted decisions unless the user explicitly requests to revise or supersede one.
