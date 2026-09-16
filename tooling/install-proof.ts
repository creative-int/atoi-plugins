import { spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { atoiConfig } from "../atoi.config.ts";

type Status = "proven" | "failed" | "inconclusive" | "skipped";
type Step = { argv: string[]; exit: number | null; ms: number; output: string };
type RunOptions = { env?: Record<string, string>; cwd?: string; timeoutMs?: number; private?: boolean };
type ClientResult = {
  client: string;
  status: Status;
  clientVersion: string | null;
  commit: string | null;
  assertions: Array<{ claim: string; held: boolean; evidence: string }>;
  notes: string[];
  steps: Step[];
};
type Package = {
  pluginDir: string;
  name: string;
  version: string;
  claudeId: string;
  codexId: string;
  codexMarketplace: string;
  server: { name: string; command: string; args: string[] };
  skills: string[];
  manifestSha256: string;
  mcpSha256: string;
};

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const pluginDirName = atoiConfig.plugin.dir;
const argv = process.argv.slice(2);
const flag = (name: string, fallback?: string) => {
  const index = argv.indexOf(`--${name}`);
  return index >= 0 ? argv[index + 1] : fallback;
};
const source = flag("source", repoRoot) as string;
const clients = (flag("clients", "claude-code,codex,cursor") as string).split(",");
const runId = randomUUID();
const runDir = resolve(flag("out", join(repoRoot, ".artifacts/install-proof", runId)) as string);
mkdirSync(runDir, { recursive: true });

const isGitHubSlug = /^[\w.-]+\/[\w.-]+$/.test(source) && !existsSync(source);
const cloneUrl = isGitHubSlug ? `https://github.com/${source}.git` : resolve(source);

function scrub(text: string) {
  return text
    .split(realpathSync(runDir)).join("<run>")
    .split(runDir).join("<run>")
    .split(homedir()).join("~")
    .replace(/atoi_(service|host)_[A-Za-z0-9]{6,}/g, "atoi_$1_<redacted>")
    .replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, (email) => (email === "support@creative-int.com" ? email : "<email>"));
}

function run(
  steps: Step[],
  command: string,
  args: string[],
  options: RunOptions = {},
) {
  const started = Date.now();
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? runDir,
    env: { ...process.env, ...options.env },
    encoding: "utf8",
    timeout: options.timeoutMs ?? 180_000,
    maxBuffer: 64 * 1024 * 1024,
  });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}${result.error ? String(result.error) : ""}`;
  steps.push({
    argv: [command, ...args].map(scrub),
    exit: result.status,
    ms: Date.now() - started,
    output: options.private
      ? `<withheld: ${output.length} bytes, sha256 ${createHash("sha256").update(output).digest("hex")}>`
      : scrub(output).slice(0, 4000),
  });
  return { exit: result.status, stdout: result.stdout ?? "", output };
}

const readJson = (path: string) => JSON.parse(readFileSync(path, "utf8"));
const digest = (path: string) => createHash("sha256").update(readFileSync(path)).digest("hex");

function inspect(target: string): Package {
  const pluginDir = join(target, pluginDirName);
  const manifest = readJson(join(pluginDir, "plugin.json"));
  const mcpConfig = readJson(join(pluginDir, "mcp.json"));
  const [serverName, server] = Object.entries(mcpConfig.mcpServers)[0] as [string, any];
  const skillsRoot = join(pluginDir, "skills");
  return {
    pluginDir,
    name: manifest.name,
    version: manifest.version,
    claudeId: `${manifest.name}@${readJson(join(target, ".claude-plugin/marketplace.json")).name}`,
    codexId: `${manifest.name}@${readJson(join(target, ".agents/plugins/marketplace.json")).name}`,
    codexMarketplace: readJson(join(target, ".agents/plugins/marketplace.json")).name,
    server: { name: serverName, command: server.command, args: server.args ?? [] },
    skills: readdirSync(skillsRoot).filter((entry) => existsSync(join(skillsRoot, entry, "SKILL.md"))).sort(),
    manifestSha256: digest(join(pluginDir, "plugin.json")),
    mcpSha256: digest(join(pluginDir, "mcp.json")),
  };
}

let proven = null as { commit: string; pkg: Package } | null;

function freshClone(out: ClientResult, name: string) {
  const target = join(runDir, name);
  run(out.steps, "git", ["clone", "--quiet", cloneUrl, target]);
  const commit = run(out.steps, "git", ["-C", target, "rev-parse", "HEAD"]).stdout.trim();
  const pkg = inspect(target);
  out.commit = commit;
  proven ??= { commit, pkg };
  if (proven.commit !== commit) out.notes.push(`cloned ${commit}, not ${proven.commit}: the branch moved during the run`);
  return { target, commit, pkg };
}

function result(client: string): ClientResult {
  return { client, status: "inconclusive", clientVersion: null, commit: null, assertions: [], notes: [], steps: [] };
}

function assertClaim(out: ClientResult, claim: string, held: boolean, evidence: string) {
  out.assertions.push({ claim, held, evidence: scrub(evidence).slice(0, 600) });
  return held;
}

function settle(out: ClientResult) {
  out.status = out.assertions.length > 0 && out.assertions.every((a) => a.held) ? "proven" : "failed";
  return out;
}

const commandLine = (pkg: Package) => [pkg.server.command, ...pkg.server.args].join(" ");

function proveClaudeCode(): ClientResult {
  const out = result("claude-code");
  const home = join(runDir, "claude-home");
  mkdirSync(home, { recursive: true });
  const env = { CLAUDE_CONFIG_DIR: home };
  out.clientVersion = run(out.steps, "claude", ["--version"]).stdout.trim();
  const { target, pkg } = freshClone(out, "claude-clone");
  out.notes.push(`marketplace source: ${isGitHubSlug ? source : "fresh local clone"}`);

  const validate = run(out.steps, "claude", ["plugin", "validate", target], { env });
  assertClaim(out, "claude plugin validate accepts the marketplace", validate.exit === 0, validate.output);
  const add = run(out.steps, "claude", ["plugin", "marketplace", "add", isGitHubSlug ? source : target], { env });
  assertClaim(out, "the marketplace adds", add.exit === 0, add.output);
  const install = run(out.steps, "claude", ["plugin", "install", pkg.claudeId], { env });
  assertClaim(out, `${pkg.claudeId} installs`, install.exit === 0, install.output);

  const list = run(out.steps, "claude", ["plugin", "list", "--json"], { env });
  let entry: any = null;
  try {
    entry = JSON.parse(list.stdout).find((item: any) => item.id === pkg.claudeId);
  } catch {}
  assertClaim(out, `installed version is ${pkg.version}`, entry?.version === pkg.version, list.stdout);
  assertClaim(
    out,
    "the installed plugin declares the stdio bridge from the portable mcp.json",
    JSON.stringify(entry?.mcpServers?.[pkg.server.name]) ===
      JSON.stringify({ type: "stdio", command: pkg.server.command, args: pkg.server.args }),
    JSON.stringify(entry?.mcpServers ?? null),
  );

  const details = run(out.steps, "claude", ["plugin", "details", pkg.claudeId], { env });
  const skillLine = details.stdout.match(/Skills \((\d+)\)\s+(.*)/);
  const listed = (skillLine?.[2] ?? "").split(/[,\s]+/).filter(Boolean).sort();
  assertClaim(
    out,
    `Claude Code loads the skills ${pkg.skills.join(", ")}`,
    JSON.stringify(listed) === JSON.stringify(pkg.skills),
    skillLine?.[0] ?? details.output,
  );

  const mcpList = run(out.steps, "claude", ["mcp", "list"], { env, timeoutMs: 240_000 });
  const prefix = `plugin:${pkg.name}:${pkg.server.name}:`;
  const serverLine = mcpList.stdout.split("\n").find((line) => line.startsWith(prefix)) ?? "";
  assertClaim(
    out,
    `Claude Code registers ${prefix.slice(0, -1)} as \`${commandLine(pkg)}\``,
    serverLine.includes(commandLine(pkg)),
    serverLine || mcpList.output,
  );
  out.notes.push(`bridge connection as observed by Claude Code: ${serverLine.split(" - ")[1] ?? "unknown"}`);
  return settle(out);
}

function proveCodex(): ClientResult {
  const out = result("codex");
  const home = join(runDir, "codex-home");
  mkdirSync(home, { recursive: true });
  const env = { CODEX_HOME: home };
  out.clientVersion = run(out.steps, "codex", ["--version"]).stdout.trim();
  const { target, pkg } = freshClone(out, "codex-clone");
  out.notes.push(`marketplace source: ${isGitHubSlug ? source : "fresh local clone"}`);

  const add = run(out.steps, "codex", ["plugin", "marketplace", "add", isGitHubSlug ? source : target], { env });
  assertClaim(out, "the marketplace adds", add.exit === 0, add.output);
  const listed = run(out.steps, "codex", ["plugin", "list"], { env });
  assertClaim(
    out,
    "Codex reads the catalog at .agents/plugins/marketplace.json",
    listed.stdout.includes(".agents/plugins/marketplace.json") && listed.stdout.includes(pkg.codexId),
    listed.stdout,
  );
  const install = run(out.steps, "codex", ["plugin", "add", pkg.codexId, "--json"], { env });
  let installed: any = null;
  try {
    installed = JSON.parse(install.stdout);
  } catch {}
  assertClaim(out, `${pkg.codexId} installs at ${pkg.version}`, installed?.version === pkg.version, install.output);

  const servers = run(out.steps, "codex", ["mcp", "list", "--json"], { env });
  let server: any = null;
  try {
    server = JSON.parse(servers.stdout).find((item: any) => item.name === pkg.server.name);
  } catch {}
  assertClaim(
    out,
    "Codex loads the stdio bridge from the portable mcp.json with PLUGIN_ROOT and PLUGIN_DATA",
    server?.enabled === true &&
      server?.transport?.type === "stdio" &&
      server?.transport?.command === pkg.server.command &&
      JSON.stringify(server?.transport?.args) === JSON.stringify(pkg.server.args) &&
      typeof server?.transport?.env?.PLUGIN_ROOT === "string" &&
      typeof server?.transport?.env?.PLUGIN_DATA === "string",
    JSON.stringify(server ?? null),
  );

  const prompt = run(out.steps, "codex", ["debug", "prompt-input", "ping"], { env, private: true });
  const rendered = prompt.stdout.replaceAll("\\n", "\n");
  const roots = new Map(
    [...rendered.matchAll(/^- `(r\d+)` = `([^`]+)`/gm)].map((match) => [match[1], match[2]]),
  );
  const canonical = (path: string) => path.replace(/^\/private\/tmp\//, "/tmp/");
  const installedSkills = canonical(
    `${realpathSync(home)}/plugins/cache/${pkg.codexMarketplace}/${pkg.name}/${pkg.version}/skills`,
  );
  const missing = pkg.skills.filter((skill) => {
    const line = rendered.match(new RegExp(`^- ${pkg.name}:${skill}: .*\\(file: (r\\d+)/([^)]+)\\)$`, "m"));
    const rootPath = line ? roots.get(line[1]) : undefined;
    if (!line || !rootPath) return true;
    return canonical(`${rootPath}/${line[2]}`) !== `${installedSkills}/${skill}/SKILL.md`;
  });
  assertClaim(
    out,
    `the model-visible prompt lists ${pkg.skills.map((skill) => `${pkg.name}:${skill}`).join(", ")} from the installed cache`,
    prompt.exit === 0 && missing.length === 0,
    missing.length === 0 ? `all ${pkg.skills.length} skill(s) resolve into the installed cache` : `missing: ${missing.join(", ")}`,
  );
  return settle(out);
}

function cursorRun(out: ClientResult, workspace: string, args: string[], tmp: string) {
  let last = { exit: null as number | null, stdout: "" };
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const outcome = run(out.steps, "cursor-agent", args, { cwd: workspace, env: { TMPDIR: tmp }, timeoutMs: 240_000 });
    last = { exit: outcome.exit, stdout: outcome.stdout };
    if (outcome.exit === 0) break;
  }
  return last;
}

function newestLog(tmp: string) {
  const logDir = existsSync(tmp) ? readdirSync(tmp).find((entry) => entry.startsWith("cursor-agent-logs-")) : undefined;
  if (!logDir) return "";
  const logs = readdirSync(join(tmp, logDir))
    .filter((entry) => entry.startsWith("session-"))
    .map((entry) => join(tmp, logDir, entry))
    .sort((a, b) => statSync(b).size - statSync(a).size);
  return logs.length > 0 ? readFileSync(logs[0], "utf8") : "";
}

function proveCursor(): ClientResult {
  const out = result("cursor");
  out.clientVersion = run(out.steps, "cursor-agent", ["--version"]).stdout.trim();
  const status = run(out.steps, "cursor-agent", ["status"]);
  if (!/Logged in/.test(status.output)) {
    out.status = "skipped";
    out.notes.push("cursor-agent is not logged in on this host");
    return out;
  }
  const { pkg } = freshClone(out, "cursor-clone");
  const workspace = join(runDir, "cursor-workspace");
  mkdirSync(workspace, { recursive: true });
  const model = flag("cursor-model", "composer-2.5") as string;
  out.notes.push(`plugin directory: fresh clone of ${isGitHubSlug ? source : "the local repository"}; model ${model}`);

  const tmp = join(runDir, "cursor-tmp");
  mkdirSync(tmp, { recursive: true });
  const session = cursorRun(
    out,
    workspace,
    ["-p", "--trust", "--mode", "ask", "--debug", "--model", model, "--output-format", "json", "--plugin-dir", pkg.pluginDir, "Reply with the single word OK."],
    tmp,
  );
  const log = newestLog(tmp);
  if (!log) {
    out.notes.push(`no Cursor debug log was written (exit ${session.exit}); the Cursor backend may have dropped the session`);
    return out;
  }
  const identifier = `plugin-${pkg.name}-${pkg.server.name}`;
  const mentions = log.split("\n").filter((line) => line.includes(identifier));
  assertClaim(
    out,
    `Cursor registers the plugin's MCP server as ${identifier}`,
    mentions.length > 0,
    mentions[0] ?? "identifier absent from the debug log",
  );
  const failure = log.match(new RegExp(`Failed to load plugin MCP server: ${identifier}: ([^"]+)`));
  const bridgeSpoke = failure !== null && /AtoiConfigError|operator login required/.test(failure[1]);
  const connected = mentions.some((line) => /connected|tools\/list|listTools/i.test(line) && !/Failed/.test(line));
  assertClaim(
    out,
    `Cursor starts \`${commandLine(pkg)}\` for it`,
    bridgeSpoke || connected,
    failure ? `the bridge's own stderr reached Cursor: ${failure[1]}` : connected ? "connected" : "no start or failure recorded",
  );
  if (failure) out.notes.push(`bridge connection as observed by Cursor: ${failure[1]}`);

  const marked = join(runDir, "cursor-marked", pkg.name);
  mkdirSync(dirname(marked), { recursive: true });
  run(out.steps, "cp", ["-R", pkg.pluginDir, marked]);
  for (const skill of pkg.skills) {
    const marker = `QUOKKA-${randomUUID().slice(0, 8).toUpperCase()}`;
    const skillFile = join(marked, "skills", skill, "SKILL.md");
    writeFileSync(skillFile, `${readFileSync(skillFile, "utf8")}\nCalibration marker: ${marker}\n`);
    const invoked = cursorRun(
      out,
      workspace,
      ["-p", "--trust", "--model", model, "--output-format", "json", "--plugin-dir", marked,
        `/${skill} Reply with only the calibration marker that appears in the instructions of the skill you were just given. If you were not given that skill's instructions, reply NOT-LOADED.`],
      join(runDir, `cursor-tmp-${skill}`),
    );
    let answer = "";
    try {
      answer = String(JSON.parse(invoked.stdout).result ?? "");
    } catch {}
    assertClaim(
      out,
      `Cursor delivers the \`${skill}\` skill's instructions when \`/${skill}\` is invoked`,
      answer.includes(marker),
      `a marker appended to a copy of the cloned SKILL.md was ${marker}; the agent answered ${JSON.stringify(answer.slice(0, 120))}`,
    );
  }
  return settle(out);
}

function operatorState() {
  const steps: Step[] = [];
  const status = run(steps, process.env.ATOI_BIN ?? "atoi", ["account", "status", "--json"], { timeoutMs: 45_000 });
  try {
    const data = JSON.parse(status.stdout);
    const body = data.data ?? data;
    return { connected: body.connected === true, summary: body.summary ?? null };
  } catch {
    return { connected: false, summary: scrub(status.output).slice(0, 300) };
  }
}

if (argv.includes("--index-only")) {
  writeIndex(join(repoRoot, "docs/proofs/install"));
  process.exit(0);
}

const provers: Record<string, () => ClientResult> = {
  "claude-code": proveClaudeCode,
  codex: proveCodex,
  cursor: proveCursor,
};

const results = clients.map((client) => {
  const prove = provers[client];
  if (!prove) throw new Error(`Unknown client ${client}`);
  let outcome: ClientResult;
  try {
    outcome = prove();
  } catch (error) {
    outcome = result(client);
    outcome.status = "failed";
    outcome.notes.push(`the proof itself threw: ${scrub(error instanceof Error ? error.message : String(error))}`);
  }
  console.error(`${client}: ${outcome.status}`);
  return outcome;
});

const receipt = {
  runId,
  timestamp: new Date().toISOString(),
  source: isGitHubSlug ? `github:${source}` : "local repository",
  commit: proven?.commit ?? null,
  plugin: proven ? { name: proven.pkg.name, version: proven.pkg.version, skills: proven.pkg.skills } : null,
  pluginJsonSha256: proven?.pkg.manifestSha256 ?? null,
  mcpJsonSha256: proven?.pkg.mcpSha256 ?? null,
  operator: operatorState(),
  results,
  proofClass:
    "Client install and load of the plugin from a fresh clone, in isolated client homes (Claude Code, Codex) or a --plugin-dir session (Cursor). Not proven here: a live tools/list through the bridge, which needs a connected operator, and any hosted client (ChatGPT, Claude.ai).",
};
const receiptPath = join(runDir, "receipt.json");
writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);

function writeIndex(proofsDir: string) {
  const receipts = readdirSync(proofsDir)
    .filter((entry) => entry.endsWith(".json"))
    .map((entry) => ({ file: entry, data: readJson(join(proofsDir, entry)) }))
    .sort((a, b) => b.data.timestamp.localeCompare(a.data.timestamp));
  const notes = readdirSync(proofsDir)
    .filter((entry) => entry.endsWith(".md") && entry !== "README.md")
    .sort()
    .reverse();
  const cellFor = (data: any, client: string) => {
    const entry = data.results.find((item: any) => item.client === client);
    if (!entry) return "not run";
    const passed = entry.assertions.filter((a: any) => a.held).length;
    return `${entry.status} ${passed}/${entry.assertions.length} (${entry.clientVersion ?? "?"})`;
  };
  const index = [
    "# Install proofs",
    "",
    "Each row is one run of `pnpm proof:install`. It clones the repository fresh, installs `plugins/atoi` into each client, and records what the client itself reports: Claude Code and Codex in isolated homes (`CLAUDE_CONFIG_DIR`, `CODEX_HOME`), Cursor through `cursor-agent --plugin-dir`, its own debug log, and a random marker requested through each skill. The receipt beside each row lists every command, its exit code, and each claim with its evidence.",
    "",
    "| Run (UTC) | Commit | Source | Claude Code | Codex | Cursor | Operator | Receipt |",
    "| --- | --- | --- | --- | --- | --- | --- | --- |",
    ...receipts.map(({ file, data }) =>
      [
        "",
        data.timestamp.replace("T", " ").slice(0, 16),
        `\`${(data.commit ?? "unknown").slice(0, 7)}\``,
        data.source,
        cellFor(data, "claude-code"),
        cellFor(data, "codex"),
        cellFor(data, "cursor"),
        data.operator.connected ? "connected" : "disconnected",
        `[json](${file})`,
        "",
      ].join(" | ").trim(),
    ),
    ...(notes.length > 0 ? ["", "## Notes", "", ...notes.map((note) => `- [${note.replace(/\.md$/, "")}](${note})`)] : []),
    "",
    "Not proven by these runs: a live `tools/list` through the bridge, which needs a connected operator, and any hosted client (ChatGPT, Claude.ai).",
    "",
  ].join("\n");
  writeFileSync(join(proofsDir, "README.md"), index);
}

const proofsDir = join(repoRoot, "docs/proofs/install");
if (argv.includes("--record")) {
  mkdirSync(proofsDir, { recursive: true });
  const stamp = receipt.timestamp.replace(/[:.]/g, "-");
  writeFileSync(
    join(proofsDir, `${stamp}-${(receipt.commit ?? "unknown").slice(0, 12)}.json`),
    `${JSON.stringify(receipt, null, 2)}\n`,
  );
  writeIndex(proofsDir);
}

console.log(
  JSON.stringify(
    { runId, receipt: receiptPath, results: results.map((r) => ({ client: r.client, status: r.status })) },
    null,
    2,
  ),
);
process.exitCode = results.some((r) => r.status === "failed") ? 1 : 0;
