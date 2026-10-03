# omp-smart-subagent

Intelligent sub-agent offloading and dynamic model routing plugin for `omp`, powered exclusively by **Jev System One AI Judge** and **OpenRouter**.

## Features

- **Jev-Powered Classification**: Relies exclusively on Jev (`~typesafe/jev-latest` on OpenRouter, or native `typesafe/jev-latest` / System One) to evaluate every sub-agent task into **HIGH** or **CHEAP** complexity.
- **Interactive `/subagent setup`**: Prompts the user directly in the TUI for:
  - OpenRouter API key (`sk-or-...`)
  - TypeSafe API key (optional)
  - Preferred High-tier model (auto-populated from session `ctx.models.list()`)
  - Preferred Cheap/Fast model
- **Dynamic Model Matching**: Prioritizes OpenRouter providers and maps to candidates live from the session catalog.
- **Built-in Sub-Agents**:
  - `architect`: High-level system design and reviews.
  - `coder`: Fast, accurate implementation and bug fixes.
  - `researcher`: Read-only discovery and symbol mapping.

## Commands

- `/subagent setup` — Interactive wizard to input API tokens and pick preferred models.
- `/subagent status` — Display current configuration and masked keys.

Configuration is securely persisted to `~/.omp/subagent-router.json`.

## License

MIT
