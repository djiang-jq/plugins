# HighLevel

Cursor plugin that connects agents to [HighLevel](https://www.gohighlevel.com) (GoHighLevel) through HighLevel's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server, LeadConnector MCP.

Search contacts and conversations, read and update opportunities, check calendars, and send messages from a single HighLevel sub-account.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **HighLevel**.
3. Click **Install**, then set your Private Integration Token and location ID (below).

Or run `/add-plugin gohighlevel` in chat.

## MCP

```json
{
  "mcpServers": {
    "gohighlevel": {
      "type": "http",
      "url": "https://services.leadconnectorhq.com/mcp/",
      "headers": {
        "Authorization": "Bearer ${GHL_PRIVATE_INTEGRATION_TOKEN}",
        "locationId": "${GHL_LOCATION_ID}"
      }
    }
  }
}
```

Auth is a HighLevel **Private Integration Token** (PIT) sent as a bearer token. Create one in the sub-account under **Settings → Private Integrations**, selecting the scopes your agent needs, then set it in **Dashboard → Plugins → Configure** along with the sub-account's location ID.

HighLevel's universal MCP endpoint does not offer Dynamic Client Registration, so a token is the supported path for clients like Cursor rather than a browser OAuth flow. HighLevel's OAuth support is delivered through per-client endpoints (`/mcp/{client}/v2`) backed by a registry of pre-registered OAuth apps, one per official client. Claude and OpenAI clients have one today; Cursor is listed as planned.

## Client support

This plugin is for Cursor. A pasted token is a local-client shape: Grok Bot dials MCP servers through the hosted path, where the user connects from a sign-in card rather than editing a config, so a plugin carrying `variables` has nowhere to collect them.

The absent DCR is less of a blocker on Grok Bot than it is here, though, because the Grok connector can carry an OAuth client that xAI registered ahead of time — see `shopify-store`, which is Grok Bot only for exactly this reason. HighLevel's per-client registry is already that same model, so a Grok Bot build of this plugin wants a `/mcp/{client}/v2` endpoint registered for xAI, then `placement: "server"`, no `variables`, and `cursor: "never"`. That is a registration HighLevel has to grant, not a config change here.

## Before you connect

- The token is created per sub-account, and a connection is scoped to that one sub-account.
- `locationId` is documented as optional on this endpoint — an agent can supply it per prompt — but setting it avoids having to name the sub-account in every request.
- Tools appear only when the token carries their scope, so a narrowly scoped token yields a short tool list.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Contacts | Search, read, create, update, and tag contacts |
| Conversations | Search threads, read messages, and send messages |
| Opportunities | Search pipelines and read or update opportunities |
| Calendars | List calendars, read events, and check free slots |
| Payments | Read orders and transactions |
| Content | Social planner posts, blog posts, and emails |
| Locations | Read sub-account details and custom fields |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Tool calls run with the scopes granted to the token, under the sub-account it was created in.
- `https://services.leadconnectorhq.com/mcp/` is served over streamable HTTP; requests need `Accept: application/json, text/event-stream`.
- The per-client endpoints at `https://services.leadconnectorhq.com/mcp/{client}/v2` expose a much larger catalog through four discovery tools (`list_locations`, `search_operations`, `describe_operation`, `execute_operation`) and can span several sub-accounts in one connection. They are gated to clients HighLevel has registered an OAuth app for. Move this plugin to `/mcp/cursor/v2` once that endpoint ships.
- Keep the token out of shared prompts and screenshots. It carries the same access as the scopes you granted it.

## Docs

- LeadConnector MCP server: https://marketplace.gohighlevel.com/docs/other/mcp
- Setup guide: https://help.gohighlevel.com/support/solutions/articles/155000005741-how-to-setup-and-use-the-highlevel-mcp-server
- Private Integration Tokens: https://marketplace.gohighlevel.com/docs/Authorization/PrivateIntegrationsToken
- Per-client endpoints: https://help.gohighlevel.com/support/solutions/articles/155000008391-highlevel-mcp-for-anthropic-increased-scopes
- Server URL: https://services.leadconnectorhq.com/mcp/

## License

MIT
