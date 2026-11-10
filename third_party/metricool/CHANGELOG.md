# Changelog

All notable changes to this plugin will be documented here.

## 1.0.0 — initial release

- Added the `metricool` MCP server pointing at Metricool's hosted Streamable HTTP endpoint (`https://ai.metricool.com/mcp`), with `"placement": "server"` so Grok Bot dials it through the hosted MCP path.
- Auth uses OAuth 2.0 (authorization code + PKCE) with Metricool user login — no API key to configure.
- Logo: Metricool's official app icon (dark infinity mark on the brand lime tile), 180×180.
