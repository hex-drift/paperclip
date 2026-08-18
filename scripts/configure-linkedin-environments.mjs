import { readFile } from "node:fs/promises";

const apiUrl = process.env.PAPERCLIP_API_URL;
const apiKey = process.env.PAPERCLIP_API_KEY;
const privateKeyPaths = {
  konstantin: process.env.LINKEDIN_KONSTANTIN_PRIVATE_KEY_PATH,
  olha: process.env.LINKEDIN_OLHA_PRIVATE_KEY_PATH,
};

if (!apiUrl || !apiKey || !privateKeyPaths.konstantin || !privateKeyPaths.olha) {
  throw new Error(
    "PAPERCLIP_API_URL, PAPERCLIP_API_KEY, LINKEDIN_KONSTANTIN_PRIVATE_KEY_PATH, and LINKEDIN_OLHA_PRIVATE_KEY_PATH are required",
  );
}

const companyId = "58cbd50e-4838-4a7b-a38e-29928f87df78";
const agents = {
  konstantin: "aa366a7d-8b9e-43eb-8f73-d04eeefa40e9",
  olha: "51d4ec49-8f02-4fc3-bc84-d8832bf733cc",
};
const headers = {
  Authorization: `Bearer ${apiKey}`,
  "Content-Type": "application/json",
};
const privateKeys = {
  konstantin: await readFile(privateKeyPaths.konstantin, "utf8"),
  olha: await readFile(privateKeyPaths.olha, "utf8"),
};

async function request(path, options = {}) {
  const response = await fetch(`${apiUrl}${path}`, { headers, ...options });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${options.method || "GET"} ${path} failed (${response.status}): ${JSON.stringify(body)}`);
  }
  return body;
}

async function ensureEnvironment(name, host, privateKey) {
  const existing = await request(`/api/companies/${companyId}/environments`);
  const found = existing.find((environment) => environment.name === name);
  const payload = {
    name,
    description: `Dedicated isolated LinkedIn runtime for ${name}.`,
    driver: "ssh",
    config: {
      host,
      port: 22,
      username: "agent",
      remoteWorkspacePath: "/workspace",
      privateKey,
      knownHosts: null,
      strictHostKeyChecking: false,
    },
    envVars: {},
    metadata: {
      organization: "linkedin",
      isolated: true,
    },
  };

  return request(found ? `/api/environments/${found.id}` : `/api/companies/${companyId}/environments`, {
    method: found ? "PATCH" : "POST",
    body: JSON.stringify(payload),
  });
}

const konstantinEnvironment = await ensureEnvironment(
  "LIN Konstantin isolated",
  "linkedin-konstantin",
  privateKeys.konstantin,
);
const olhaEnvironment = await ensureEnvironment("LIN Olha isolated", "linkedin-olha", privateKeys.olha);

await request(`/api/agents/${agents.konstantin}`, {
  method: "PATCH",
  body: JSON.stringify({ defaultEnvironmentId: konstantinEnvironment.id }),
});
await request(`/api/agents/${agents.olha}`, {
  method: "PATCH",
  body: JSON.stringify({ defaultEnvironmentId: olhaEnvironment.id }),
});

for (const environment of [konstantinEnvironment, olhaEnvironment]) {
  const probe = await request(`/api/environments/${environment.id}/probe`, {
    method: "POST",
    body: JSON.stringify({}),
  });
  console.log(JSON.stringify({ environment: environment.name, id: environment.id, probe }, null, 2));
}
