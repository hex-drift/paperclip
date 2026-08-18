import { createHash, randomBytes } from "node:crypto";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { agents, agentApiKeys } from "@paperclipai/db";

const DATABASE_URL = process.env.DATABASE_URL!;
const COMPANY_ID = "c6b1372e-0243-41db-beaa-338820c48ad5";

async function main() {
  const sql = postgres(DATABASE_URL);
  const db = drizzle(sql);

  // 1. Create Agent
  const agentId = crypto.randomUUID();
  await db.insert(agents).values({
    id: agentId,
    companyId: COMPANY_ID,
    name: "Remote Worker",
    role: "worker",
    status: "active",
    adapterType: "gemini_local", // Default for workers
    capabilities: {},
    adapterConfig: {},
    runtimeConfig: {},
  });

  // 2. Create API Key
  const token = `pcp_${randomBytes(24).toString("hex")}`;
  const keyHash = createHash("sha256").update(token).digest("hex");
  
  await db.insert(agentApiKeys).values({
    agentId,
    companyId: COMPANY_ID,
    name: "manual-token",
    keyHash,
  });

  console.log(JSON.stringify({
    agentId,
    companyId: COMPANY_ID,
    token
  }, null, 2));

  await sql.end();
}

main().catch(console.error);
