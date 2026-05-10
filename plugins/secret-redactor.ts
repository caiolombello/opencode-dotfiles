import type { Plugin } from "@opencode-ai/plugin"

const SECRET_FILE_PATTERN = /(^|\/|\\)\.env(\.[^/\\]+)?$/
const SAFE_ENV_EXAMPLE_PATTERN = /(^|\/|\\)\.env(\.example|\.sample|\.template)$/
const PRINTING_COMMAND_PATTERN = /\b(cat|less|more|tail|head|sed|awk)\b/

const REDACTIONS: Array<[RegExp, string]> = [
  [/\b(A3T[A-Z0-9]|AKIA|ASIA)[A-Z0-9]{16}\b/g, "[REDACTED_AWS_ACCESS_KEY]"],
  [/\bgh[pousr]_[A-Za-z0-9_]{20,}\b/g, "[REDACTED_GITHUB_TOKEN]"],
  [/\bglpat-[A-Za-z0-9_-]{20,}\b/g, "[REDACTED_GITLAB_TOKEN]"],
  [/\bxox[baprs]-[A-Za-z0-9-]{20,}\b/g, "[REDACTED_SLACK_TOKEN]"],
  [/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, "[REDACTED_JWT]"],
  [/(\bAuthorization\s*:\s*Bearer\s+)[^\s"']+/gi, "$1[REDACTED]"],
  [/(\b(?:api[_-]?key|token|secret|password|passwd|pwd|authorization)\b\s*[:=]\s*)(["']?)[^\s"']{8,}\2/gi, "$1[REDACTED]"],
]

function redact(value: string) {
  return REDACTIONS.reduce((current, [pattern, replacement]) => current.replace(pattern, replacement), value)
}

function isSecretFile(path: string) {
  const normalized = path.replace(/^['"]|['"]$/g, "")
  return SECRET_FILE_PATTERN.test(normalized) && !SAFE_ENV_EXAMPLE_PATTERN.test(normalized)
}

function commandReferencesSecretEnv(command: string) {
  const matches = command.match(/(?:^|\s)(?:['"]?)([^\s'";|&]*\.env(?:\.[^\s'";|&]+)?)(?:['"]?)(?=\s|$|;|\||&)/g) ?? []
  return matches.some((match) => isSecretFile(match.trim()))
}

export const SecretRedactorPlugin: Plugin = async () => {
  return {
    "tool.execute.before": async (input, output) => {
      const tool = String(input?.tool ?? "").toLowerCase()
      const args = output?.args as Record<string, unknown> | undefined
      if (!args) return

      if (tool === "read") {
        const filePath = String(args.filePath ?? args.path ?? "")
        if (filePath && isSecretFile(filePath)) {
          throw new Error(`Refusing to read secret file '${filePath}'. Use pass-cli or a secret manager instead.`)
        }
      }

      if (tool === "bash" || tool === "shell") {
        const command = String(args.command ?? "")
        if (PRINTING_COMMAND_PATTERN.test(command) && commandReferencesSecretEnv(command)) {
          throw new Error("Refusing to print .env content. Use pass-cli or a secret manager instead.")
        }
        if (/^\s*printenv\s*$/.test(command) || /^\s*env\s*$/.test(command)) {
          throw new Error("Refusing to print the full environment because it may contain secrets.")
        }
      }
    },
    "tool.execute.after": async (_input, output) => {
      if (typeof output.output === "string") {
        output.output = redact(output.output)
      }
      if (typeof output.title === "string") {
        output.title = redact(output.title)
      }
    },
  }
}
