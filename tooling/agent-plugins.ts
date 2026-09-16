export const AGENT_PLUGINS_VERSION = "1.0.0";
export const AGENT_PLUGINS_PLUGIN_SCHEMA = `https://agent-plugins.org/schemas/${AGENT_PLUGINS_VERSION}/plugin.schema.json`;
export const AGENT_PLUGINS_MCP_SCHEMA = `https://agent-plugins.org/schemas/${AGENT_PLUGINS_VERSION}/mcp.schema.json`;

const MANIFEST_FIELDS = new Set([
  "$schema",
  "name",
  "version",
  "description",
  "author",
  "homepage",
  "repository",
  "license",
  "keywords",
  "extensions",
]);
const AUTHOR_FIELDS = new Set(["name", "email", "url"]);
const NAME_PATTERN = /^(?!.*(?:--|\.\.))[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/;
const STDIO_FIELDS = new Set(["type", "command", "args", "env", "cwd"]);
const REMOTE_FIELDS = new Set(["type", "url", "headers"]);
const CWD_PATTERN = /^(?:\.\/|\$\{PLUGIN_ROOT\}(?:\/|$)|\$\{PLUGIN_DATA\}(?:\/|$))/;

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isStringArray = (value: unknown) =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

export function validatePluginManifest(manifest: unknown): string[] {
  if (!isObject(manifest)) return ["plugin.json must be a JSON object"];
  const errors: string[] = [];
  for (const field of Object.keys(manifest)) {
    if (!MANIFEST_FIELDS.has(field)) {
      errors.push(`plugin.json has a field outside the closed schema: ${field}`);
    }
  }
  if (manifest.$schema !== AGENT_PLUGINS_PLUGIN_SCHEMA) {
    errors.push(`plugin.json $schema must be ${AGENT_PLUGINS_PLUGIN_SCHEMA}`);
  }
  const name = manifest.name;
  if (typeof name !== "string" || name.length > 64 || !NAME_PATTERN.test(name)) {
    errors.push("plugin.json name must be 1-64 of a-z, 0-9, '-', '.'");
  }
  for (const field of ["version", "description", "homepage", "repository", "license"]) {
    if (field in manifest && typeof manifest[field] !== "string") {
      errors.push(`plugin.json ${field} must be a string`);
    }
  }
  if ("keywords" in manifest && !isStringArray(manifest.keywords)) {
    errors.push("plugin.json keywords must be an array of strings");
  }
  if ("author" in manifest) {
    const author = manifest.author;
    if (!isObject(author)) {
      errors.push("plugin.json author must be an object");
    } else {
      for (const [field, value] of Object.entries(author)) {
        if (!AUTHOR_FIELDS.has(field) || typeof value !== "string") {
          errors.push(`plugin.json author.${field} is not allowed`);
        }
      }
    }
  }
  if ("extensions" in manifest) {
    const extensions = manifest.extensions;
    if (!isObject(extensions)) {
      errors.push("plugin.json extensions must be an object");
    } else {
      for (const [namespace, value] of Object.entries(extensions)) {
        if (!isObject(value)) {
          errors.push(`plugin.json extensions.${namespace} must be an object`);
        }
      }
    }
  }
  return errors;
}

function validateServer(name: string, server: unknown): string[] {
  if (!isObject(server)) return [`mcp.json server ${name} must be an object`];
  const errors: string[] = [];
  const type = server.type;
  const allowed =
    type === "stdio" ? STDIO_FIELDS : type === "streamable-http" || type === "sse" ? REMOTE_FIELDS : null;
  if (!allowed) return [`mcp.json server ${name} has no supported type`];
  for (const field of Object.keys(server)) {
    if (!allowed.has(field)) {
      errors.push(`mcp.json server ${name} has a field outside its variant: ${field}`);
    }
  }
  if (type === "stdio") {
    const command = server.command;
    if (typeof command !== "string" || command.length === 0 || /\s/.test(command)) {
      errors.push(`mcp.json server ${name} command must be a single executable token`);
    } else if (command.includes("/") && !command.startsWith("./")) {
      errors.push(`mcp.json server ${name} command must be a bare name or start with ./`);
    }
    if ("args" in server && !isStringArray(server.args)) {
      errors.push(`mcp.json server ${name} args must be an array of strings`);
    }
    if ("env" in server) {
      const env = server.env;
      if (!isObject(env) || !Object.values(env).every((value) => typeof value === "string")) {
        errors.push(`mcp.json server ${name} env must map names to strings`);
      } else if ("PLUGIN_ROOT" in env || "PLUGIN_DATA" in env) {
        errors.push(`mcp.json server ${name} env must not set PLUGIN_ROOT or PLUGIN_DATA`);
      }
    }
    if ("cwd" in server && (typeof server.cwd !== "string" || !CWD_PATTERN.test(server.cwd))) {
      errors.push(`mcp.json server ${name} cwd must start with ./, \${PLUGIN_ROOT} or \${PLUGIN_DATA}`);
    }
  } else {
    let url: URL | null = null;
    try {
      url = new URL(String(server.url));
    } catch {
      errors.push(`mcp.json server ${name} url must be absolute`);
    }
    if (url) {
      const loopback = url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]";
      if (url.protocol !== "https:" && !(url.protocol === "http:" && loopback)) {
        errors.push(`mcp.json server ${name} url must use https`);
      }
      if (url.username || url.password || url.hash) {
        errors.push(`mcp.json server ${name} url must not carry user info or a fragment`);
      }
    }
    if ("headers" in server) {
      const headers = server.headers;
      if (!isObject(headers) || !Object.values(headers).every((value) => typeof value === "string")) {
        errors.push(`mcp.json server ${name} headers must map names to strings`);
      }
    }
  }
  return errors;
}

export function validateMcpConfig(config: unknown): string[] {
  if (!isObject(config)) return ["mcp.json must be a JSON object"];
  const errors: string[] = [];
  for (const field of Object.keys(config)) {
    if (field !== "$schema" && field !== "mcpServers") {
      errors.push(`mcp.json has a field outside the closed schema: ${field}`);
    }
  }
  if (config.$schema !== AGENT_PLUGINS_MCP_SCHEMA) {
    errors.push(`mcp.json $schema must be ${AGENT_PLUGINS_MCP_SCHEMA}`);
  }
  if (!isObject(config.mcpServers)) {
    errors.push("mcp.json mcpServers must be an object");
    return errors;
  }
  for (const [name, server] of Object.entries(config.mcpServers)) {
    errors.push(...validateServer(name, server));
  }
  return errors;
}
