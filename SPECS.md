# RNP Calendar — Specifications

Session scheduling app for tabletop RPG clubs, backed by Discord authentication.

---

## Authentication

- Discord OAuth2 flow: frontend requests a login URL (`POST /api/auth/discord/request`), user is redirected to Discord, Discord redirects back to the API (`GET /api/auth/discord/verify`), which logs the user in via a session and redirects to the frontend.
- An optional `redirect` parameter can be passed through the entire flow to bring the user back to a specific page after login.
- Session-based auth (no tokens). All protected routes require a session cookie.
- On first login, a user record is created and the Discord members cache is invalidated.

### User model

| Field       | Type    | Description                                  |
|-------------|---------|----------------------------------------------|
| discord_id  | string  | Discord user ID                              |
| name        | string  | Discord display name                         |
| roles       | JSON    | Array of Discord role IDs the user has       |
| is_mj       | virtual | True if user has the configured MJ role      |
| is_admin    | virtual | True if user has the configured Admin role   |

---

## Dictionary (`GET /api/dictionary`)

Returns all reference data needed to populate the UI:

- `user` — current authenticated user
- `games` — list of all games
- `rooms` — list of all rooms (with `code`, `name`, `url`)
- `scenarios` — list of all scenarios
- `members` — guild members from Discord (cached 1h, bots excluded, sorted by username)

---

## Scenarii (`GET /api/dictionary/scenarii`)

Returns a merged, sorted list of:

1. **DB scenarios** — only those whose MJ exists as a user in the database (eager-loaded with their MJ).
2. **Discord proposals** — threads in the `PROPOSITIONS` forum channel posted by the currently authenticated user. Each proposal is shaped like a scenario with missing DB fields set to `null`:
   - `id: null`
   - `mj_user_id`: current user's DB id
   - `game_id: null`
   - `name`: Discord thread title
   - `description`: thread starter message body
   - `discord_thread_id`: Discord thread ID
   - `mj: null`

Both lists are merged and sorted alphabetically by `name`.

---

## Events

### Model

| Field              | Type    | Description                                  |
|--------------------|---------|----------------------------------------------|
| datetime_start     | datetime | Session start                               |
| datetime_end       | datetime | Session end                                 |
| mj_user_id         | FK       | Game master (user)                          |
| room_id            | FK       | Room                                        |
| game_id            | FK       | Game system                                 |
| scenario_id        | FK/null  | Scenario (optional)                         |
| min_players        | int/null | Minimum player count                        |
| max_players        | int/null | Maximum player count                        |
| player_ids         | JSON     | Array of Discord IDs of registered players  |
| discord_thread_id  | string   | ID of the SÉANCES forum thread              |
| deleted_at         | datetime | Soft delete timestamp                       |

### Endpoints

| Method | URL                          | Description                       | Auth rules                  |
|--------|------------------------------|-----------------------------------|-----------------------------|
| GET    | `/api/events`                | List all events                   | Authenticated               |
| POST   | `/api/events`                | Create event                      | Authenticated               |
| GET    | `/api/events/{id}`           | Show event                        | Authenticated               |
| PATCH  | `/api/events/{id}`           | Update event                      | Admin or event MJ           |
| DELETE | `/api/events/{id}`           | Soft-delete event                 | Admin or event MJ           |
| POST   | `/api/events/{id}/register`  | Register current user             | Must be the requesting user |
| POST   | `/api/events/{id}/unregister`| Unregister current user           | Must be the requesting user |

**Register/unregister rules:**
- `user_id` in request body must match the authenticated session user.
- User must have a `discord_id` linked.
- Cannot register if already registered or if event is full.
- Cannot unregister if not registered.

---

## Discord Sync (`EventDiscordSync`)

On every event create or update (including register/unregister):

- Creates or updates a forum thread in the **SÉANCES** channel.
- **Thread title format:** `[RoomCode][DD/MM/YY] Game - Scenario`
- **Thread content includes:**
  - Date and time (French locale)
  - Room name (clickable link if URL is set), suppressed embeds
  - Game name
  - Scenario name (if set)
  - MJ mention
  - Player count range (min/max if set)
  - List of registered player mentions
  - Registration link (`/show/{id}`) if the event is not full

---

## Reference Data

### Games

Simple lookup table: `id`, `name`.

### Rooms

| Field | Type        | Description                     |
|-------|-------------|---------------------------------|
| code  | string (UK) | Short code used in thread titles |
| name  | string      | Full display name               |
| url   | string/null | Optional URL (shown as link)    |

### Scenarios

| Field              | Type        | Description                          |
|--------------------|-------------|--------------------------------------|
| mj_user_id         | FK/null     | The MJ who owns this scenario         |
| game_id            | FK          | Game system                          |
| name               | string      | Scenario name                        |
| description        | text/null   | Description                          |
| discord_thread_id  | string/null | Linked Discord PROPOSITIONS thread ID |

---

## Discord Setup Command (`php artisan discord:setup`)

Interactive command that scaffolds a Discord server:

1. Shows the guild name and asks for confirmation.
2. Creates (or finds) two forum channels: **PROPOSITIONS** and **SÉANCES**.
3. Creates (or finds) two roles: **Maîtres du Jeu** and **Admin**.
4. Writes the resulting IDs to `.env`:
   - `DISCORD_CHANNEL_ID_PROPOSITIONS`
   - `DISCORD_CHANNEL_ID_SEANCES`
   - `DISCORD_ROLE_ID_MJ`
   - `DISCORD_ROLE_ID_ADMIN`

---

## Frontend

React + Vite + TypeScript, Mantine 8 UI, TanStack React Query, React Router v7.

### Pages / Routes

| Route       | Description                                                 |
|-------------|-------------------------------------------------------------|
| `/login`    | Discord login page                                          |
| `/`         | Calendar view                                               |
| `/show/:id` | Calendar with the event detail modal open (shareable URL)  |

### Components

- **Calendar** — Monthly calendar showing events (title = game name). Clicking an event navigates to `/show/:id`. Clicking an empty slot opens the create modal.
- **CreateEventModal** — Create/edit form. Fields: dates, MJ, room, game, scenario, min/max players, registered players (multi-select with Discord avatars). Only admin or event MJ can open in edit mode.
- **EventShowModal** — Read-only event detail. Shows room (link if URL set), game, scenario, MJ, registered players with avatars, register/unregister button (hidden if already registered). Edit button for admin/MJ.
- **MembersSelect** — Mantine `MultiSelect` with Discord avatar rendering. Respects `max_players` as an upper bound.
- **MemberAvatar** — Discord avatar + username. Falls back to initial if no avatar.

### API client

Generated by Orval from the OpenAPI spec (Scramble). Custom hooks for register/unregister follow the same shape (`useEventsRegister`, `useEventsUnregister` in `event-register.ts`).

A 401 interceptor on the Axios instance redirects to `/login?redirect=<current path>`, preserving the user's intended destination.
