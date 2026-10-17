# Add an MCP plugin by hand

`scripts/new-mcp-plugin.mjs` writes all of this for you. Follow these steps when you need a shape the
generator does not cover — a stdio server, several servers in one plugin, or a plugin that also ships skills
and rules.

## 1. Create the directory

```
plugins/<name>/
```

`<name>` must be lowercase kebab-case and start and end with an alphanumeric character
(`^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$`). Use the same string everywhere: directory, every manifest's `name`,
the marketplace entry, and the key inside `mcpServers`.

## 2. Write the Cursor manifest

`plugins/<name>/.cursor-plugin/plugin.json`:

```json
{
  "name": "<name>",
  "displayName": "<Display Name>",
  "version": "1.0.0",
  "minClientVersions": { "cursor": "3.13.0" },
  "description": "One line. The marketplace card shows it.",
  "author": { "name": "YOUR-ORG" },
  "homepage": "https://github.com/YOUR-ORG/mcp-marketplace/tree/main/plugins/<name>",
  "repository": "https://github.com/YOUR-ORG/mcp-marketplace",
  "license": "MIT",
  "logo": "assets/logo.svg",
  "keywords": ["<name>", "mcp"],
  "category": "integrations",
  "mcpServers": "./mcp.json"
}
```

Cursor's schema sets `additionalProperties: false`, so an unrecognised key fails validation. The accepted
fields are `name`, `displayName`, `description`, `version`, `minClientVersions`, `author`, `publisher`,
`homepage`, `repository`, `license`, `logo`, `keywords`, `category`, `tags`, `commands`, `agents`, `skills`,
`rules`, `hooks`, `variables`, and `mcpServers`.

`mcpServers` takes a path, an inline object, or an array of either. Omitting it makes Cursor discover
`mcp.json` at the plugin root. Specifying it *replaces* discovery rather than adding to it.

## 3. Write the server definition

`plugins/<name>/mcp.json`:

```json
{
  "mcpServers": {
    "<name>": {
      "type": "http",
      "url": "https://mcp.example.com/mcp"
    }
  }
}
```

A remote server sets `url`; a stdio server sets `command` (plus optional `args`, `env`, `envFile`) and
`"type": "stdio"`. `envFile` is remote-incompatible. Cursor expands `${CURSOR_PLUGIN_ROOT}` in `command`,
`args`, `env` values, and `cwd` — not the standard's `${PLUGIN_ROOT}`.

A stdio server runs on the user's machine, so prefer a remote server for anything a team installs.

## 4. Declare any secret as a variable

Never commit a token. Declare the name in the manifest and reference it from `mcp.json`:

```json
{
  "variables": {
    "type": "object",
    "properties": {
      "EXAMPLE_API_TOKEN": {
        "type": "string",
        "title": "Example API token",
        "description": "Where to get it."
      }
    },
    "required": ["EXAMPLE_API_TOKEN"]
  }
}
```

```json
{ "headers": { "Authorization": "Bearer ${EXAMPLE_API_TOKEN}" } }
```

`${EXAMPLE_API_TOKEN}` is a plugin variable, not shell `${env:...}`. `${NAME:-}` supplies an empty default
for an optional value. The schema accepts only `type`, `title`, `description`, `default`, `enum`, `const`,
`properties`, `required`, `items`, and the common length and numeric constraints; the top level must be
`{ "type": "object", "properties": { ... } }`. Values are entered per-install under **Plugins → Configure**
in the dashboard, where plugin-managed MCP config is read-only.

For OAuth against a client you registered yourself, use `auth` instead of `headers`:

```json
{
  "url": "https://mcp.example.com/mcp",
  "auth": { "CLIENT_ID": "${CLIENT_ID}", "CLIENT_SECRET": "${CLIENT_SECRET:-}" }
}
```

Register `https://www.cursor.com/agents/mcp/oauth/callback` and `http://localhost:8787/callback` with the
provider. Leave `auth` out entirely when the server supports dynamic client registration — Cursor discovers
the authorization server and prompts the user on first use.

## 5. Mirror the manifest for other clients

Four small files keep the plugin installable outside Cursor. `name` and `version` must match the Cursor
manifest, and `.mcp.json` must describe the same servers as `mcp.json`; `scripts/validate.mjs` enforces both.

- `plugins/<name>/plugin.json` — Agent Plugins standard, with
  `"$schema": "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json"`
- `plugins/<name>/.mcp.json` — same content as `mcp.json`
- `plugins/<name>/.claude-plugin/plugin.json`
- `plugins/<name>/.codex-plugin/plugin.json` — adds `"mcpServers": "./.mcp.json"`

## 6. Register it in the three marketplace indexes

`.cursor-plugin/marketplace.json`:

```json
{
  "name": "<name>",
  "source": "plugins/<name>",
  "description": "Same one-liner.",
  "minClientVersions": { "cursor": "3.13.0" }
}
```

A marketplace entry accepts only those four fields. Version, author, logo, category, and tags live in the
plugin's own manifest, and Cursor merges the two at install time with the manifest winning.

`.claude-plugin/marketplace.json`:

```json
{ "name": "<name>", "source": "./plugins/<name>" }
```

`.agents/plugins/marketplace.json`:

```json
{
  "name": "<name>",
  "source": { "source": "local", "path": "./plugins/<name>" },
  "policy": { "installation": "AVAILABLE", "authentication": "ON_USE" },
  "category": "integrations"
}
```

## 7. Validate

```bash
node scripts/validate.mjs
```

Commit only once it prints `ok`. CI runs the same command on every pull request.
