import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const roots = [
  "abbie.config.ts",
  ".mcp.json",
  ".claude-plugin",
  ".codex-plugin",
  ".cursor-plugin",
  "server.json",
  "skills",
];

function filesAt(path: string): string[] {
  if (!statSync(path).isDirectory()) {
    return [path];
  }
  return readdirSync(path)
    .flatMap((entry) => filesAt(join(path, entry)))
    .sort();
}

const files = roots
  .flatMap((entry) => filesAt(join(root, entry)))
  .sort((left, right) => left.localeCompare(right));
const hash = createHash("sha256");

for (const path of files) {
  const relativePath = relative(root, path).split(sep).join("/");
  const content = readFileSync(path);
  hash.update(relativePath);
  hash.update("\0");
  hash.update(String(content.byteLength));
  hash.update("\0");
  hash.update(content);
  hash.update("\0");
}

console.log(
  JSON.stringify(
    {
      algorithm: "sha256",
      contentHash: hash.digest("hex"),
      files: files.map((path) => relative(root, path).split(sep).join("/")),
    },
    null,
    2,
  ),
);
