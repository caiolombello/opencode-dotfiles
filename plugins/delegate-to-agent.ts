import type { Plugin } from "@opencode-ai/plugin"
import { tool } from "@opencode-ai/plugin"

const DEFAULT_PROMPT_PREFIX =
  "You were delegated this task by another OpenCode agent. Complete the request using your own agent instructions and report the result back in this session."

const DEFAULT_ALLOWED_AGENTS = new Set([
  "plan",
  "reviewer",
  "security-auditor",
  "security-reviewer",
  "docs-verifier",
  "sre-advisor",
  "cost-optimizer",
  "terraform-planner",
  "finops-analyzer",
  "debugger",
  "explore",
  "scout",
])

export const DelegateToAgentPlugin: Plugin = async ({ client }) => {
  return {
    tool: {
      delegate_to_agent: tool({
        description:
          "Delegate a prompt to a safe allowlisted OpenCode agent in the current session. Use this when the current task is better handled by a planning, review, research, debugging, docs, SRE, FinOps, or Terraform specialist agent. This does not switch the TUI primary agent; it queues a new async turn addressed to the target agent.",
        args: {
          agent: tool.schema
            .string()
            .min(1)
            .describe("Target allowlisted OpenCode agent name, for example: plan, reviewer, docs-verifier, sre-advisor."),
          prompt: tool.schema.string().min(1).describe("Prompt to send to the target agent."),
        },
        async execute(args, context) {
          if (args.agent === context.agent) {
            throw new Error(`Refusing to delegate from '${context.agent}' to itself.`)
          }

          if (!DEFAULT_ALLOWED_AGENTS.has(args.agent)) {
            const allowed = [...DEFAULT_ALLOWED_AGENTS].sort().join(", ")
            throw new Error(
              `Refusing to delegate to '${args.agent}' because it is not in the safe delegation allowlist. Allowed agents: ${allowed}`,
            )
          }

          const agentsResult = await client.app.agents({ query: { directory: context.directory } })
          if (agentsResult.error) {
            throw new Error(`Failed to list OpenCode agents: ${agentsResult.error.message}`)
          }

          const agents = agentsResult.data ?? []
          const target = agents.find((agent) => agent.name === args.agent)
          if (!target) {
            const available = agents.map((agent) => agent.name).sort().join(", ") || "none"
            throw new Error(`Unknown OpenCode agent '${args.agent}'. Available agents: ${available}`)
          }

          const prompt = `${DEFAULT_PROMPT_PREFIX}\n\n${args.prompt}`
          context.metadata({
            title: `Delegate to ${target.name}`,
            metadata: { agent: target.name, mode: target.mode },
          })

          const result = await client.session.promptAsync({
            path: { id: context.sessionID },
            query: { directory: context.directory },
            body: {
              agent: target.name,
              tools: { delegate_to_agent: false },
              parts: [{ type: "text", text: prompt }],
            },
          })

          if (result.error) {
            throw new Error(`Failed to delegate to '${target.name}': ${result.error.message}`)
          }

          return `Queued delegation to '${target.name}' (${target.mode}) in this session.`
        },
      }),
    },
  }
}
