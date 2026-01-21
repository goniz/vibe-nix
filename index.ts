import { createOpencode } from "@opencode-ai/sdk"
import type {
  Event,
  EventMessagePartUpdated,
  EventMessageUpdated,
  Message,
  Part,
  TextPart,
  ToolPart,
  ToolState,
} from "@opencode-ai/sdk"

type ParsedArgs =
  | { ok: true; command: "install"; pkg: string }
  | { ok: false; message: string }

const USAGE = "Usage: nix-cli <command> [args]"
const INSTALL_USAGE = "Usage: nix-cli install <package>"
const ANSI = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  bright: "\x1b[1m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
}
const DIVIDER_LENGTH = 64
const divider = () => `${ANSI.dim}${"-".repeat(DIVIDER_LENGTH)}${ANSI.reset}`
const formatTag = (label: string, color: string) =>
  `${color}${ANSI.bright}${label}${ANSI.reset}`
const writeHeader = (command: string, pkg: string) => {
  const line = divider()
  console.log(line)
  console.log(`${formatTag("nix-cli", ANSI.magenta)} ${ANSI.dim}nix automation${ANSI.reset}`)
  console.log(`${ANSI.dim}Command:${ANSI.reset} ${ANSI.bright}${command} ${pkg}${ANSI.reset}`)
  console.log(line)
}
const writeFailure = (message: string) => {
  console.log(`${formatTag("nix-cli", ANSI.magenta)} ${ANSI.dim}nix automation${ANSI.reset}`)
  console.log(`${formatTag("error", ANSI.red)} ${message}`)
}
const writeStage = (label: string, detail?: string) => {
  const info = detail ? ` ${ANSI.dim}${detail}${ANSI.reset}` : ""
  console.log(`${formatTag(label, ANSI.cyan)}${info}`)
}
const writeAssistantHeader = () => {
  const line = divider()
  process.stdout.write(`\n${formatTag("assistant", ANSI.magenta)}\n${line}\n`)
}

const isMessagePartUpdated = (event: Event): event is EventMessagePartUpdated =>
  event.type === "message.part.updated"
const isMessageUpdated = (event: Event): event is EventMessageUpdated =>
  event.type === "message.updated"
const isTextPart = (part: Part): part is TextPart => part.type === "text"
const isToolPart = (part: Part): part is ToolPart => part.type === "tool"

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
  writeFailure(result.message)
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

writeHeader(command, pkg)
writeStage("server", opencode.server.url)

try {
  const sessionResponse = await opencode.client.session.create({
    body: { title: `nix-cli ${command} ${pkg}` },
  })
  if (sessionResponse.error) {
    throw sessionResponse.error
  }
  const session = sessionResponse.data
  writeStage("session", session.id)

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
  const stream = events.stream as AsyncIterable<Event>

  const toolColors: Record<ToolState["status"], string> = {
    pending: ANSI.dim,
    running: ANSI.yellow,
    completed: ANSI.green,
    error: ANSI.red,
  }
  const toolLabels: Record<ToolState["status"], string> = {
    pending: "pending",
    running: "running",
    completed: "done",
    error: "error",
  }
  const writeStatus = (label: ToolState["status"], detail?: string) => {
    const color = toolColors[label]
    const tag = formatTag(`tool ${toolLabels[label]}`, color)
    const info = detail ? ` ${ANSI.dim}${detail}${ANSI.reset}` : ""
    process.stdout.write(`\n${tag}${info}\n`)
  }

  const handleEvents = async () => {
    const seenText = new Map<string, number>()
    const seenTool = new Set<string>()
    const messageRoles = new Map<string, Message["role"]>()
    for await (const event of stream) {
      if (isMessageUpdated(event)) {
        const { info } = event.properties
        if (info.sessionID !== session.id) {
          continue
        }
        messageRoles.set(info.id, info.role)
        continue
      }
      if (isMessagePartUpdated(event)) {
        const { part, delta } = event.properties
        if (part.sessionID !== session.id) {
          continue
        }
        const role = messageRoles.get(part.messageID)
        if (role !== "assistant") {
          continue
        }
        if (isTextPart(part)) {
          const prev = seenText.get(part.id) ?? 0
          if (delta) {
            process.stdout.write(delta)
            const next = part.text ? part.text.length : prev + delta.length
            seenText.set(part.id, next)
            continue
          }
          if (part.text.length > prev) {
            process.stdout.write(part.text.slice(prev))
            seenText.set(part.id, part.text.length)
          }
          continue
        }
        if (isToolPart(part)) {
          const { state } = part
          if (seenTool.has(part.id)) {
            continue
          }
          switch (state.status) {
            case "completed": {
              const title = state.title ?? JSON.stringify(state.input)
              writeStatus("completed", title)
              if (state.output) {
                process.stdout.write(`${state.output}\n`)
              }
              seenTool.add(part.id)
              break
            }
            case "error": {
              const title = JSON.stringify(state.input)
              writeStatus("error", title)
              process.stdout.write(`${state.error}\n`)
              seenTool.add(part.id)
              break
            }
          }
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

  writeAssistantHeader()
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
