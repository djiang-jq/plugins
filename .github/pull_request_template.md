## What

<!-- Which plugin, and what changed. -->

## Checklist

- [ ] `node scripts/validate.mjs` prints `ok`
- [ ] No credential is committed; every secret is a `${VARIABLE}` declared in the manifest
- [ ] The MCP server URL is reachable and is the vendor's official endpoint
- [ ] `version` bumped in all four per-client manifests, and `CHANGELOG.md` updated
- [ ] A logo exists at `plugins/<name>/assets/logo.svg` and is referenced by the manifest
