# mcp-marketplace

A Cursor **team marketplace** repository for MCP server plugins. Import it once in the Cursor dashboard, and
every plugin in `plugins/` becomes installable by your team.

The layout follows [`cursor/plugins`](https://github.com/cursor/plugins) and
[`Shopify/shop`](https://github.com/Shopify/shop): a Cursor marketplace index plus parallel indexes for Claude
Code and the Agent Plugins standard, so one plugin installs in every client.

## Set up this repo

1. Create an empty GitHub repository and push this tree to it.
2. Name the marketplace and claim ownership:

   ```bash
   node scripts/init-marketplace.mjs --name acme-plugins --owner "Acme Inc" --email plugins@acme.com
   ```

   This rewrites the three marketplace indexes, every plugin manifest, and the LICENSE. Several of those
   files live in dot-directories that `grep` and most editors skip by default, which is why it is a script
   rather than a find-and-replace.
3. Add your first real plugin (below), then delete `plugins/example-mcp/` and its three marketplace entries.
4. Run `node scripts/validate.mjs`. It must print `ok`.

## Add an MCP plugin

```bash
node scripts/new-mcp-plugin.mjs \
  --name linear \
  --url https://mcp.linear.app/mcp \
  --description "Search issues, create tickets, and update projects."
```

That writes `plugins/linear/` with every per-client manifest and registers it in all three marketplace
indexes. Pick the auth mode that matches the server:

| Flag | Use when | What it generates |
| --- | --- | --- |
| `--auth none` (default) | The server is public, or it does OAuth with dynamic client registration | A bare `url` entry; Cursor handles the sign-in prompt |
| `--auth token` | The user pastes an API token | A `variables` block plus `Authorization: Bearer ${TOKEN}` |
| `--auth oauth` | You registered an OAuth client with the provider | An `auth` block taking `CLIENT_ID` / `CLIENT_SECRET` |

Secrets are never committed. `--auth token` and `--auth oauth` declare *names* in the manifest's `variables`
schema; the values are entered per-install under **Plugins → Configure** in the dashboard, and `mcp.json`
carries only `${PLACEHOLDER}` references. The validator fails the build on a literal credential.

For `--auth oauth`, register both Cursor redirect URLs with the provider first:
`https://www.cursor.com/agents/mcp/oauth/callback` (web and Cursor Agents) and
`http://localhost:8787/callback` (desktop).

Then add a logo at `plugins/<name>/assets/logo.svg`, point `"logo"` at it in
`plugins/<name>/.cursor-plugin/plugin.json`, and run the validator. Relative logo paths resolve against the
repo on `raw.githubusercontent.com`, so the file must be committed.

See [`docs/add-an-mcp-plugin.md`](docs/add-an-mcp-plugin.md) to write the files by hand instead.

## Install it as a team marketplace

1. Go to **Dashboard → Plugins & MCPs**.
2. Under **Team Marketplaces**, click **Add Marketplace**.
3. Choose **Import from Repo** and paste this repository's URL. GitHub, GitLab, Bitbucket, and Azure DevOps
   all work; connect the provider if Cursor asks.
4. Review the plugins and use **Add to Marketplace**.
5. Under **Marketplace Settings**, set **Marketplace Access** and optionally enable **Auto Refresh**, then
   save.

Teams plans get one team marketplace; Enterprise plans get unlimited, and only admins can add them. Auto
Refresh needs the Cursor GitHub App installed on the repository and re-indexes at most once every 10 minutes.

To try a plugin before publishing it, the CLI registers a marketplace at user scope:

```bash
agent plugin marketplace add https://github.com/YOUR-ORG/mcp-marketplace
agent plugin marketplace list
```

## Layout

```
.cursor-plugin/marketplace.json     Cursor index — the file Cursor reads at the repo root
.claude-plugin/marketplace.json     Claude Code index
.agents/plugins/marketplace.json    Agent Plugins standard index
plugins/<name>/
├── .cursor-plugin/plugin.json      Cursor manifest; points mcpServers at ./mcp.json
├── mcp.json                        Server definition read by Cursor
├── plugin.json                     Agent Plugins standard manifest
├── .mcp.json                       Server definition read by Claude Code and Codex
├── .claude-plugin/plugin.json      Claude Code manifest
├── .codex-plugin/plugin.json       Codex manifest
├── assets/logo.svg                 Marketplace icon
├── README.md
└── CHANGELOG.md
scripts/init-marketplace.mjs        One-time rename of the scaffold placeholders
scripts/new-mcp-plugin.mjs          Plugin generator
scripts/validate.mjs                CI gate
```

Only `.cursor-plugin/` is needed for Cursor. The other two indexes cost nothing to keep and make the same
plugins installable outside Cursor; `scripts/validate.mjs` fails if they drift out of sync.

## Validation

```bash
node scripts/validate.mjs
```

No dependencies, no install step — Node 20+ built-ins only. It runs on every pull request and checks that
each listed plugin exists, that the per-client manifests agree on name and version, that `mcp.json` and
`.mcp.json` describe the same servers, that every `${VARIABLE}` in an MCP config is declared in the manifest,
that no credential is hardcoded or embedded in a URL, and that marketplace entries carry only the four
fields Cursor's schema allows (`name`, `source`, `description`, `minClientVersions`) — everything else
belongs in the plugin's own `plugin.json`.

## License

MIT
