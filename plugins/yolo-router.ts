import type { Plugin } from "@opencode-ai/plugin"
import { tool } from "@opencode-ai/plugin"

const ROUTES = [
  {
    agent: "plan",
    confidence: "high",
    patterns: [
      /\b(plan|plano|planeje|planejamento|roadmap|arquitetura|architecture|design|spec|espec|blueprint|estrat[eé]gia|strategy)\b/i,
    ],
  },
  {
    agent: "reviewer",
    confidence: "high",
    patterns: [
      /\b(review|revise|revis[ãa]o|code review|cr|audit|auditoria|code quality|qualidade de c[oó]digo)\b/i,
    ],
  },
  {
    agent: "debugger",
    confidence: "high",
    patterns: [
      /\b(debug|debugue|bug|erro|error|falha|fail|stack trace|trace|troubleshoot|diagnose|diagn[oó]stico)\b/i,
    ],
  },
  {
    agent: "incident",
    confidence: "high",
    patterns: [
      /\b(incidente|incident|outage|down|paged|sev[0-9]|p0|p1|emergency|war room|on[- ]?call|produ[cç][aã]o caiu|site fora)\b/i,
    ],
  },
  {
    agent: "sre-advisor",
    confidence: "medium",
    patterns: [
      /\b(sre|slo|slis|observability|monitoring|monitoramento|alert|alerta|runbook|deploy safety|rollback)\b/i,
    ],
  },
  {
    agent: "docs-verifier",
    confidence: "medium",
    patterns: [
      /\b(docs?[- ]?verify|verificar documenta[cç][aã]o|doc check|docs check|documenta[cç][aã]o correta)\b/i,
    ],
  },
]

function detectIntent(text: string) {
  for (const route of ROUTES) {
    if (route.patterns.some((p) => p.test(text))) {
      return route
    }
  }
  return null
}

export const YoloRouterPlugin: Plugin = async ({ client }) => {
  return {
    tool: {
      yolo_route: tool({
        description:
          "Analyze a user request and auto-route it to the best OpenCode agent if the intent is clear. Use this when the current task is clearly about planning, code review, debugging, incident response, SRE advice, or docs verification.",
        args: {
          prompt: tool.schema
            .string()
            .min(1)
            .describe("The user request to analyze for routing."),
          auto_delegate: tool.schema
            .boolean()
            .optional()
            .describe("If true (default), automatically delegate to the detected agent."),
        },
        async execute(args, context) {
          const route = detectIntent(args.prompt)
          if (!route) {
            return "No strong routing signal detected. Continue with the current agent."
          }

          if (args.auto_delegate !== false) {
            const result = await client.session.promptAsync({
              path: { id: context.sessionID },
              query: { directory: context.directory },
              body: {
                agent: route.agent,
                tools: { yolo_route: false, delegate_to_agent: false },
                parts: [{ type: "text", text: args.prompt }],
              },
            })

            if (result.error) {
              throw new Error(`Routing to '${route.agent}' failed: ${result.error.message}`)
            }

            return `Auto-routed to '${route.agent}' (${route.confidence} confidence).`
          }

          return `Suggested agent: '${route.agent}' (${route.confidence} confidence). Call delegate_to_agent if you want to hand off.`
        },
      }),
    },
  }
}
