# Changelog

All notable changes to this plugin will be documented here.

## 1.0.0 — initial release

- Added the `gohighlevel` MCP server pointing at `https://services.leadconnectorhq.com/mcp/`.
- Auth uses a HighLevel Private Integration Token supplied by the user as a request header, plus the sub-account's `locationId`. The universal endpoint offers no Dynamic Client Registration, so a browser OAuth flow is not available to Cursor.
