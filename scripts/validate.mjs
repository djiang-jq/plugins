#!/usr/bin/env node
// Gate for this marketplace. Proves that every plugin listed in the three marketplace
// manifests exists, that its per-client manifests agree, and that its MCP config is
// installable. Node >= 20, built-ins only, no install step.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, dirname, resolve, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const PLUGIN_NAME = /^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/;
const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?$/;
// Mirrors additionalProperties:false in https://cursor.com/schemas/cursor-plugin/plugin.json.
const PLUGIN_KEYS = new Set([
  'name', 'displayName', 'description', 'version', 'minClientVersions', 'author', 'publisher',
  'homepage', 'repository', 'license', 'logo', 'keywords', 'category', 'tags',
  'commands', 'agents', 'skills', 'rules', 'hooks', 'variables', 'mcpServers',
]);
const ENTRY_KEYS = new Set(['name', 'source', 'description', 'minClientVersions']);
const REMOTE_TYPES = new Set(['http', 'sse', 'streamable-http']);
// Only the template plugin may point at the placeholder host.
const PLACEHOLDER_HOST = 'mcp.example.com';
const TEMPLATE_PLUGIN = 'example-mcp';

const problems = [];
const fail = (where, message) => problems.push(`${where}: ${message}`);
const native = (p) => join(root, ...p.split('/'));

function readJson(path) {
  const file = native(path);
  if (!existsSync(file)) {
    fail(path, 'is missing');
    return null;
  }
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    fail(path, `is not valid JSON: ${error.message}`);
    return null;
  }
}

// A manifest path must stay inside its own plugin directory.
function checkRelative(where, field, value) {
  if (typeof value !== 'string') return false;
  if (isAbsolute(value) || /^[A-Za-z]:/.test(value)) {
    fail(where, `${field} "${value}" is an absolute path; use a path relative to the plugin root`);
    return false;
  }
  if (value.split('/').includes('..')) {
    fail(where, `${field} "${value}" escapes the plugin directory`);
    return false;
  }
  return true;
}

// ${NAME} and ${NAME:-default} both reference NAME.
function referencedVariables(value, found = new Set()) {
  if (typeof value === 'string') {
    for (const match of value.matchAll(/\$\{([A-Za-z_][A-Za-z0-9_]*)(?::-[^}]*)?\}/g)) found.add(match[1]);
  } else if (Array.isArray(value)) {
    for (const item of value) referencedVariables(item, found);
  } else if (value && typeof value === 'object') {
    for (const item of Object.values(value)) referencedVariables(item, found);
  }
  return found;
}

function checkServers(where, servers, declared) {
  const names = Object.keys(servers ?? {});
  if (names.length === 0) {
    fail(where, 'declares no MCP servers; an MCP plugin needs at least one');
    return;
  }
  for (const [name, server] of Object.entries(servers)) {
    const at = `${where} → ${name}`;
    if (!server || typeof server !== 'object') {
      fail(at, 'must be an object');
      continue;
    }
    if (!PLUGIN_NAME.test(name)) fail(at, 'server name must be lowercase kebab-case');
    const hasUrl = typeof server.url === 'string' && server.url.length > 0;
    const hasCommand = typeof server.command === 'string' && server.command.length > 0;
    if (hasUrl === hasCommand) {
      fail(at, 'must set exactly one of "url" (remote) or "command" (stdio)');
      continue;
    }
    if (hasUrl) {
      let parsed;
      try {
        parsed = new URL(server.url);
      } catch {
        fail(at, `url "${server.url}" is not a valid URL`);
        continue;
      }
      if (parsed.protocol !== 'https:') fail(at, `url "${server.url}" must use https`);
      if (parsed.username || parsed.password) {
        fail(at, 'url embeds credentials; move them into headers as a ${VARIABLE} placeholder');
      }
      if (server.type !== undefined && !REMOTE_TYPES.has(server.type)) {
        fail(at, `type "${server.type}" is not one of ${[...REMOTE_TYPES].join(', ')}`);
      }
      if (server.envFile !== undefined) fail(at, 'envFile is not supported for remote servers');
      if (parsed.hostname === PLACEHOLDER_HOST && !where.includes(TEMPLATE_PLUGIN)) {
        fail(at, `still points at the ${PLACEHOLDER_HOST} placeholder; set the real server URL`);
      }
    } else if (server.type !== undefined && server.type !== 'stdio') {
      fail(at, `type "${server.type}" is invalid for a server with "command"; use "stdio"`);
    }
    for (const variable of referencedVariables(server)) {
      if (!declared.has(variable)) {
        fail(at, `references \${${variable}} but the manifest does not declare it under "variables"`);
      }
    }
    // A literal secret in the repo leaks the moment the marketplace is shared.
    for (const [key, value] of Object.entries(server.headers ?? {})) {
      if (typeof value === 'string' && /(bearer|token|key|secret)/i.test(`${key} ${value}`) && !value.includes('${')) {
        fail(at, `header "${key}" looks like a hardcoded credential; use a \${VARIABLE} placeholder`);
      }
    }
  }
}

function checkPlugin(entry) {
  const dir = entry.source;
  const where = `${dir}/.cursor-plugin/plugin.json`;
  if (!existsSync(native(dir))) {
    fail(`.cursor-plugin/marketplace.json → ${entry.name}`, `source directory "${dir}" does not exist`);
    return;
  }
  const manifest = readJson(`${dir}/.cursor-plugin/plugin.json`);
  if (!manifest) return;

  for (const key of Object.keys(manifest)) {
    if (!PLUGIN_KEYS.has(key)) fail(where, `"${key}" is not a field Cursor accepts`);
  }
  if (manifest.name !== entry.name) {
    fail(where, `name "${manifest.name}" does not match the marketplace entry "${entry.name}"`);
  }
  if (!PLUGIN_NAME.test(manifest.name ?? '')) {
    fail(where, `name "${manifest.name}" must be lowercase kebab-case, starting and ending alphanumeric`);
  }
  if (manifest.version !== undefined && !SEMVER.test(manifest.version)) {
    fail(where, `version "${manifest.version}" is not a strict X.Y.Z semver`);
  }
  if (!manifest.description) fail(where, 'needs a description; the marketplace card shows it');
  for (const field of ['homepage', 'repository']) {
    const value = manifest[field];
    if (typeof value !== 'string') continue;
    try {
      const parsed = new URL(value);
      if (parsed.username || parsed.password) {
        fail(where, `${field} embeds credentials in the URL; strip the "user:token@" prefix`);
      }
    } catch {
      fail(where, `${field} "${value}" is not a valid URL`);
    }
  }
  if (manifest.logo && !/^https?:\/\//.test(manifest.logo)) {
    if (checkRelative(where, 'logo', manifest.logo) && !existsSync(native(`${dir}/${manifest.logo}`))) {
      fail(where, `logo "${manifest.logo}" does not exist`);
    }
  }

  const declared = new Set(Object.keys(manifest.variables?.properties ?? {}));
  for (const required of manifest.variables?.required ?? []) {
    if (!declared.has(required)) fail(where, `variables.required lists "${required}" but does not define it`);
  }

  // mcpServers is a path, an inline object, or an array of either; a bare mcp.json is the default.
  const sources = manifest.mcpServers === undefined
    ? ['./mcp.json']
    : [manifest.mcpServers].flat();
  for (const source of sources) {
    if (typeof source === 'string') {
      if (!checkRelative(where, 'mcpServers', source)) continue;
      const path = `${dir}/${source.replace(/^\.\//, '')}`;
      const config = readJson(path);
      if (config) checkServers(path, config.mcpServers, declared);
    } else {
      checkServers(`${where} → mcpServers`, source.mcpServers ?? source, declared);
    }
  }

  checkCrossClient(dir, manifest);
}

// One plugin, many clients: the manifests must not drift apart.
function checkCrossClient(dir, cursorManifest) {
  for (const path of [`${dir}/plugin.json`, `${dir}/.claude-plugin/plugin.json`, `${dir}/.codex-plugin/plugin.json`]) {
    const manifest = readJson(path);
    if (!manifest) continue;
    if (manifest.name !== cursorManifest.name) {
      fail(path, `name "${manifest.name}" does not match .cursor-plugin/plugin.json "${cursorManifest.name}"`);
    }
    if (manifest.version !== cursorManifest.version) {
      fail(path, `version "${manifest.version}" does not match .cursor-plugin/plugin.json "${cursorManifest.version}"`);
    }
  }

  const cursorMcp = readJson(`${dir}/mcp.json`);
  const sharedMcp = readJson(`${dir}/.mcp.json`);
  if (!cursorMcp || !sharedMcp) return;
  const urls = (config) =>
    Object.fromEntries(Object.entries(config.mcpServers ?? {}).map(([name, s]) => [name, s.url ?? s.command]));
  const left = urls(cursorMcp);
  const right = urls(sharedMcp);
  if (JSON.stringify(left) !== JSON.stringify(right)) {
    fail(`${dir}/.mcp.json`, `servers differ from mcp.json: ${JSON.stringify(right)} vs ${JSON.stringify(left)}`);
  }
}

const cursor = readJson('.cursor-plugin/marketplace.json');
if (!cursor) {
  console.error('.cursor-plugin/marketplace.json is required at the repository root.');
  process.exit(1);
}

for (const key of Object.keys(cursor)) {
  if (!['name', 'owner', 'metadata', 'plugins'].includes(key)) {
    fail('.cursor-plugin/marketplace.json', `"${key}" is not a field Cursor accepts at the marketplace root`);
  }
}
if (!PLUGIN_NAME.test(cursor.name ?? '')) {
  fail('.cursor-plugin/marketplace.json', `name "${cursor.name}" must be lowercase kebab-case`);
}

const entries = cursor.plugins ?? [];
if (entries.length === 0) fail('.cursor-plugin/marketplace.json', 'lists no plugins');
const seen = new Set();
for (const entry of entries) {
  for (const key of Object.keys(entry)) {
    if (!ENTRY_KEYS.has(key)) {
      fail(`.cursor-plugin/marketplace.json → ${entry.name}`, `"${key}" belongs in the plugin's own plugin.json, not the marketplace entry`);
    }
  }
  if (seen.has(entry.name)) fail('.cursor-plugin/marketplace.json', `duplicate plugin name "${entry.name}"`);
  seen.add(entry.name);
  if (checkRelative(`.cursor-plugin/marketplace.json → ${entry.name}`, 'source', entry.source)) checkPlugin(entry);
}

// Every directory under plugins/ must be listed, or installing it silently does nothing.
const onDisk = existsSync(native('plugins'))
  ? readdirSync(native('plugins'), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name)
  : [];
for (const name of onDisk) {
  if (!entries.some((entry) => entry.source === `plugins/${name}`)) {
    fail('.cursor-plugin/marketplace.json', `plugins/${name} exists on disk but is not listed`);
  }
}

// The other two indexes are what make the same plugins installable outside Cursor.
for (const [path, names] of [
  ['.claude-plugin/marketplace.json', (m) => (m.plugins ?? []).map((p) => p.name)],
  ['.agents/plugins/marketplace.json', (m) => (m.plugins ?? []).map((p) => p.name)],
]) {
  const manifest = readJson(path);
  if (!manifest) continue;
  const listed = new Set(names(manifest));
  for (const name of seen) if (!listed.has(name)) fail(path, `does not list "${name}"`);
  for (const name of listed) if (!seen.has(name)) fail(path, `lists "${name}", which is not in .cursor-plugin/marketplace.json`);
}

if (problems.length > 0) {
  for (const problem of problems) console.error(`error  ${problem}`);
  console.error(`\n${problems.length} problem(s) found.`);
  process.exit(1);
}

console.log(`ok  marketplace "${cursor.name}" with ${entries.length} plugin(s): ${[...seen].join(', ')}`);
