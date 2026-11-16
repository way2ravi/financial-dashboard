import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const options = process.argv.slice(2);
const cliIndex = options.indexOf("--cli");
const cli = cliIndex >= 0 ? options[cliIndex + 1] : "supabase";
const caIndex = options.indexOf("--ca");
const certificatePath = caIndex >= 0 ? path.resolve(options[caIndex + 1]) : null;
if (certificatePath && !new crypto.X509Certificate(fs.readFileSync(certificatePath)).ca) throw new Error("Expected a CA certificate downloaded from the Supabase project settings.");
const configuration = fs.readFileSync(path.join(root, ".env.backup.local"), "utf8");
const credentials = Object.fromEntries(configuration.split(/\r?\n/)
  .filter(line => /^(PGHOST|PGPORT|PGDATABASE|PGUSER|PGPASSWORD)=/.test(line))
  .map(line => { const i = line.indexOf("="); return [line.slice(0, i), line.slice(i + 1).trim()]; }));
for (const name of ["PGHOST", "PGPORT", "PGDATABASE", "PGUSER", "PGPASSWORD"]) {
  if (!credentials[name] || /[\r\n\0]/.test(credentials[name])) throw new Error(`Missing or invalid ${name}; no connection attempted.`);
}
if (!/^(?:[a-z0-9.-]+\.pooler\.supabase\.com|db\.[a-z0-9]+\.supabase\.co)$/.test(credentials.PGHOST) ||
    credentials.PGPORT !== "5432" || credentials.PGDATABASE !== "postgres" ||
    !/^postgres(?:\.[a-z0-9]+)?$/.test(credentials.PGUSER)) {
  throw new Error("Expected Supabase PostgreSQL/session-pooler parameters on port 5432.");
}
const application = fs.readFileSync(path.join(root, ".env.local"), "utf8");
const configuredProject = application.match(/^NEXT_PUBLIC_SUPABASE_URL\s*=\s*["']?https:\/\/([a-z0-9]+)\.supabase\.co/m)?.[1];
const backupProject = credentials.PGUSER.startsWith("postgres.") ? credentials.PGUSER.slice(9) : credentials.PGHOST.split(".")[1];
if (!configuredProject || configuredProject !== backupProject) throw new Error("Backup connection does not match this application's configured Supabase project.");

const env = { ...process.env, ...credentials, PGSSLMODE: "verify-full", PGSSLROOTCERT: certificatePath ? "/trusted/supabase-ca.crt" : "system", PGCONNECT_TIMEOUT: "20", PGAPPNAME: "Way2Investing read-only backup", PGOPTIONS: "-c default_transaction_read_only=on" };
const image = process.env.SUPABASE_BACKUP_IMAGE || "postgres:17";
const baseArgs = ["run", "--rm", "-i", ...(certificatePath ? ["--mount", `type=bind,source=${certificatePath},target=/trusted/supabase-ca.crt,readonly`] : []), ...[...Object.keys(credentials), "PGSSLMODE", "PGSSLROOTCERT", "PGCONNECT_TIMEOUT", "PGAPPNAME", "PGOPTIONS"].flatMap(key => ["--env", key]), image];
function sanitize(value) {
  let text = String(value ?? "");
  for (const secret of [credentials.PGPASSWORD, encodeURIComponent(credentials.PGPASSWORD), credentials.PGHOST, credentials.PGUSER]) text = text.split(secret).join("[PRIVATE]");
  return text;
}
function checked(result, operation) {
  if (result.error) throw new Error(`${operation}: ${sanitize(result.error.message)}`);
  if (result.status !== 0) throw new Error(`${operation}: ${sanitize(result.stderr).slice(-3500)}`);
  return result;
}
function query(sql) {
  return checked(spawnSync("docker", [...baseArgs, "psql", "--no-psqlrc", "--no-password", "--set", "ON_ERROR_STOP=1", "-At", "-c", sql], { env, encoding: "utf8", timeout: 120000, maxBuffer: 2_000_000 }), "Read-only database check").stdout.trim();
}
function template(flags) {
  const result = checked(spawnSync(cli, ["db", "dump", "--remote=postgresql://postgres@127.0.0.1:5432/postgres", "--dry-run", ...flags], { encoding: "utf8", timeout: 30000, maxBuffer: 2_000_000 }), "Generate official backup template");
  let script = result.stdout;
  const start = script.indexOf("#!/usr/bin/env bash");
  if (start < 0 || !script.includes("pg_dump")) throw new Error("Unexpected Supabase CLI export template.");
  script = script.slice(start);
  let removed = 0;
  script = script.replace(/^export (PGHOST|PGPORT|PGUSER|PGPASSWORD|PGDATABASE)=.*\r?\n/gm, () => { removed++; return ""; });
  if (removed !== 5) throw new Error("Refusing to run a changed credential template.");
  return script;
}

try {
  console.log("Checking the expected Supabase project using TLS and read-only transactions...");
  const version = Number(query("show server_version_num"));
  if (!Number.isFinite(version) || version < 140000 || version >= 180000) throw new Error("Server requires a reviewed backup-client version; export not started.");
  const counts = JSON.parse(query(`select json_build_object('public_tables',(select count(*) from information_schema.tables where table_schema='public' and table_type='BASE TABLE'),'auth_users',(select count(*) from auth.users),'storage_objects',(select count(*) from storage.objects))::text`));
  console.log(JSON.stringify({ connection: "verified", serverMajor: Math.floor(version / 10000), counts }));
  if (options.includes("--check-access")) {
    const result = query(fs.readFileSync(path.join(root, "docs/setup/06-verify-access-read-only.sql"), "utf8"));
    if (!result.includes("OWNER_AND_NONOWNER_READ_CHECKS_PASSED")) throw new Error("Permission checks did not complete.");
    console.log(JSON.stringify({ ownerReadAccess: "passed", previousOwnerResearchDenied: "passed", anonymousResearchDenied: "passed", recommendationPermissionsOff: true, databaseModified: false }));
    process.exit(0);
  }
  if (options.includes("--check")) process.exit(0);

  const container = path.join(root, ".env.database-backups");
  fs.mkdirSync(container, { recursive: true });
  const ignored = spawnSync("git", ["check-ignore", "--quiet", path.relative(root, container)], { cwd: root });
  if (ignored.status !== 0) throw new Error("Backup directory is not Git-ignored; refusing to write sensitive exports.");
  const destination = path.join(container, new Date().toISOString().replace(/[:.]/g, "-"));
  fs.mkdirSync(destination);
  const files = [];
  const jobs = [
    { name: "roles.sql", flags: ["--role-only"] },
    { name: "schema.sql", flags: [] },
    { name: "data.sql", flags: ["--data-only", "--use-copy", "-x", "storage.buckets_vectors", "-x", "storage.vector_indexes"] },
  ];
  fs.writeFileSync(path.join(destination, "INCOMPLETE.txt"), "Export in progress. Do not use this directory for recovery until manifest.json reports success.\n");
  for (const job of jobs) {
    console.log(`Exporting ${job.name} (read-only)...`);
    const fd = fs.openSync(path.join(destination, job.name), "wx", 0o600);
    let result;
    try { result = spawnSync("docker", [...baseArgs, "bash", "-seu"], { env, input: template(job.flags), stdio: ["pipe", fd, "pipe"], encoding: "utf8", timeout: 600000, maxBuffer: 3_000_000 }); }
    finally { fs.closeSync(fd); }
    checked(result, `Export ${job.name}`);
    const bytes = fs.readFileSync(path.join(destination, job.name));
    if (job.name === "data.sql" && !bytes.includes(Buffer.from("PostgreSQL database dump complete"))) throw new Error("Data dump completion marker is missing.");
    if (job.name === "schema.sql" && counts.public_tables > 0 && !bytes.includes(Buffer.from("CREATE TABLE"))) throw new Error("Expected public table definitions were not found in the schema export.");
    files.push({ file: job.name, bytes: bytes.length, sha256: crypto.createHash("sha256").update(bytes).digest("hex") });
    console.log(`${job.name}: completed (${bytes.length} bytes).`);
  }
  const data = fs.readFileSync(path.join(destination, "data.sql"), "utf8");
  if (counts.auth_users > 0 && !/COPY\s+"?auth"?\."?users"?\s/.test(data)) throw new Error("Authentication records were not found in the data export.");
  const manifest = { status: "exported", createdAt: new Date().toISOString(), serverVersion: version, counts, files, verification: "Commands succeeded, completion markers and auth records checked; SHA-256 recorded. No restore rehearsal performed.", limitations: ["Storage object files are not included; metadata only.", "Supabase platform settings, API keys, SMTP settings and encryption root keys are not exported.", "Restore into a compatible Supabase environment following the official restore procedure; managed schemas are not recreated by schema.sql."] };
  fs.writeFileSync(path.join(destination, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n", { mode: 0o600 });
  fs.unlinkSync(path.join(destination, "INCOMPLETE.txt"));
  console.log(JSON.stringify({ status: "exported", directory: destination, files, restoreTested: false, storageFilesIncluded: false }));
} catch (error) {
  console.error(sanitize(error instanceof Error ? error.message : error));
  process.exitCode = 1;
}
