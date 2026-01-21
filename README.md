# vibe-nix

A vibe-coded CLI that uses the OpenCode SDK to manage Nix packages with your favorite LLM.

The CLI lets you run commands like `install <pkg>` and the agent handles the Nix commands and edits for you.

> **Note**
> This project is satire and not a real application. It references [this X post](https://x.com/thdxr/status/2013995998729666741).

Example:

```bash
bun run index.ts install ripgrep
```

```text
----------------------------------------------------------------
nix-cli nix automation
Command: install ripgrep
----------------------------------------------------------------
server http://127.0.0.1:32943
session ses_41dd7c92affewLK3x61ONtBpZc

assistant
----------------------------------------------------------------
tool done Install ripgrep package via nix profile
this path will be fetched (1.5 MiB download, 6.4 MiB unpacked):
  /nix/store/0qh46n4bqwci1dli1bjqkavvzmdw87x3-ripgrep-15.1.0
copying path '/nix/store/0qh46n4bqwci1dli1bjqkavvzmdw87x3-ripgrep-15.1.0' from 'https://cache.nixos.org'...

Installed `ripgrep` (version 15.1.0) via `nix profile add nixpkgs#ripgrep`.
```

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```
