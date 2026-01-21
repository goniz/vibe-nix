import { createOpencode } from "@opencode-ai/sdk"

type ParsedArgs =
  | { ok: true; command: "install"; pkg: string }
  | { ok: false; message: string }

const USAGE = "Usage: nix-cli <command> [args]"
const INSTALL_USAGE = "Usage: nix-cli install <package>"

const parseArgs = (args: string[]): ParsedArgs => {
  const command = args[0]
  if (!command) {
    return { ok: false, message: USAGE }
  }
  if (command !== "install") {
    return { ok: false, message: `Unsupported command: ${command}` }
  }
  const pkg = args[1]
  if (!pkg) {
    return { ok: false, message: INSTALL_USAGE }
  }
  return { ok: true, command: "install", pkg }
}

const result = parseArgs(process.argv.slice(2))
if (!result.ok) {
  console.log(result.message)
  process.exit(1)
}

const { command, pkg } = result

const port = 0
const opencodeConfig = {
  model: "opencode/minimax-m2.1-free",
  permission: {
    "*": "deny",
    bash: {
      "*": "deny",
      "nix *": "allow",
      "nix-env *": "allow",
      "nix-shell *": "allow",
      "nix-store *": "allow",
      "nix-collect-garbage *": "allow",
      "which *": "allow",
    },
    edit: {
      "*": "deny",
      "*.nix": "allow",
    },
  } as any,
}

const opencode = await createOpencode({
  hostname: "127.0.0.1",
  port,
  config: opencodeConfig,
})

console.log(`Server running at ${opencode.server.url}`)

try {
  const sessionResponse = await opencode.client.session.create({
    body: { title: `nix-cli ${command} ${pkg}` },
  })
  if (sessionResponse.error) {
    throw sessionResponse.error
  }
  const session = sessionResponse.data

  const buildPrompt = (name: string) =>
    `The user asked to install the package named "${name}".\n` +
    "Prefer nix profile add nixpkgs#<name> (avoid nix-env). " +
    "Permissions: bash(nix:allow) Edit(*.nix:allow) Else(block)."
  const buildSystemPrompt = () =>
    "You are a Nix-only automation agent. Prefer nix profile add over nix-env " +
    "for installs. Use only nix-related commands (nix, nix-env, nix-shell, " +
    "nix-store, nix-collect-garbage). Do not use other tools or commands unless " +
    "explicitly required for nix operations."

  const prompt = buildPrompt(pkg)
  const systemPrompt = buildSystemPrompt()

  const events = await opencode.client.event.subscribe()
  const stream = events.stream

  const writeStatus = (label: string, detail?: string) => {
    process.stdout.write(`\n[tool ${label}] ${detail ?? ""}`.trimEnd() + "\n")
  }

  const handleEvents = async () => {
    const seenText = new Map<string, number>()
    const seenTool = new Map<string, { status?: string; output?: string }>()
    for await (const event of stream) {
      if (event.type === "message.part.updated") {
        const { part, delta } = event.properties
        if (part.sessionID !== session.id) {
          continue
        }
        if (part.type === "text") {
          if (delta) {
            process.stdout.write(delta)
            continue
          }
          const prev = seenText.get(part.id) ?? 0
          if (part.text.length > prev) {
            process.stdout.write(part.text.slice(prev))
            seenText.set(part.id, part.text.length)
          }
          continue
        }
        if (part.type === "tool") {
          const { state } = part
          const output = state.status === "completed" ? state.output : undefined
          const seen = seenTool.get(part.id) ?? {}
          if (seen.status === state.status && seen.output === output) {
            continue
          }
          switch (state.status) {
            case "running": {
              const title = state.title ?? JSON.stringify(state.input)
              writeStatus("running", title)
              break
            }
            case "completed": {
              if (state.output) {
                process.stdout.write(`${state.output}\n`)
              }
              break
            }
            case "error": {
              const title = JSON.stringify(state.input)
              writeStatus("error", title)
              process.stdout.write(`${state.error}\n`)
              break
            }
          }
          seenTool.set(part.id, { status: state.status, output })
          continue
        }
      }
      if (event.type === "session.idle" && event.properties.sessionID === session.id) {
        break
      }
      if (event.type === "session.error" && event.properties.sessionID === session.id) {
        break
      }
    }
  }

  const streamPromise = handleEvents()

  const result = await opencode.client.session.promptAsync({
    path: { id: session.id },
    body: {
      system: systemPrompt,
      parts: [{ type: "text", text: prompt }],
    },
  })
  if (result.error) {
    throw result.error
  }

  await streamPromise
  process.stdout.write("\n")
} finally {
  opencode.server.close()
}
