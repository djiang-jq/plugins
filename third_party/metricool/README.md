# Metricool

Cursor plugin that connects agents to [Metricool](https://metricool.com) through Metricool's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

List your brands, review the planner, schedule and update posts, find the best time to post, and pull analytics across Instagram, Facebook, X, LinkedIn, TikTok, YouTube, Pinterest, Twitch, Bluesky, Threads, Google Business Profile, Facebook Ads, and TikTok Ads — all from chat.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Metricool**.
3. Click **Install**, then complete the Metricool sign-in prompt.

Or run `/add-plugin metricool` in chat.

## MCP

```json
{
  "mcpServers": {
    "metricool": {
      "type": "http",
      "url": "https://ai.metricool.com/mcp"
    }
  }
}
```

Auth is OAuth 2.0 (authorization code + PKCE). Cursor prompts for Metricool sign-in when the plugin connects — there is no API key to configure. Each user signs in with their own Metricool account. The server requests `mcp:read` (brands, planner, analytics) and `mcp:write` (create and update scheduled posts).

## Before you connect

You need a Metricool account ([sign up](https://metricool.com)) with at least one brand and connected social network. Tools act on every brand the signed-in user can access, so multi-brand and agency accounts should name the brand they mean.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Brands | `get_brand_settings` lists the account's brands with their connected networks, timezone, and competitor tracking |
| Planner | `get_scheduled_posts` returns published, pending, and draft posts for a brand in a date range (up to a month) |
| Scheduling | `create_scheduled_post` schedules a post to one or more networks, including Reels, Stories, carousels, Shorts, LinkedIn polls, and TikTok videos; `update_scheduled_post` edits an existing scheduled post. Both return a `plannerUrl` to open the post in Metricool |
| Best time | `get_best_time_to_post_by_network` scores hours and days by past audience engagement for a network |
| Analytics | `get_analytics_available_metrics` lists valid metric IDs for a network and connector; `get_analytics_data_by_metrics` pulls those metrics for a brand over a date range, including Facebook Ads and TikTok Ads |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- **Scheduled posts go live on real social accounts.** Confirm the brand, networks, text, media, and time before letting the agent schedule or update a post, and leave Cursor's tool-approval prompts on for write tools.
- Scheduled dates cannot be in the past, and character limits are enforced per network; the server reports a limit error rather than truncating or splitting posts into threads.
- Call `get_analytics_available_metrics` before `get_analytics_data_by_metrics` — metric IDs are network- and connector-specific.

## Docs

- Metricool: https://metricool.com
- Help center: https://help.metricool.com
- Privacy policy: https://metricool.com/privacy-policy/
- Server URL: https://ai.metricool.com/mcp

Logo is Metricool's official app icon from https://metricool.com.

## License

MIT
