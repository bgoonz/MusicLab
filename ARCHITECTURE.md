# Practice Lab architecture

## What this first version covers

The interface is a production-shaped prototype for transcript upload, AI tool suggestion, tool preview, and a searchable community catalog. It includes the durable data bindings the deployed product needs, but deliberately does not place an AI key, GitHub token, or billing secret in browser code.

## Safe generation and publishing flow

1. A signed-in user uploads a transcript. The original file is stored privately in `UPLOADS`; searchable metadata lives in `DB`.
2. A server route sends only the authorized transcript to the configured AI provider and asks for a strict JSON tool specification—not arbitrary executable code.
3. A deterministic renderer converts that specification into a tool from an approved component set (metronome, loop player, rhythm grid, timer, pitch/ear trainer).
4. The generated tool runs in an isolated preview with resource limits. Static checks, schema validation, and automated interaction tests must pass.
5. On publish, the server creates a short-lived branch through a GitHub App, commits only the generated tool manifest/component, and opens a pull request. A CI workflow validates and deploys it. Never expose a personal access token to the client or let generated code write directly to the default branch.
6. After merge, a webhook marks the tool `published` in `DB`; it then appears in the shared catalog.

## Service boundaries to connect next

- `AI_PROVIDER_API_KEY`: server-only secret for transcript analysis and tool specs.
- `GITHUB_TOKEN`: a server-only fine-grained token restricted to `bgoonz/MusicLab`, with Contents and Pull requests write access. The first production hardening step is replacing this with short-lived GitHub App installation tokens.
- `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`: Stripe Checkout plus a webhook-backed usage ledger. Charge money into credits; reserve credits before an AI request and finalize against measured token usage afterward.
- Authentication: required for uploads, drafts, publishing, credits, and moderation history.

## Prepaid credit behavior

- Checkout packages are closed-loop, non-transferable Practice Lab credits.
- One US dollar purchased becomes one dollar of metered AI balance. Processing fees are currently absorbed by the product; add a margin or package fee before broad public launch.
- The Stripe webhook is the only path that adds balance. It verifies the raw request signature, validates the server-defined package amount, requires a matching pending order, and uses the Stripe Checkout Session ID as an idempotency key.
- Before calling an AI provider, the server atomically reserves a maximum cost. After the response, it records input/output token counts, debits the actual provider cost, and refunds the unused reservation.

## Categories

Use a controlled top-level taxonomy so search stays useful: `Metronome`, `Play-along`, `Rhythm`, `Ear training`, `Technique`, `Sight-reading`, and `Theory`. AI may suggest tags, but the server must validate the primary category against this list.
