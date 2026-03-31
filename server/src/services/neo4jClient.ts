import neo4j, { Driver, Session } from "neo4j-driver";
import dotenv from "dotenv";

dotenv.config();

const MAX_RETRY_ATTEMPTS = 3;
const INITIAL_RETRY_DELAY_MS = 500;

let driver: Driver | null = null;

export const isNeo4jConfigured = (): boolean =>
  Boolean(
    process.env.NEO4J_URI &&
      process.env.NEO4J_USERNAME &&
      process.env.NEO4J_PASSWORD,
  );

const getDriver = (): Driver => {
  if (driver) return driver;

  if (!isNeo4jConfigured()) {
    throw new Error(
      "Neo4j is not configured. Set NEO4J_URI, NEO4J_USERNAME, and NEO4J_PASSWORD.",
    );
  }

  driver = neo4j.driver(
    process.env.NEO4J_URI!,
    neo4j.auth.basic(process.env.NEO4J_USERNAME!, process.env.NEO4J_PASSWORD!),
    {
      maxConnectionPoolSize: 50,
      connectionAcquisitionTimeout: 10_000,
      maxTransactionRetryTime: 30_000,
    },
  );

  return driver;
};

export const getSession = (
  mode: typeof neo4j.session.READ | typeof neo4j.session.WRITE = neo4j.session
    .READ,
): Session =>
  getDriver().session({
    database: process.env.NEO4J_DATABASE || "neo4j",
    defaultAccessMode: mode,
  });

export const getWriteSession = (): Session => getSession(neo4j.session.WRITE);

export const withRetry = async <T>(
  fn: () => Promise<T>,
  attempts: number = MAX_RETRY_ATTEMPTS,
): Promise<T> => {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const code = error?.code || "";
      const isTransient =
        code === "ServiceUnavailable" ||
        code === "SessionExpired" ||
        code.includes("TransientError");
      if (!isTransient || i === attempts - 1) throw error;
      await new Promise((r) =>
        setTimeout(r, INITIAL_RETRY_DELAY_MS * Math.pow(2, i)),
      );
    }
  }
  throw lastError;
};

export const initGraphSchema = async (): Promise<void> => {
  if (!isNeo4jConfigured()) {
    console.log("Neo4j not configured — graph features disabled.");
    return;
  }

  const session = getWriteSession();
  try {
    await session.run(
      "CREATE CONSTRAINT doc_source_id IF NOT EXISTS FOR (d:Document) REQUIRE d.sourceId IS UNIQUE",
    );
    await session.run(
      "CREATE CONSTRAINT chunk_id IF NOT EXISTS FOR (c:Chunk) REQUIRE c.chunkId IS UNIQUE",
    );
    await session.run(
      "CREATE INDEX entity_normalized IF NOT EXISTS FOR (e:Entity) ON (e.normalizedName, e.type)",
    );
    await session.run(
      "CREATE FULLTEXT INDEX entity_name_ft IF NOT EXISTS FOR (e:Entity) ON EACH [e.name, e.normalizedName]",
    );
    console.log("Neo4j graph schema initialized.");
  } finally {
    await session.close();
  }
};

export const isNeo4jHealthy = async (): Promise<boolean> => {
  if (!isNeo4jConfigured()) return false;
  const session = getSession();
  try {
    await session.run("RETURN 1");
    return true;
  } catch {
    return false;
  } finally {
    await session.close();
  }
};

export const closeNeo4j = async (): Promise<void> => {
  if (driver) {
    await driver.close();
    driver = null;
  }
};
