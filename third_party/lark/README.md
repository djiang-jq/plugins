# Lark

Cursor plugin that connects agents to [Lark](https://www.larksuite.com) through Lark's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Search, create, fetch, and update Lark Docs, work with doc comments and files, and read groups and messages in the signed-in Lark account.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Lark**.
3. Click **Install**, then complete the Lark sign-in prompt.

Or run `/add-plugin lark` in chat.

## MCP

```json
{
  "mcpServers": {
    "lark": {
      "type": "http",
      "url": "https://mcp.larksuite.com/mcp"
    }
  }
}
```

Auth is MCP OAuth. Cursor discovers Lark's authorization server from the server URL when the plugin connects and prompts for Lark sign-in — there is no app ID, app secret, access token, or custom header to configure.

## Before you connect

You need a Lark Suite account. Requests are rejected until sign-in completes.

This plugin talks only to `https://mcp.larksuite.com/mcp`, the endpoint for Lark Suite, the international product. Accounts on China-region Feishu use a different server (`https://mcp.feishu.cn/mcp`) and are not covered by this plugin.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Docs | Search, create, fetch, and update docs, list docs, and read and write doc comments |
| Messages | Search groups, list group members, read messages and threads, and check read status |
| People and files | Look up the signed-in user, search users, and fetch files |

The hosted runtime is the source of truth for the tool names and schemas it advertises; see Lark's MCP documentation for the current list.

## Notes

- Tool calls run as the Lark user who authorizes the connection and cannot exceed that user's own permissions.
- This is a URL-only connector to Lark's hosted server. It does not wrap the local `@larksuiteoapi/lark-mcp` stdio server, which is configured separately with an app ID and secret.
- Revoke access at any time from your Lark account.

## Docs

- Lark MCP introduction: https://open.larksuite.com/document/uAjLw4CM/ukTMukTMukTM/mcp_integration/mcp_introduction
- Lark Open Platform: https://open.larksuite.com
- Server URL: https://mcp.larksuite.com/mcp

Logo is Lark's official bird mark, as published by Lark Technologies Pte. Ltd. on the `larksuite` GitHub organization.

## License

MIT
