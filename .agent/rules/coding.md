# Coding Standards & Clean Code Rules

## 1. Code Clarity & Naming
- Use clear, expressive variable, function, and parameter names.
- Prefer self-documenting code over trivial comments.
- Comments must explain **WHY** a specific decision or workaround exists, not restate the obvious **WHAT**.

## 2. Functions & Modularity
- Keep functions small, focused, and single-purpose.
- Prefer pure functions for data transformations and UI builders.
- Extract complex conditionals into well-named boolean helper variables or predicates.

## 3. Async / Await & Discord Safety
- Always handle async operations defensively.
- Ensure Discord interactions are acknowledged promptly (reply, update, or `deferReply({ ephemeral: true })`) within Discord's 3-second window to prevent interaction timeouts.
- Catch specific errors and return user-friendly, non-technical feedback via `createAlertEmbed` rather than crashing the process.

## 4. Node.js & Module Conventions
- Use ES Modules (`import`/`export`) consistently.
- Centralize constants and configurations; never scatter magic numbers or repeated string keys throughout the codebase.
