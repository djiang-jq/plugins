# Jobber

Cursor plugin that connects agents to [Jobber](https://www.getjobber.com/) through Jobber's remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Jobber is the operations system for home service businesses — cleaning, landscaping, HVAC, plumbing, and the rest of the trades. With the plugin connected, agents can work with the signed-in Jobber account: look up clients and their properties, review requests, quotes, jobs, and visits on the schedule, and check invoices and payments.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Jobber**.
3. Click **Install**, then complete the Jobber sign-in prompt.

Or run `/add-plugin jobber` in chat.

## MCP

```json
{
  "mcpServers": {
    "jobber": {
      "type": "http",
      "url": "https://mcp.getjobber.com/mcp"
    }
  }
}
```

Auth is OAuth against Jobber. Cursor prompts for Jobber sign-in when the plugin connects — there is no API key or client ID to configure. Each user signs in with their own Jobber account.

## Before you connect

You need a Jobber account. Tool calls run as the Jobber user who authorizes the connection and are bound by that user's permissions in the account, so an agent cannot read or change anything the signed-in user could not do in Jobber itself.

## Notes

- Jobber records contain customer data — names, addresses, phone numbers, and payment history. Treat anything the agent reads back as confidential.
- The hosted runtime is the source of truth for which tools exist and what they accept; tool names and schemas can change without notice.
- Jobber's underlying Developer API is GraphQL and is rate limited by query cost, so broad "list everything" requests may be throttled. Ask for the specific clients, jobs, or invoices you need.

## Docs

- Jobber: https://www.getjobber.com/
- Jobber Developer Center: https://developer.getjobber.com/docs/
- Server URL: https://mcp.getjobber.com/mcp

Logo is Jobber's official brandmark, white on Jobber green (`#7DB00E`).

## License

MIT
