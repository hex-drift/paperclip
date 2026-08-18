const apiUrl = process.env.PAPERCLIP_API_URL;
const apiKey = process.env.PAPERCLIP_API_KEY;

if (!apiUrl || !apiKey) {
  throw new Error("PAPERCLIP_API_URL and PAPERCLIP_API_KEY are required");
}

const companyId = "58cbd50e-4838-4a7b-a38e-29928f87df78";
const headers = {
  Authorization: `Bearer ${apiKey}`,
  "Content-Type": "application/json",
};

async function request(path, options = {}) {
  const response = await fetch(`${apiUrl}${path}`, { headers, ...options });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${options.method || "GET"} ${path} failed (${response.status}): ${JSON.stringify(body)}`);
  }
  return body;
}

const common = `
## Objective

Build and immediately apply an evidence-backed professional identity and English-primary outreach voice for your own LinkedIn account.

## Required LinkedIn research

- Authenticate only with your configured credentials and TOTP.
- Use only the authenticated self-profile starting from https://www.linkedin.com/in/me/. Do not search for namesakes or substitute another profile.
- Capture every visible profile section: canonical profile URL, headline, About, location, contact fields, featured items, services, current and prior experience, education, certifications, projects, volunteering, skills, recommendations, interests, and other visible professional details.
- Analyze up to 100 of your own accessible posts/reposts/articles/comments, newest first. Stop earlier if LinkedIn exposes fewer items.
- For each analyzed activity item record URL or stable identifier when visible, date, type, topic, audience, stance, opening pattern, structure, vocabulary, CTA, tone, and engagement signals. Never invent unavailable text or metrics.

## Evidence rules

- Separate Verified facts, Observed communication patterns, Inferred preferences, and Unknown/not visible.
- Every career fact and material voice conclusion must cite its LinkedIn section, post URL/date, or the supplied local context below.
- Resolve conflicts explicitly. Current authenticated LinkedIn data wins for LinkedIn facts; supplied local context is authoritative for business positioning not shown in the public headline.
- Do not expose credentials, TOTP values, cookies, tokens, or reusable session state.

## Required work products in this issue

Post a complete structured report containing:

1. Source inventory and canonical self-profile proof.
2. Full visible professional profile and chronological work history.
3. Activity corpus inventory, coverage dates, and per-item evidence table for up to 100 items.
4. Topic clusters, recurring opinions, professional interests, expertise signals, and relationship-building behavior.
5. English-primary voice analysis: tone, sentence length, vocabulary, openings, narrative structure, CTA style, formality, humor, confidence, and patterns to avoid.
6. Outreach identity: credible role, NodeArt relationship, target ICPs, buyer personas, pains, value propositions, proof points, conversation starters, objection handling, and safe claims.
7. A compact Identity Card and Voice Card suitable for runtime instructions.
8. At least five representative first-contact messages, three follow-ups, and three public-post examples that sound like the authenticated account while remaining truthful.
9. A list of uncertain or contradictory claims requiring human review.

## Automatic application

After posting the report, update only your own managed AGENTS.md instructions. Preserve operational and security rules, especially self-profile-only access. Add a concise Professional Identity, Evidence Boundaries, English Voice, Outreach Positioning, ICP, Messaging Do/Don't, and Local Business Context section. Do not edit the other LinkedIn agent or any other organization.

## Completion gate

- Re-read the updated instructions and quote the final Identity Card and Voice Card in the issue.
- Confirm the instructions reference the authenticated canonical profile and explicitly prohibit impersonating unsupported experience or opinions.
- Mark done only after the report and instruction update are both verifiable.
`;

const tasks = [
  {
    title: "Build and apply Konstantin Nosov LinkedIn identity and outreach voice",
    assigneeAgentId: "aa366a7d-8b9e-43eb-8f73-d04eeefa40e9",
    description: `${common}\n## Supplied local business context\n\n- Name: Kostya Nosov / Konstantin Nosov.\n- Expected username: nosovk.\n- Current positioning: Chief Technology Officer at Mailcheck.co; technical partner working with NodeArt.io. Mention NodeArt briefly in outreach because it may not appear in the current LinkedIn headline.\n- Location context: Hamburg, Germany.\n- Bio context: managing digital products and high-performance technology ecosystems; software-engineering leadership, email infrastructure, and scaling development capacity.\n- Outreach posture: peer-to-peer with CTOs and VPs of Engineering on technical integration topics.\n- Relevant sectors: sports tech, fintech, e-commerce, and PIM.\n`,
  },
  {
    title: "Build and apply Olha Nosova LinkedIn identity and outreach voice",
    assigneeAgentId: "51d4ec49-8f02-4fc3-bc84-d8832bf733cc",
    description: `${common}\n## Supplied local business context\n\n- Name: Olga/Olha Nosova.\n- Expected username: olga-nosova-a0613b23.\n- Current positioning: Business Developer at NodeArt.io focused on IT outsourcing, outstaffing, and digital partnerships.\n- Location context: Ukraine / remote.\n- NodeArt is a boutique agency offering senior React, Svelte/SvelteKit, Node.js, Go/Golang, Fastify, and Pimcore engineers.\n- Primary audiences: founders, CTOs, product leaders, talent-acquisition leads, and engineering heads in EU, UK, and US.\n- Current campaign themes: Svelte/SvelteKit, Fastify, Pimcore, engineering capacity, and technical partnerships.\n`,
  },
];

const existingIssues = await request(`/api/companies/${companyId}/issues`);

for (const task of tasks) {
  const existing = existingIssues.find(
    (issue) => issue.title === task.title && issue.assigneeAgentId === task.assigneeAgentId,
  );
  const issue = existing || await request(`/api/companies/${companyId}/issues`, {
      method: "POST",
      body: JSON.stringify({
        ...task,
        status: "todo",
        priority: "high",
      }),
    });
  console.log(JSON.stringify({ id: issue.id, identifier: issue.identifier, assigneeAgentId: issue.assigneeAgentId }));
}
