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
Server running at http://127.0.0.1:32943
The user asked to install the package named "ripgrep".
Prefer nix profile add nixpkgs#<name> (avoid nix-env). Permissions: bash(nix:allow) Edit(*.nix:allow) Else(block).
[tool running] {"command":"nix profile add nixpkgs#ripgrep","description":"Install ripgrep package via nix profile"}
this path will be fetched (1.5 MiB download, 6.4 MiB unpacked):
  /nix/store/0qh46n4bqwci1dli1bjqkavvzmdw87x3-ripgrep-15.1.0
copying path '/nix/store/0qh46n4bqwci1dli1bjqkavvzmdw87x3-ripgrep-15.1.0' from 'https://cache.nixos.org'...

Installed ripgrep-15.1.0 successfully.
```

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```
