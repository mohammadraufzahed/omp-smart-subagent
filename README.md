# omp-smart-subagent

Intelligent sub-agent offloading and dynamic model routing plugin for `omp`.

## Features

- **Automated Model Routing**: Automatically categorizes sub-agent assignments into **HIGH** (reasoning-intensive) and **CHEAP** (mechanical/scouting) tiers.
- **Jev & OpenRouter Integration**: Supports OpenRouter model lists and TypeSafe / Jev (`typesafe/jev-latest`) as an ultra-fast System One AI judge for evaluating task complexity.
- **Dynamic Session Model Selection**: Reads authenticated models directly from `ctx.models.list()`, picking the best match without hardcoded endpoints.
- **Interactive TUI Setup**: Run `/subagent setup` inside `omp` to configure modes, preferred models, and provider preferences.
- **Built-in Specialized Agents**:
  - `architect`: High-level system design and reviews (routed to high reasoning).
  - `coder`: Fast, accurate implementation and bug fixes.
  - `researcher`: Read-only discovery and symbol mapping.

## Installation

Link the plugin into `omp`:

```bash
omp plugin link ./omp-smart-subagent
```

## Configuration & Commands

Inside `omp`:

- `/subagent setup` — Launch interactive configuration wizard (select mode, preferred high/cheap models, OpenRouter prioritization, and Jev judge).
- `/subagent status` — Show current routing policies and active configuration.

Configuration is automatically saved to `~/.omp/subagent-router.json`.

## License

MIT
