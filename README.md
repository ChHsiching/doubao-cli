# doubao-cli

A command-line interface for interacting with Doubao AI through browser automation.

Built on top of [bb-browser](https://github.com/epiral/bb-browser) — a CLI + MCP server for programmatic browser control.

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [Google Chrome](https://www.google.com/chrome/) or Chromium
- A Doubao account

### Install

```bash
git clone git@github.com:ChHsiching/doubao-cli.git
cd doubao-cli
npm install
```

This automatically installs `bb-browser` and copies adapters into place.

### Login

```bash
# Phone + verification code (recommended)
./doubao login 13800138000           # Send code to phone
./doubao login 13800138000 123456    # Login with code

# Or interactive mode — prompts for phone and code
./doubao login
```

If phone login is unavailable, use browser login as a fallback:

```bash
./doubao login --web
```

A Chrome window opens for manual login. After completing login, press Enter in the terminal.

### Usage

```bash
./doubao "hello"                          # Quick chat
./doubao image "a cat wearing sunglasses"  # Generate image
./doubao translate --to-english "你好"     # Translate
./doubao coding "write quicksort"          # Coding mode
./doubao math "solve x^2 + 3x - 4 = 0"   # Math mode
./doubao help                              # All commands
```

## Available Commands

| Command | Description |
|---------|-------------|
| `doubao "message"` | Send a message |
| `doubao image <desc>` | AI image generation |
| `doubao translate <text>` | Translation |
| `doubao coding <prompt>` | Code assistant |
| `doubao math <problem>` | Math solver |
| `doubao writing <prompt>` | Writing assistant |
| `doubao research <topic>` | Deep research |
| `doubao ppt <topic>` | PPT generation |
| `doubao login` | Login (interactive) |
| `doubao login --web` | Login (browser) |
| `doubao list` | List conversations |
| `doubao new` | New conversation |
| `doubao last` | Last response |
| `doubao retry` | Regenerate response |
| `doubao account` | Account info |

## How It Works

doubao-cli uses [bb-browser](https://github.com/epiral/bb-browser) to drive a local Chrome instance via the Chrome DevTools Protocol. It operates entirely within your own browser session — no API keys, no third-party servers, no data leaves your machine.

## Disclaimer

This project is created for **educational and personal learning purposes only**.

It is a browser automation tool that helps users interact with their own web sessions via the command line. It does not bypass authentication, scrape data at scale, or access any non-public APIs.

The name "doubao" refers to the Doubao web application for identification purposes only. This project is not affiliated with, endorsed by, or connected to ByteDance or the Doubao team.

Users are solely responsible for ensuring their use complies with the terms of service of any web platform.

## License

This project is licensed under [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/). Commercial use is not permitted.
