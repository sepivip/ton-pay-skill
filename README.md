# ton-pay-skill

A [Claude Code](https://claude.com/claude-code) skill for integrating [TON Pay](https://docs.ton.org/ecosystem/ton-pay/overview) into web apps, Vanilla JS sites, and Telegram Mini Apps.

> **TL;DR:** clone into your Claude Code skills directory, then ask Claude "add TON Pay checkout to this app." **No TON Pay merchant account is required** — the default path uses client-side polling and works with just a TON recipient address. The skill also covers the optional webhook path (HMAC verification + 7-step validation) for apps that want push-based notifications.

## What's in the box

| Path                                   | What it is                                                              |
| -------------------------------------- | ----------------------------------------------------------------------- |
| `SKILL.md`                             | Skill entry — decision tree, prerequisites, quickstart for 3 frameworks |
| `reference/webhooks.md`                | HMAC-SHA256 verify, retry, idempotency, 7-step validation               |
| `reference/testing.md`                 | Testnet flow, faucet, client-side polling, local tunnel                 |
| `reference/telegram-mini-app.md`       | TMA-specific wiring: theme, back button, wallet redirect                |
| `reference/onramp.md`                  | Fiat → TON onramp for users without balance                             |
| `reference/troubleshooting.md`         | Common pitfalls and fixes                                               |
| `examples/nextjs-app-router/`          | Runnable Next.js 15 example with webhook route                          |
| `examples/vanilla-js/`                 | Static HTML client + Express webhook server                             |
| `examples/telegram-mini-app/`          | Vite + `@telegram-apps/sdk-react` example                               |

## Install the skill into Claude Code

### Option A: clone directly

```bash
git clone https://github.com/sepivip/ton-pay-skill.git ~/.claude/skills/ton-pay
```

Claude Code auto-discovers skills under `~/.claude/skills/`. In your next session, `/skills` will list `ton-pay`, and Claude will surface it whenever you mention TON Pay or TON checkout.

### Option B: project-local

```bash
git submodule add https://github.com/sepivip/ton-pay-skill .claude/skills/ton-pay
```

Commits to your repo, discoverable by Claude Code in that project only.

## Try the examples first

```bash
cd examples/nextjs-app-router
cp .env.example .env.local         # fill in TON Pay testnet credentials
npm install && npm run dev
# Then follow the example's README for ngrok + webhook registration.
```

Each example has its own README with step-by-step setup and a verification checklist.

## What this skill is (and isn't)

**Is:** a merchant checkout skill. User clicks button → wallet signs → funds arrive at merchant address → webhook fires → backend marks order paid.

**Isn't:** a custodial-exchange skill. If you need per-user deposit addresses with automated sweeping to a master wallet, that's a different pattern (highload wallets, block scanning) and out of scope here. A future `ton-custodial-payments` skill may cover that.

## Versioning

- SDK versions are pinned exactly in each example's `package.json` (TON Pay SDK is pre-1.0, so breaking changes happen).
- The skill itself follows SemVer: `v0.1.0` is the initial release.

## Contributing

Issues and PRs welcome. Before opening a PR:
- Run `npm install && npm run build` in every `examples/*` to confirm it still compiles.
- Keep `SKILL.md` tight — push details into a `reference/*.md` file.
- Link-check markdown files.

## License

MIT — see [LICENSE](./LICENSE).

## Credits

TON Pay SDK by the TON Foundation: https://docs.ton.org/ecosystem/ton-pay/overview
