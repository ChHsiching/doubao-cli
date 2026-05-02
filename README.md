# doubao-cli

A command-line interface for interacting with Doubao AI through browser automation.

Built on top of [bb-browser](https://github.com/epiral/bb-browser) — a CLI + MCP server for programmatic browser control.

## Quick Start

### Option 1: Download Binary (Recommended)

No Node.js required. Download the binary for your platform from [GitHub Releases](https://github.com/ChHsiching/doubao-cli/releases/latest):

```bash
# Linux (x86_64)
curl -fsSL https://github.com/ChHsiching/doubao-cli/releases/latest/download/doubao-cli-linux-amd64 \
  -o doubao-cli && chmod +x doubao-cli

# macOS (Apple Silicon)
curl -fsSL https://github.com/ChHsiching/doubao-cli/releases/latest/download/doubao-cli-darwin-arm64 \
  -o doubao-cli && chmod +x doubao-cli

# macOS (Intel)
curl -fsSL https://github.com/ChHsiching/doubao-cli/releases/latest/download/doubao-cli-darwin-amd64 \
  -o doubao-cli && chmod +x doubao-cli

# Windows (x86_64)
# Download doubao-cli-windows-amd64.exe from the Releases page
```

### Option 2: npm

```bash
npm install -g @chhsiching/doubao-cli
```

### Option 3: From Source

```bash
git clone git@github.com:ChHsiching/doubao-cli.git
cd doubao-cli
npm install
```

### Prerequisites

- [Google Chrome](https://www.google.com/chrome/) or Chromium
- A Doubao account

### Login

```bash
# Phone + verification code (recommended)
doubao-cli login 13800138000           # Send code to phone
doubao-cli login 13800138000 123456    # Login with code

# Or interactive mode — prompts for phone and code
doubao-cli login
```

If phone login is unavailable, use browser login as a fallback:

```bash
doubao-cli login --web
```

A Chrome window opens for manual login. After completing login, press Enter in the terminal.

After login, verify with:

```bash
doubao-cli account
```

### Usage

```bash
doubao-cli "hello"                          # Quick chat
doubao-cli image "a cat wearing sunglasses"  # Generate image
doubao-cli translate --to-english "你好"     # Translate
doubao-cli coding "write quicksort"          # Coding mode
doubao-cli math "solve x^2 + 3x - 4 = 0"   # Math mode
doubao-cli help                              # All commands
```

## Available Commands

| Command | Description |
|---------|-------------|
| `doubao-cli "message"` | Send a message |
| `doubao-cli image <desc>` | AI image generation |
| `doubao-cli translate <text>` | Translation |
| `doubao-cli translate --to-english <text>` | Translate to English |
| `doubao-cli translate --to-chinese <text>` | Translate to Chinese |
| `doubao-cli coding <prompt>` | Code assistant |
| `doubao-cli math <problem>` | Math solver |
| `doubao-cli writing <prompt>` | Writing assistant |
| `doubao-cli ppt <topic>` | PPT generation |
| `doubao-cli login` | Login (interactive) |
| `doubao-cli login --web` | Login (browser) |
| `doubao-cli list` | List conversations |
| `doubao-cli new` | New conversation |
| `doubao-cli last` | Last response |
| `doubao-cli retry` | Regenerate response |
| `doubao-cli account` | Account info |

## How It Works

doubao-cli uses [bb-browser](https://github.com/epiral/bb-browser) to drive a local Chrome instance via the Chrome DevTools Protocol. It operates entirely within your own browser session — no API keys, no third-party servers, no data leaves your machine.

## Disclaimer

This project is created for **educational and personal learning purposes only**.

It is a browser automation tool that helps users interact with their own web sessions via the command line. It does not bypass authentication, scrape data at scale, or access any non-public APIs.

The name "doubao" refers to the Doubao web application for identification purposes only. This project is not affiliated with, endorsed by, or connected to ByteDance or the Doubao team.

Users are solely responsible for ensuring their use complies with the terms of service of any web platform.

## License

This project is licensed under [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/). Commercial use is not permitted.
