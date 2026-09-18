# Architecture & Layer Separation Rules

## The 4-Tier Decoupled Architecture

The GDG Ghardaia Discord Bot follows a strict four-layer architecture:

$$\text{Interaction Layer} \longrightarrow \text{Feature/Service Layer} \longrightarrow \text{Data Layer} \longrightarrow \text{UI Presentation Layer}$$

### Layer 1: Interaction Layer (`src/commands/`, `src/events/`)
- **Responsibility**: Receives Discord interactions (slash commands, button clicks, select menu selections, modal submits).
- **Invariants**:
  - NEVER run database queries or direct storage lookups inside interaction handlers.
  - NEVER construct raw Discord embeds (`new EmbedBuilder()`) or rows (`new ActionRowBuilder()`) inline.
  - Role is strictly: parse input → dispatch to Feature Service → respond with UI payload.

### Layer 2: Feature / Service Layer (`src/features/`)
- **Responsibility**: Orchestrates domain logic, permissions checking, business workflows, and external service calls.
- **Invariants**:
  - Independent of Discord interaction objects where possible.
  - Takes raw parameters, invokes data access methods, and requests formatted payloads from the UI layer.

### Layer 3: Data Layer (`src/data/`)
- **Responsibility**: Handles persistence, data models, querying, caching, and state transitions.
- **Invariants**:
  - UI-agnostic and Discord-agnostic.
  - Returns plain JavaScript objects or domain model instances.

### Layer 4: UI Presentation Layer (`src/ui/`)
- **Responsibility**: Constructs standard Discord components, embeds, select menus, action rows, and modal payloads.
- **Invariants**:
  - Reusable across different features and entry points.
  - All styling, color resolution, and emoji decorators are encapsulated here.
  - Pure payload generators without side-effects or business state mutation.
