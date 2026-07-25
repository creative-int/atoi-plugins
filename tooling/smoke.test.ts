import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const smoke = join(root, "tooling", "smoke.ts");

function fakeAbbie(responses: {
  config?: object;
  connected?: boolean;
  live?: object;
}) {
  const directory = mkdtempSync(join(tmpdir(), "abbie-plugin-smoke-"));
  const executable = join(directory, "abbie");
  const config = responses.config ?? {
    mcpServers: {
      abbie: { command: "abbie", args: ["mcp", "serve"] },
    },
  };
  const source = `#!/bin/sh
case "$*" in
  "version --json")
    printf '%s\\n' '${JSON.stringify({ data: { version: "0.3.1" } })}'
    ;;
  "mcp config --client generic --json")
    printf '%s\\n' '${JSON.stringify({ data: { config } })}'
    ;;
  "account status --json")
    printf '%s\\n' '${JSON.stringify({
      data: { connected: responses.connected ?? true },
    })}'
    ;;
  "mcp status --probe --json")
    printf '%s\\n' '${JSON.stringify({
      data: responses.live ?? {
        status: "live",
        scope: "operator",
        protocolVersion: "2025-03-26",
        tools: ["abbie_projects", "abbie_workspace", "abbie_tasks"],
      },
    })}'
    ;;
  *)
    exit 64
    ;;
esac
`;
  writeFileSync(executable, source);
  chmodSync(executable, 0o755);
  return directory;
}

function run(path: string, requireLive = false) {
  return spawnSync(process.execPath, [smoke], {
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: path,
      ABBIE_PLUGIN_SMOKE_REQUIRE_LIVE: requireLive ? "1" : "0",
    },
  });
}

test("accepts the generated config and exact live tool contract", () => {
  const path = fakeAbbie({});
  try {
    const result = run(path, true);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /smoke live/);
  } finally {
    rmSync(path, { recursive: true });
  }
});

test("rejects a client config that differs from the generated adapter", () => {
  const path = fakeAbbie({ config: { mcpServers: {} } });
  try {
    const result = run(path, true);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /generated \.mcp\.json differs/);
  } finally {
    rmSync(path, { recursive: true });
  }
});

test("rejects a live server with a widened tool surface", () => {
  const path = fakeAbbie({
    live: {
      status: "live",
      scope: "operator",
      protocolVersion: "2025-03-26",
      tools: [
        "abbie_projects",
        "abbie_workspace",
        "abbie_tasks",
        "unexpected_tool",
      ],
    },
  });
  try {
    const result = run(path, true);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /live MCP contract mismatch/);
  } finally {
    rmSync(path, { recursive: true });
  }
});

test("classifies a missing CLI as a soft skip in portable verification", () => {
  const path = mkdtempSync(join(tmpdir(), "abbie-plugin-empty-path-"));
  try {
    const result = run(path);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /smoke skipped: the Abbie CLI is not installed/);
  } finally {
    rmSync(path, { recursive: true });
  }
});

test("requires the CLI when live proof is requested", () => {
  const path = mkdtempSync(join(tmpdir(), "abbie-plugin-empty-path-"));
  try {
    const result = run(path, true);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /the Abbie CLI is not installed/);
  } finally {
    rmSync(path, { recursive: true });
  }
});
