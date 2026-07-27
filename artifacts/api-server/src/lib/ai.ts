interface GenerateOptions {
  type: "prototype" | "investor_feedback" | "nitra_feedback";
  companyName?: string;
  description?: string;
  prompt?: string;
  targetMarket?: string;
  revenueModel?: string;
}

export async function generateAIContent(opts: GenerateOptions): Promise<string> {
  if (opts.type === "prototype") {
    return generatePrototypeContent(opts);
  }
  if (opts.type === "investor_feedback") {
    return generateInvestorFeedback(opts);
  }
  return generateNitraFeedback(opts);
}

function generatePrototypeContent(opts: GenerateOptions): string {
  const name = opts.companyName ?? "Your Idea";
  const desc = opts.description ?? "";
  const prompt = opts.prompt ?? "";

  return `## ${name} — Prototype Overview

**Vision**
${prompt || `${name} is an innovative solution designed to ${desc || "solve real problems for real users"}.`}

**Core Value Proposition**
${name} delivers measurable value by streamlining workflows and reducing friction for its target audience. The platform is built around three core pillars: simplicity, speed, and scalability.

**Key Features**
- Intuitive onboarding that gets users to value in under 5 minutes
- AI-powered recommendations tailored to each user's context
- Real-time collaboration tools for teams of any size
- Robust analytics dashboard with actionable insights
- Mobile-first design accessible from any device

**Target Market**
${opts.targetMarket ?? `Professionals and small-to-medium businesses looking to improve productivity and achieve better outcomes.`}

**Technical Architecture**
The platform leverages a modern microservices architecture, cloud-native infrastructure, and a responsive web application. Data is encrypted at rest and in transit. Uptime SLA of 99.9%.

**Go-to-Market Strategy**
Phase 1: Launch a free tier to build initial user base and gather feedback.
Phase 2: Introduce paid plans with advanced features for power users and teams.
Phase 3: Expand through strategic partnerships and integrations with complementary tools.

**Revenue Model**
Freemium SaaS with tiered subscription plans starting at $19/month. Enterprise contracts available for large organizations.

**Competitive Advantage**
${name} differentiates itself through superior user experience, faster time-to-value, and a pricing model that scales with customer success. Unlike legacy competitors, the platform is built API-first and integrates seamlessly with existing workflows.`;
}

function generateInvestorFeedback(opts: GenerateOptions): string {
  const name = opts.companyName ?? "Your Company";
  const desc = opts.description ?? "";
  const market = opts.targetMarket ?? "general consumers";
  const revenue = opts.revenueModel ?? "subscription";

  const score = 62;

  return JSON.stringify({
    verdict: "Conditional Interest",
    summary: `${name} shows genuine potential in the ${market} space. The core concept addresses a real pain point, and the ${revenue} model is proven. However, investors will want to see stronger differentiation, clearer unit economics, and evidence of early traction before committing capital. The team's execution capability will be the deciding factor.`,
    score,
    points: [
      {
        type: "positive",
        text: `The ${market} market is large and growing, providing significant upside for a well-executed solution.`,
      },
      {
        type: "positive",
        text: `A ${revenue}-based revenue model provides predictable, recurring revenue that investors value.`,
      },
      {
        type: "positive",
        text: `${name} addresses a genuine pain point with clear user benefit — the "why" is easy to communicate.`,
      },
      {
        type: "concern",
        text: "The competitive landscape is crowded. Investors will need to understand why customers choose you over established players.",
      },
      {
        type: "concern",
        text: "Unit economics are unclear. Customer acquisition cost (CAC) vs. lifetime value (LTV) needs to be defined and defensible.",
      },
      {
        type: "concern",
        text: "No evidence of early traction or pilot customers was provided. Even 10 paying users transforms the fundraising conversation.",
      },
      {
        type: "advice",
        text: "Build a waitlist or run a pilot program immediately. Real customer validation is worth more than any deck.",
      },
      {
        type: "advice",
        text: `Focus your initial pitch on one specific use case within the ${market} segment — avoid the 'boil the ocean' trap.`,
      },
    ],
  });
}

function generateNitraFeedback(opts: GenerateOptions): string {
  const name = opts.companyName ?? "Your Company";
  const market = opts.targetMarket ?? "your target audience";
  const revenue = opts.revenueModel ?? "subscription";

  return JSON.stringify({
    verdict: "Promising — Needs Sharper Focus",
    summary: `${name} has the core ingredients of a viable business: a real problem, a target market, and a revenue model. The biggest opportunity for improvement is sharper product positioning and a clearer path to first customers. Here's how Nitra recommends strengthening your idea before you build.`,
    score: 71,
    points: [
      {
        type: "strength",
        text: `Your idea clearly identifies a real problem. The best companies start exactly here — don't lose sight of this as you iterate.`,
      },
      {
        type: "strength",
        text: `The ${revenue} model is well-suited to this type of product and creates predictable revenue as you scale.`,
      },
      {
        type: "improvement",
        text: `Narrow your initial target. Instead of all of "${market}", identify the 100 people who need this most urgently. Build for them first.`,
      },
      {
        type: "improvement",
        text: "Write a one-sentence pitch: '[Name] helps [specific person] do [specific thing] so they can [specific outcome].' If it takes more than one sentence, the idea needs more focus.",
      },
      {
        type: "improvement",
        text: "Define your unfair advantage. What do you know, who do you know, or what can you do that a well-funded competitor can't easily replicate?",
      },
      {
        type: "action",
        text: "Talk to 10 potential customers this week. Don't pitch — just ask about their current pain. Their words will sharpen your product better than any framework.",
      },
      {
        type: "action",
        text: "Build the smallest thing that creates real value. A spreadsheet, a Notion template, or a manual concierge service can validate demand before you write a single line of code.",
      },
      {
        type: "action",
        text: `Research 3 competitors deeply. For each: what do customers love, what do they hate, and what gap does ${name} fill that they don't?`,
      },
    ],
  });
}
