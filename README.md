# RNP Calendar

Session scheduling app for tabletop RPG clubs, backed by Discord authentication.

## Prerequisites

- PHP 8.2+, Composer
- Node.js, Yarn
- A Discord bot ([invite it to your server](https://discord.com/oauth2/authorize?client_id=1482007969939067034&permissions=2832745948638288&integration_type=0&scope=bot+applications.commands))

## Setup

### 1. Server (Laravel)

```bash
cd server
composer install
cp .env.example .env
php artisan key:generate
```

Edit `.env` and set:

```env
DISCORD_BOT_TOKEN=your_bot_token
DISCORD_GUILD_ID=your_guild_id
```

Then run migrations:

```bash
php artisan migrate
```

### 2. Discord server setup

Run the interactive setup command to create channels and configure roles:

```bash
php artisan discord:setup
```

This will write `DISCORD_CHANNEL_ID_PROPOSITIONS`, `DISCORD_CHANNEL_ID_SEANCES`, `DISCORD_ROLE_ID_MJ`, and `DISCORD_ROLE_ID_ADMIN` into your `.env`.

### 3. Client (React)

```bash
cd client
yarn install
cp .env.example .env.local
```

## Running in dev

In two separate terminals:

```bash
# Terminal 1 — API server (http://127.0.0.1:8000)
cd server
php artisan serve

# Terminal 2 — Frontend (http://localhost:5173)
cd client
yarn dev
```
