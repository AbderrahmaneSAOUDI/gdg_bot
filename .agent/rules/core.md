# Core Working Style & Engineering Principles

## Principles

1. **Simplicity First**:
   - The simplest solution that correctly solves the current problem is preferred, unless there is a concrete reason to choose something more sophisticated.
   - Prefer simple solutions over clever or convoluted solutions.
   - Don't over-engineer for hypothetical future requirements.

2. **Respect Existing Assets**:
   - Prefer existing project utilities, helpers, and components over creating duplicates.
   - Before building a new utility, inspect `src/ui/`, `src/config/`, and helper modules to verify if one already exists.

3. **Surgical, Non-Invasive Changes**:
   - Don't modify unrelated code.
   - When fixing or adding functionality, keep diffs minimal, clean, and focused on the task.
   - Preserve existing code comments and architectural conventions.

4. **Dependencies & Overhead**:
   - Don't add external dependencies (`npm install`) without a compelling reason and user approval.
   - Strive for lightweight, zero-dependency implementations where native Node.js and `discord.js` suffice.

5. **Self-Validation**:
   - Always validate changes before declaring them complete.
   - Run unit tests (`npm test`) and syntax/lint checks on modified code before reporting completion.
   - Never declare work done based solely on code generation without verifying execution.

6. **Defensive Humility**:
   - When uncertain about a convention or existing pattern, inspect the existing codebase before guessing.
   - Identify edge cases, failure states, and unexpected inputs early.
