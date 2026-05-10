import type { Plugin } from "@opencode-ai/plugin"

const AWS_READONLY = /\b(?:get|list|describe|head)-[\w-]+\b|\bsts\s+get-caller-identity\b/
const AWS_COMMAND = /\baws\b/
const KUBECTL_MUTATING = /\bkubectl\b[\s\S]*\b(apply|delete|patch|replace|scale|rollout\s+restart|cordon|uncordon|drain|taint|label|annotate|create|set)\b/
const KUBECTL_CLUSTER_SCOPED = /\bkubectl\b[\s\S]*\b(cordon|uncordon|drain|create\s+namespace)\b/
const HELM_MUTATING = /\bhelm\b[\s\S]*\b(install|upgrade|rollback|uninstall|delete)\b/
const TERRAFORM_MUTATING = /\b(?:terraform|tofu)\b[\s\S]*\b(apply|destroy)\b/
const ARGUMENT_SEPARATOR = /\s--\s/

function hasFlag(command: string, long: string, short?: string) {
  const beforeSeparator = command.split(ARGUMENT_SEPARATOR)[0] ?? command
  if (new RegExp(`(^|\\s)${long}(=|\\s)`).test(beforeSeparator)) return true
  return Boolean(short && new RegExp(`(^|\\s)${short}(=|\\s)`).test(beforeSeparator))
}

function requireFlags(command: string, requirements: Array<[string, string?]>) {
  const missing = requirements.filter(([long, short]) => !hasFlag(command, long, short)).map(([long, short]) => (short ? `${long}/${short}` : long))
  if (missing.length === 0) return
  throw new Error(`Refusing mutating ops command without explicit target flag(s): ${missing.join(", ")}. Command: ${command}`)
}

function splitCommand(command: string) {
  return command
    .split(/\s*(?:&&|\|\||;|\|)\s*/)
    .map((segment) => segment.trim())
    .filter(Boolean)
}

function stripSafePrefixes(command: string) {
  let current = command.trim()
  let previous = ""
  while (current !== previous) {
    previous = current
    current = current.replace(/^(?:rtk|sudo|command|time)\s+/, "")
    current = current.replace(/^env\s+(?:[A-Za-z_][A-Za-z0-9_]*=(?:'[^']*'|"[^"]*"|\S+)\s+)+/, "")
    current = current.replace(/^(?:[A-Za-z_][A-Za-z0-9_]*=(?:'[^']*'|"[^"]*"|\S+)\s+)+/, "")
  }
  return current
}

function isTerraformAutoApproveDisabled(command: string) {
  if (/(^|\s)-auto-approve(=true)?(?=\s|$)/.test(command)) return false
  return /(^|\s)-auto-approve=false(?=\s|$)/.test(command)
}

export const SafeOpsGuardPlugin: Plugin = async () => {
  return {
    "tool.execute.before": async (input, output) => {
      const tool = String(input?.tool ?? "").toLowerCase()
      if (tool !== "bash" && tool !== "shell") return

      const args = output?.args as Record<string, unknown> | undefined
      const command = typeof args?.command === "string" ? args.command : ""
      if (!command) return

      if (/\b(?:bash|sh|zsh)\s+-[lc]\b/.test(command) && /\b(aws|kubectl|helm|terraform|tofu)\b/.test(command)) {
        throw new Error("Refusing nested shell ops command. Run the ops command directly so safety guards can inspect it.")
      }

      for (const segment of splitCommand(command).map(stripSafePrefixes)) {
        if (AWS_COMMAND.test(segment) && !AWS_READONLY.test(segment)) {
          requireFlags(segment, [["--profile"], ["--region"]])
        }
        if (KUBECTL_MUTATING.test(segment)) {
          const required: Array<[string, string?]> = KUBECTL_CLUSTER_SCOPED.test(segment) ? [["--context"]] : [["--context"], ["--namespace", "-n"]]
          requireFlags(segment, required)
        }
        if (HELM_MUTATING.test(segment)) {
          requireFlags(segment, [["--kube-context"], ["--namespace", "-n"]])
        }
        if (TERRAFORM_MUTATING.test(segment) && !isTerraformAutoApproveDisabled(segment)) {
          throw new Error("Refusing terraform/tofu apply/destroy unless -auto-approve=false is explicitly set and -auto-approve is absent.")
        }
      }
    },
  }
}
