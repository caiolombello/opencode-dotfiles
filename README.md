# opencode-dotfiles

Personal OpenCode configuration — agents, plugins, and settings for the OpsTeam + Ana Gaming workflow.

## What this is

This repo tracks the custom OpenCode configuration that lives in `~/.config/opencode/`:

- **17 custom primary/subagents** (`agents/`) — YOLO, plan, build, ops, incident, reviewer, debugger, docs-verifier, sre-advisor, cost-optimizer, security-auditor, security-reviewer, terraform-planner, finops-analyzer, aws-troubleshooter, k8s-specialist, network-specialist
- **6 custom plugins** (`plugins/`) — delegate-to-agent, secret-redactor, safe-ops-guard, handoff-on-compact, yolo-router, rtk
- **`opencode.json`** — MCP servers (Context7, Grafana OpsTeam/AnaGaming, Kagi, Atlassian), permissions, and plugin list
- **`package.json`** — plugin dependencies (`@opencode-ai/plugin`, `opencode-notify`, etc.)

## Install

```bash
git clone https://github.com/caiolombello/opencode-dotfiles.git
cd opencode-dotfiles
./install.sh
```

The install script:
1. Backs up your current `~/.config/opencode/` to `~/.config/opencode.backup.<timestamp>`
2. Symlinks `agents/` and `plugins/` from this repo into `~/.config/opencode/`
3. Copies `opencode.json` and `package.json` (so you can edit locally without affecting the repo until you commit)

## Update

```bash
cd ~/Documents/Personal/opencode-dotfiles  # or wherever you cloned it
git pull
./install.sh
```

## Add a new plugin or agent

1. Create the file in this repo under `agents/` or `plugins/`
2. Test it: `bun build plugins/my-new-plugin.ts`
3. Run `./install.sh` to sync
4. Commit and push

## Security note

No secrets are committed. `opencode.json` uses `{env:VAR_NAME}` placeholders for all tokens. The actual secrets live in your shell environment or pass-cli.

## Repo structure

```
opencode-dotfiles/
├── README.md
├── install.sh
├── opencode.json          # main config (MCPs, permissions, plugins)
├── package.json           # plugin dependencies
├── agents/                # 17 custom agents
│   ├── yolo.md
│   ├── plan.md
│   ├── build.md
│   ├── ops.md
│   ├── incident.md
│   ├── reviewer.md
│   ├── docs-verifier.md
│   ├── sre-advisor.md
│   ├── debugger.md
│   ├── cost-optimizer.md
│   ├── security-auditor.md
│   ├── security-reviewer.md
│   ├── terraform-planner.md
│   ├── network-specialist.md
│   ├── k8s-specialist.md
│   ├── finops-analyzer.md
│   └── aws-troubleshooter.md
└── plugins/               # 6 custom plugins
    ├── delegate-to-agent.ts
    ├── secret-redactor.ts
    ├── safe-ops-guard.ts
    ├── handoff-on-compact.ts
    ├── yolo-router.ts
    └── rtk.ts
```

## License

MIT
