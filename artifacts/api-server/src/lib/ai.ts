import OpenAI from "openai";
import { logger } from "./logger";

interface GenerateOptions {
  type: "prototype" | "investor_feedback" | "nitra_feedback";
  companyName?: string;
  description?: string;
  prompt?: string;
  targetMarket?: string;
  revenueModel?: string;
}

interface GenerateResult {
  text: string;
  imageBase64?: string; // base64-encoded PNG, present when the prompt requested an image
}

// Detect whether the user is asking for an image/photo
function isImageRequest(prompt: string): boolean {
  const lower = prompt.toLowerCase();
  return /\b(photo|image|picture|illustration|logo|screenshot|mockup|visual|render|diagram|draw|design|graphic|artwork|banner|icon|cover)\b/.test(lower);
}

function buildImagePrompt(companyName: string, description: string, userPrompt: string): string {
  return `Professional product/startup visual for a company called "${companyName}". ${description ? description + ". " : ""}${userPrompt}. Clean, modern, high-quality digital illustration or product mockup style.`;
}

export async function generateAIContent(opts: GenerateOptions): Promise<string> {
  if (opts.type === "investor_feedback") return generateInvestorFeedback(opts);
  if (opts.type === "nitra_feedback") return generateNitraFeedback(opts);
  return generatePrototypeContent(opts);
}

export async function generatePrototypeWithImage(opts: {
  companyName: string;
  description: string;
  prompt: string;
}): Promise<GenerateResult> {
  const wantsImage = isImageRequest(opts.prompt);
  const text = generatePrototypeContentSync(opts.companyName, opts.description, opts.prompt);

  if (!wantsImage) {
    return { text };
  }

  // Try to generate an image with OpenAI
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    logger.warn("OPENAI_API_KEY not set — skipping image generation");
    return { text };
  }

  try {
    const openai = new OpenAI({ apiKey });
    const imagePrompt = buildImagePrompt(opts.companyName, opts.description, opts.prompt);

    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: imagePrompt,
      n: 1,
      size: "1024x1024",
      response_format: "b64_json",
    });

    const b64 = response.data?.[0]?.b64_json;
    if (b64) {
      logger.info({ companyName: opts.companyName }, "Image generated successfully");
      return { text, imageBase64: b64 };
    }
  } catch (err) {
    logger.error({ err }, "Image generation failed — returning text only");
  }

  return { text };
}

// ── Text generators ──────────────────────────────────────────────────────────

async function generatePrototypeContent(opts: GenerateOptions): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return generatePrototypeContentSync(opts.companyName ?? "Your Idea", opts.description ?? "", opts.prompt ?? "");
  }

  try {
    const openai = new OpenAI({ apiKey });
    const systemPrompt = `You are an expert startup advisor and product strategist. When given a company name, description, and a user prompt, generate a rich, structured prototype overview in Markdown. Include sections: Vision, Core Value Proposition, Key Features (5-7 bullets), Target Market, Technical Architecture, Go-to-Market Strategy, Revenue Model, and Competitive Advantage. Be specific, concrete, and inspiring. Do not use emojis.`;
    const userMessage = `Company: ${opts.companyName ?? "Untitled"}\nDescription: ${opts.description ?? ""}\nPrompt: ${opts.prompt ?? ""}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 1500,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    });
    return completion.choices[0]?.message?.content ?? generatePrototypeContentSync(opts.companyName ?? "", opts.description ?? "", opts.prompt ?? "");
  } catch (err) {
    logger.error({ err }, "OpenAI text generation failed — using fallback");
    return generatePrototypeContentSync(opts.companyName ?? "", opts.description ?? "", opts.prompt ?? "");
  }
}

function generatePrototypeContentSync(name: string, desc: string, prompt: string): string {
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
Professionals and small-to-medium businesses looking to improve productivity and achieve better outcomes.

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

async function generateInvestorFeedback(opts: GenerateOptions): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey) {
    try {
      const openai = new OpenAI({ apiKey });
      const systemPrompt = `You are a sharp, experienced venture capital investor. Evaluate the startup idea provided and return ONLY valid JSON matching this exact schema:
{
  "verdict": string,        // 2-5 word verdict e.g. "Strong Pass", "Conditional Interest", "Hard Pass"
  "summary": string,        // 2-3 sentence overall assessment
  "score": number,          // 0-100 investability score
  "points": [               // 6-10 points
    { "type": string, "text": string }   // type: "positive" | "concern" | "advice"
  ]
}
Be brutally honest but constructive. Focus on market size, differentiation, unit economics, and team execution risk. Do not use emojis.`;
      const userMessage = `Company: ${opts.companyName}\nDescription: ${opts.description}\nTarget Market: ${opts.targetMarket ?? "unspecified"}\nRevenue Model: ${opts.revenueModel ?? "unspecified"}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 1000,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        response_format: { type: "json_object" },
      });
      const content = completion.choices[0]?.message?.content;
      if (content) return content;
    } catch (err) {
      logger.error({ err }, "OpenAI investor feedback failed — using fallback");
    }
  }
  return generateInvestorFeedbackFallback(opts);
}

function generateInvestorFeedbackFallback(opts: GenerateOptions): string {
  const name = opts.companyName ?? "Your Company";
  const market = opts.targetMarket ?? "general consumers";
  const revenue = opts.revenueModel ?? "subscription";
  return JSON.stringify({
    verdict: "Conditional Interest",
    summary: `${name} shows genuine potential in the ${market} space. The core concept addresses a real pain point, and the ${revenue} model is proven. However, investors will want to see stronger differentiation, clearer unit economics, and evidence of early traction before committing capital.`,
    score: 62,
    points: [
      { type: "positive", text: `The ${market} market is large and growing, providing significant upside for a well-executed solution.` },
      { type: "positive", text: `A ${revenue}-based revenue model provides predictable, recurring revenue that investors value.` },
      { type: "positive", text: `${name} addresses a genuine pain point with clear user benefit.` },
      { type: "concern", text: "The competitive landscape is crowded. Investors will need to understand why customers choose you over established players." },
      { type: "concern", text: "Unit economics are unclear. CAC vs. LTV needs to be defined and defensible." },
      { type: "concern", text: "No evidence of early traction was provided. Even 10 paying users transforms the fundraising conversation." },
      { type: "advice", text: "Build a waitlist or run a pilot program immediately. Real customer validation is worth more than any deck." },
      { type: "advice", text: `Focus your initial pitch on one specific use case within the ${market} segment.` },
    ],
  });
}

async function generateNitraFeedback(opts: GenerateOptions): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey) {
    try {
      const openai = new OpenAI({ apiKey });
      const systemPrompt = `You are Nitra, a supportive but rigorous startup coach. Evaluate the startup idea and return ONLY valid JSON matching this exact schema:
{
  "verdict": string,        // 3-6 word verdict e.g. "Promising — Needs Sharper Focus"
  "summary": string,        // 2-3 sentence overall coaching assessment
  "score": number,          // 0-100 viability score
  "points": [               // 6-10 points
    { "type": string, "text": string }   // type: "strength" | "improvement" | "action"
  ]
}
Be encouraging but specific. Focus on product positioning, customer discovery, and next concrete steps. Do not use emojis.`;
      const userMessage = `Company: ${opts.companyName}\nDescription: ${opts.description}\nTarget Market: ${opts.targetMarket ?? "unspecified"}\nRevenue Model: ${opts.revenueModel ?? "unspecified"}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 1000,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        response_format: { type: "json_object" },
      });
      const content = completion.choices[0]?.message?.content;
      if (content) return content;
    } catch (err) {
      logger.error({ err }, "OpenAI Nitra feedback failed — using fallback");
    }
  }
  return generateNitraFeedbackFallback(opts);
}

function generateNitraFeedbackFallback(opts: GenerateOptions): string {
  const name = opts.companyName ?? "Your Company";
  const market = opts.targetMarket ?? "your target audience";
  const revenue = opts.revenueModel ?? "subscription";
  return JSON.stringify({
    verdict: "Promising — Needs Sharper Focus",
    summary: `${name} has the core ingredients of a viable business: a real problem, a target market, and a revenue model. The biggest opportunity for improvement is sharper product positioning and a clearer path to first customers.`,
    score: 71,
    points: [
      { type: "strength", text: `Your idea clearly identifies a real problem. The best companies start exactly here.` },
      { type: "strength", text: `The ${revenue} model is well-suited to this type of product and creates predictable revenue as you scale.` },
      { type: "improvement", text: `Narrow your initial target. Instead of all of "${market}", identify the 100 people who need this most urgently.` },
      { type: "improvement", text: "Write a one-sentence pitch: '[Name] helps [specific person] do [specific thing] so they can [specific outcome].'"},
      { type: "improvement", text: "Define your unfair advantage. What do you know or can do that a well-funded competitor can't easily replicate?" },
      { type: "action", text: "Talk to 10 potential customers this week. Don't pitch — just ask about their current pain." },
      { type: "action", text: "Build the smallest thing that creates real value. Validate demand before you write a single line of code." },
      { type: "action", text: `Research 3 competitors deeply. What gap does ${name} fill that they don't?` },
    ],
  });
}
