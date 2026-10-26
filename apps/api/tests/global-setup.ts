import { execFileSync } from "node:child_process";
import path from "node:path";
import { Client } from "pg";

function testDatabaseUrl(): string {
  const url = process.env.TEST_DATABASE_URL;

  if (!url) {
    throw new Error(
      "TEST_DATABASE_URL must be defined. Refusing to run database setup.",
    );
  }

  return url;
}

function assertTestDatabase(url: string): string {
  const parsed = new URL(url);
  const databaseName = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
  if (!databaseName.endsWith("_test")) {
    throw new Error(
      `Refusing to reset database "${databaseName}": test database name must end with _test`,
    );
  }
  return databaseName;
}

export default async function globalSetup(): Promise<void> {
  const url = testDatabaseUrl();
  const databaseName = assertTestDatabase(url);

  const adminUrl = new URL(url);
  adminUrl.pathname = "/postgres";
  adminUrl.search = "";

  const adminClient = new Client({ connectionString: adminUrl.toString() });
  await adminClient.connect();
  try {
    const exists = await adminClient.query("SELECT 1 FROM pg_database WHERE datname = $1", [
      databaseName,
    ]);
    if (exists.rowCount === 0) {
      // Identifier is validated by the _test suffix and quoted here.
      await adminClient.query(`CREATE DATABASE "${databaseName.replace(/"/g, '""')}"`);
    }
  } finally {
    await adminClient.end();
  }

  const testClient = new Client({ connectionString: url });
  await testClient.connect();
  try {
    // Guarantee a clean schema for every run. This is safe because the database
    // name was verified to end with _test above.
    await testClient.query("DROP SCHEMA IF EXISTS public CASCADE");
    await testClient.query("CREATE SCHEMA public");
  } finally {
    await testClient.end();
  }

  const npx = process.platform === "win32" ? "npx.cmd" : "npx";
  execFileSync(npx, ["prisma", "migrate", "deploy", "--schema", path.resolve("prisma/schema.prisma")], {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: url, NODE_ENV: "test" },
    stdio: "inherit",
  });
}
