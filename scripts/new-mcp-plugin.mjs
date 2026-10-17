#!/usr/bin/env node
// Generates one MCP plugin and registers it in all three marketplace manifests.
// Node >= 20, built-ins only, no install step.
//
//   node scripts/new-mcp-plugin.mjs \
//     --name linear \
//     --url https://mcp.linear.app/mcp \
//     --description "Search issues, create tickets, and update projects."
//
// Auth modes:
//   --auth none    remote server is public, or uses OAuth with dynamic client registration (default)
//   --auth token   user supplies a token; sent as an Authorization header
//   --auth oauth   you pre-registered an OAuth client; user supplies CLIENT_ID and CLIENT_SECRET
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PLUGIN_NAME = /^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/;

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) die(`unexpected argument "${token}"`);
    const [flag, inline] = token.slice(2).split(/=(.*)/s);
    const value = inline ?? (argv[i + 1]?.startsWith('--') ? undefined : argv[++i]);
    args[flag] = value ?? 'true';
  }
  return args;
}

function die(message) {
  console.error(`error  ${message}`);
  console.error('\nusage: node scripts/new-mcp-plugin.mjs --name <id> --url <https url> --description <text>');
  console.error('       [--display-name <text>] [--auth none|token|oauth] [--token-var NAME]');
  console.error('       [--category <text>] [--keywords a,b,c] [--homepage <url>] [--version X.Y.Z]');
  process.exit(1);
}

const writeJson = (path, value) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
};
const writeText = (path, value) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, value);
};
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

// A remote URL can carry userinfo (https://user:token@host/...). It must never reach a manifest.
function stripCredentials(url) {
  try {
    const parsed = new URL(url);
    parsed.username = '';
    parsed.password = '';
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return url;
  }
}

const args = parseArgs(process.argv.slice(2));
const name = args.name;
const url = args.url;
const description = args.description;
const auth = args.auth ?? 'none';
const version = args.version ?? '1.0.0';

if (!name) die('--name is required');
if (!PLUGIN_NAME.test(name)) die(`--name "${name}" must be lowercase kebab-case, starting and ending alphanumeric`);
if (!url) die('--url is required');
if (!description) die('--description is required');
if (!['none', 'token', 'oauth'].includes(auth)) die(`--auth "${auth}" must be none, token, or oauth`);

let parsedUrl;
try {
  parsedUrl = new URL(url);
} catch {
  die(`--url "${url}" is not a valid URL`);
}
if (parsedUrl.protocol !== 'https:') die(`--url "${url}" must use https`);

const pluginDir = join(root, 'plugins', name);
if (existsSync(pluginDir)) die(`plugins/${name} already exists`);

const marketplacePath = join(root, '.cursor-plugin', 'marketplace.json');
const marketplace = readJson(marketplacePath);
if ((marketplace.plugins ?? []).some((entry) => entry.name === name)) {
  die(`"${name}" is already listed in .cursor-plugin/marketplace.json`);
}

const owner = marketplace.owner?.name ?? 'YOUR-ORG';
const displayName = args['display-name']
  ?? name.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
const category = args.category ?? 'integrations';
const keywords = (args.keywords ?? `${name},mcp`).split(',').map((k) => k.trim()).filter(Boolean);
const tokenVar = args['token-var'] ?? `${name.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_API_TOKEN`;

// Fill homepage and repository from the git remote so the manifests point somewhere real.
// `git config --get` rather than `git remote get-url`: the latter applies url.<base>.insteadOf
// rewrites, which on CI hosts substitute a URL with an access token embedded in it.
let repository = args.homepage;
if (!repository) {
  try {
    const remote = execFileSync('git', ['config', '--get', 'remote.origin.url'], { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] })
      .toString('utf8')
      .trim();
    repository = remote.replace(/^git@([^:]+):/, 'https://$1/').replace(/\.git$/, '');
  } catch {
    repository = `https://github.com/${owner}/${marketplace.name}`;
  }
}
repository = stripCredentials(repository);

const server = { type: 'http', url };
const manifestExtras = {};

if (auth === 'token') {
  server.headers = { Authorization: `Bearer \${${tokenVar}}` };
  manifestExtras.variables = {
    type: 'object',
    properties: {
      [tokenVar]: {
        type: 'string',
        title: `${displayName} API token`,
        description: `API token for ${displayName}. Create one in the ${displayName} settings and paste it here.`,
      },
    },
    required: [tokenVar],
  };
} else if (auth === 'oauth') {
  delete server.type;
  server.auth = { CLIENT_ID: '${CLIENT_ID}', CLIENT_SECRET: '${CLIENT_SECRET:-}' };
  manifestExtras.variables = {
    type: 'object',
    properties: {
      CLIENT_ID: {
        type: 'string',
        title: `${displayName} Client ID`,
        description: `OAuth Client ID from the ${displayName} app you registered for MCP.`,
      },
      CLIENT_SECRET: {
        type: 'string',
        title: `${displayName} Client Secret`,
        description: 'Optional. Leave blank for a public client; Cursor then signs in with PKCE.',
      },
    },
    required: ['CLIENT_ID'],
  };
}

const mcpConfig = { mcpServers: { [name]: server } };

writeJson(join(pluginDir, '.cursor-plugin', 'plugin.json'), {
  name,
  displayName,
  version,
  minClientVersions: { cursor: '3.13.0' },
  description,
  author: { name: owner },
  homepage: `${repository}/tree/main/plugins/${name}`,
  repository,
  license: 'MIT',
  keywords,
  category,
  tags: keywords,
  ...manifestExtras,
  mcpServers: './mcp.json',
});
writeJson(join(pluginDir, 'mcp.json'), mcpConfig);
writeJson(join(pluginDir, '.mcp.json'), mcpConfig);
writeJson(join(pluginDir, 'plugin.json'), {
  $schema: 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json',
  name,
  version,
  description,
  author: { name: owner },
  license: 'MIT',
});
writeJson(join(pluginDir, '.claude-plugin', 'plugin.json'), {
  name,
  version,
  description,
  author: { name: owner },
});
writeJson(join(pluginDir, '.codex-plugin', 'plugin.json'), {
  name,
  version,
  description,
  author: { name: owner },
  mcpServers: './.mcp.json',
});

const authNote = {
  none: `The server is public or uses OAuth discovery; Cursor prompts for sign-in on first use if needed.`,
  token: `Set \`${tokenVar}\` when you install the plugin. Cursor sends it as \`Authorization: Bearer\`.`,
  oauth: `Set \`CLIENT_ID\` (and \`CLIENT_SECRET\` for a confidential client) when you install the plugin. Register \`https://www.cursor.com/agents/mcp/oauth/callback\` and \`http://localhost:8787/callback\` as redirect URLs with ${displayName} first.`,
}[auth];

writeText(join(pluginDir, 'README.md'), `# ${displayName}

${description}

## Install

1. Open **Dashboard → Plugins & MCPs**.
2. Find **${displayName}** in your team marketplace.
3. Click **Install**.

## Auth

${authNote}

## MCP

\`\`\`json
${JSON.stringify(mcpConfig, null, 2)}
\`\`\`

## License

MIT
`);

writeText(join(pluginDir, 'CHANGELOG.md'), `# Changelog

## ${version}

- Added the \`${name}\` MCP server pointing at \`${url}\`.
`);

marketplace.plugins.push({
  name,
  source: `plugins/${name}`,
  description,
  minClientVersions: { cursor: '3.13.0' },
});
writeJson(marketplacePath, marketplace);

const claudePath = join(root, '.claude-plugin', 'marketplace.json');
const claude = readJson(claudePath);
claude.plugins.push({ name, source: `./plugins/${name}` });
writeJson(claudePath, claude);

const agentsPath = join(root, '.agents', 'plugins', 'marketplace.json');
const agents = readJson(agentsPath);
agents.plugins.push({
  name,
  source: { source: 'local', path: `./plugins/${name}` },
  policy: { installation: 'AVAILABLE', authentication: 'ON_USE' },
  category,
});
writeJson(agentsPath, agents);

console.log(`ok  created plugins/${name} and registered it in all three marketplace manifests`);
console.log(`    add a logo at plugins/${name}/assets/logo.svg and set "logo" in .cursor-plugin/plugin.json`);
console.log('    run: node scripts/validate.mjs');
