import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";

const directory = path.resolve(process.argv[2] ?? "");
const manifest = JSON.parse(fs.readFileSync(path.join(directory, "manifest.json"), "utf8"));
if (manifest.status !== "exported") throw new Error("Export is not marked complete.");
for (const file of manifest.files) {
  if (path.basename(file.file) !== file.file) throw new Error("Invalid backup filename.");
  const bytes = fs.readFileSync(path.join(directory, file.file));
  if (crypto.createHash("sha256").update(bytes).digest("hex") !== file.sha256) throw new Error("Backup checksum mismatch.");
  if (spawnSync("git", ["check-ignore", "--quiet", path.relative(process.cwd(), path.join(directory, file.file))]).status !== 0) throw new Error("Backup file is not Git-ignored.");
}
const schema = fs.readFileSync(path.join(directory, "schema.sql"), "utf8");
const publicTables = [...schema.matchAll(/^CREATE TABLE(?: IF NOT EXISTS)? "public"\."([^"]+)"/gm)].length;
const data = fs.readFileSync(path.join(directory, "data.sql"), "utf8");
const blocks = [...data.matchAll(/^COPY "?([a-z_]+)"?\."?([a-z_]+)"?[^\n]*FROM stdin;\r?\n([\s\S]*?)^\\\.\r?$/gm)];
const users = blocks.find(block => block[1] === "auth" && block[2] === "users");
const authUsers = users ? users[3].split(/\r?\n/).filter(Boolean).length : 0;
if (publicTables !== manifest.counts.public_tables || authUsers !== manifest.counts.auth_users) throw new Error("Exported table/user counts do not match the source database check.");
console.log(JSON.stringify({ checksumsMatch: true, gitIgnored: true, publicTablesExported: publicTables, authUsersExported: authUsers, copyBlocks: blocks.length, restoreTested: false }));
