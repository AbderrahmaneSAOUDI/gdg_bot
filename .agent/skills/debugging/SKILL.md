---
name: debugging
description: >-
  Systematic root-cause debugging methodology for investigating errors,
  test failures, or runtime interaction issues without guesswork.
---

# Debugging Skill

This skill defines the systematic diagnostic workflow to isolate and fix bugs reliably.

---

## 1. The Anti-Guesswork Rule
- **Never guess fixes or randomly modify files.**
- If a test fails or an interaction breaks, isolate the exact failure point and understand the mechanism before making changes.

---

## 2. 5-Stage Diagnostic Workflow

### Stage 1: Capture Exact Error & Stack Trace
- Inspect the full error message, stack trace, and originating file/line number.
- Identify whether the failure is a syntax error, runtime exception, assertion failure, or Discord API limit violation.

### Stage 2: Reproduce Minimally
- Run the targeted test directly:
  `node --test test/ui-components.test.js`
- Isolate the failing test case or interaction payload.

### Stage 3: Inspect State & Invariants
- Trace inputs and state changes leading up to the failure.
- Check if Discord API constraints were breached (e.g. embed length > 4096, > 5 buttons per action row, custom ID > 100 characters).

### Stage 4: Apply Surgical Fix
- Fix the root cause at the source layer (Data, Service, or UI), not by patching over symptoms in multiple calling sites.

### Stage 5: Verify & Prevent Regression
- Run `npm test` to confirm resolution and ensure no existing test cases broke.
- Add an explicit regression test covering the fixed failure condition.
