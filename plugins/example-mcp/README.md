# Example MCP

Template plugin for a remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Nothing here talks to a real service: `https://mcp.example.com/mcp` is a placeholder, and `scripts/validate.mjs`
fails the build if that URL is still in a plugin other than this one. Use this directory as the reference for
what a finished MCP plugin looks like, then delete it.

## Files

| File | Read by | Purpose |
| --- | --- | --- |
| `.cursor-plugin/plugin.json` | Cursor | Manifest. Points `mcpServers` at `./mcp.json`. |
| `mcp.json` | Cursor | Server definition. |
| `plugin.json` | Agent Plugins standard | Manifest for non-Cursor clients. |
| `.mcp.json` | Claude Code, Codex | Server definition for non-Cursor clients. |
| `.claude-plugin/plugin.json` | Claude Code | Manifest. |
| `.codex-plugin/plugin.json` | Codex | Manifest. |
| `assets/logo.svg` | Cursor | Marketplace icon. |

Keeping `mcp.json` and `.mcp.json` identical is what lets one plugin install in every client. The validator
compares them and fails if they drift.

## Auth

This template declares no auth, which is right for a server that is either public or uses OAuth with dynamic
client registration — Cursor discovers the authorization server and prompts the user to sign in on first use.

For a server that wants a user-supplied token, declare the variable in the manifest and reference it from
`mcp.json`; never commit the value:

```json
{
  "variables": {
    "type": "object",
    "properties": {
      "EXAMPLE_API_TOKEN": {
        "type": "string",
        "title": "Example API token",
        "description": "Create one at https://example.com/settings/tokens."
      }
    },
    "required": ["EXAMPLE_API_TOKEN"]
  },
  "mcpServers": "./mcp.json"
}
```

```json
{
  "mcpServers": {
    "example-mcp": {
      "type": "http",
      "url": "https://mcp.example.com/mcp",
      "headers": {
        "Authorization": "Bearer ${EXAMPLE_API_TOKEN}"
      }
    }
  }
}
```

For OAuth with a pre-registered client, use an `auth` block instead of headers. Register
`https://www.cursor.com/agents/mcp/oauth/callback` and `http://localhost:8787/callback` as redirect URLs with
the provider first.

```json
{
  "mcpServers": {
    "example-mcp": {
      "url": "https://mcp.example.com/mcp",
      "auth": {
        "CLIENT_ID": "${CLIENT_ID}",
        "CLIENT_SECRET": "${CLIENT_SECRET}"
      }
    }
  }
}
```

`scripts/new-mcp-plugin.mjs --auth token|oauth` generates either shape for you.

## License

MIT
