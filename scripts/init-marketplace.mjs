#!/usr/bin/env node
// Replaces the scaffold placeholders across every manifest, including the ones in dot-directories
// that a plain grep skips. Run this once, right after you clone the template.
// Node >= 20, built-ins only, no install step.
//
//   node scripts/init-marketplace.mjs --name acme-plugins --owner "Acme Inc" --email plugins@acme.com
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PLUGIN_NAME = /^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/;
const OWNER_PLACEHOLDER = 'YOUR-ORG';
const NAME_PLACEHOLDER = 'mcp-marketplace';

function die(message) {
  console.error(`error  ${message}`);
  console.error('\nusage: node scripts/init-marketplace.mjs --name <marketplace-id> --owner <name> [--email <address>]');
  process.exit(1);
}

const args = {};
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i += 1) {
  const token = argv[i];
  if (!token.startsWith('--')) die(`unexpected argument "${token}"`);
  const [flag, inline] = token.slice(2).split(/=(.*)/s);
  args[flag] = inline ?? (argv[i + 1]?.startsWith('--') ? undefined : argv[++i]);
}

const name = args.name;
const owner = args.owner;
if (!name) die('--name is required');
if (!PLUGIN_NAME.test(name)) die(`--name "${name}" must be lowercase kebab-case, starting and ending alphanumeric`);
if (!owner) die('--owner is required');

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const writeJson = (path, value) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);

const touched = [];

// The three marketplace indexes carry the marketplace identity.
const cursorPath = join(root, '.cursor-plugin', 'marketplace.json');
const cursor = readJson(cursorPath);
cursor.name = name;
cursor.owner = args.email ? { name: owner, email: args.email } : { name: owner };
writeJson(cursorPath, cursor);
touched.push('.cursor-plugin/marketplace.json');

const claudePath = join(root, '.claude-plugin', 'marketplace.json');
const claude = readJson(claudePath);
claude.name = name;
claude.owner = { name: owner };
writeJson(claudePath, claude);
touched.push('.claude-plugin/marketplace.json');

const agentsPath = join(root, '.agents', 'plugins', 'marketplace.json');
const agents = readJson(agentsPath);
agents.name = name;
writeJson(agentsPath, agents);
touched.push('.agents/plugins/marketplace.json');

// Each plugin names the owner as its author in four separate manifests.
const pluginsDir = join(root, 'plugins');
const plugins = existsSync(pluginsDir)
  ? readdirSync(pluginsDir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name)
  : [];
for (const plugin of plugins) {
  for (const relative of [
    '.cursor-plugin/plugin.json',
    'plugin.json',
    '.claude-plugin/plugin.json',
    '.codex-plugin/plugin.json',
  ]) {
    const path = join(pluginsDir, plugin, ...relative.split('/'));
    if (!existsSync(path)) continue;
    const manifest = readJson(path);
    if (manifest.author?.name === OWNER_PLACEHOLDER) manifest.author.name = owner;
    for (const field of ['homepage', 'repository']) {
      if (typeof manifest[field] === 'string') {
        manifest[field] = manifest[field]
          .replaceAll(OWNER_PLACEHOLDER, owner)
          .replaceAll(NAME_PLACEHOLDER, name);
      }
    }
    writeJson(path, manifest);
    touched.push(`plugins/${plugin}/${relative}`);
  }
}

// LICENSE carries the copyright holder; README carries the example URLs.
for (const relative of ['LICENSE', 'README.md', ...plugins.map((p) => `plugins/${p}/LICENSE`)]) {
  const path = join(root, ...relative.split('/'));
  if (!existsSync(path)) continue;
  const before = readFileSync(path, 'utf8');
  const after = before.replaceAll(OWNER_PLACEHOLDER, owner).replaceAll(NAME_PLACEHOLDER, name);
  if (after !== before) {
    writeFileSync(path, after);
    touched.push(relative);
  }
}

console.log(`ok  marketplace "${name}" owned by "${owner}"`);
for (const path of touched) console.log(`    updated ${path}`);
console.log('    run: node scripts/validate.mjs');
