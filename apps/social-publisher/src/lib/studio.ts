export const platforms = [
  { id: "facebook", name: "Facebook", mark: "f", color: "#1877f2", format: "Page posts", requirement: "A Facebook Page, a Meta developer app, and publishing permissions.", docs: "https://developers.facebook.com/docs/pages-api/posts/" },
  { id: "instagram", name: "Instagram", mark: "◎", color: "#c13584", format: "Images & Reels", requirement: "An Instagram professional account, approved permissions, and hosted image or video assets.", docs: "https://developers.facebook.com/docs/instagram-platform/content-publishing/" },
  { id: "youtube", name: "YouTube", mark: "▶", color: "#e53935", format: "Videos & Shorts", requirement: "A YouTube channel, Google OAuth consent, upload access, and a rendered video. A text draft cannot be uploaded as a video.", docs: "https://developers.google.com/youtube/v3/docs/videos/insert" },
  { id: "x", name: "X / Twitter", mark: "𝕏", color: "#17212d", format: "Text & media", requirement: "An X developer app with write access and user authorization.", docs: "https://docs.x.com/x-api/posts/create-post" },
  { id: "threads", name: "Threads", mark: "@", color: "#17212d", format: "Text & media", requirement: "A Threads profile, Meta Threads app, and publishing permissions.", docs: "https://developers.facebook.com/docs/threads/posts/" },
] as const;

export type Platform = typeof platforms[number]["id"];
export type StoryKind = "Earnings" | "Breaking news" | "Market recap";
export type Story = { id: string; kind: StoryKind; ticker: string; title: string; summary: string; source: string; sourceUrl: string; time: string; demo: boolean };
export type Draft = { id: string; storyId?: string; title: string; text: string; platforms: Platform[]; status: "Draft" | "Approved"; createdAt: string; scheduledAt: string | null };
export type Rule = { id: string; name: string; description: string; kind: StoryKind; enabled: boolean; platforms: Platform[] };
export type StudioState = { version: 1; drafts: Draft[]; rules: Rule[] };

// Explicitly fictional input for reviewing the workflow, never a live market feed.
export const sampleStories: Story[] = [
  { id: "demo-earnings", kind: "Earnings", ticker: "DEMO", title: "Example earnings report beats expectations", summary: "Illustrative data: quarterly EPS of $1.20 versus a $1.10 estimate; revenue of $8.4B versus an $8.1B estimate. These figures are fictional.", source: "Sample earnings feed", sourceUrl: "", time: "Sample", demo: true },
  { id: "demo-news", kind: "Breaking news", ticker: "NEWS", title: "Example company announces a new partnership", summary: "Illustrative headline for testing the editorial workflow. Replace this with a verified, licensed news source before enabling automated publishing.", source: "Sample news feed", sourceUrl: "", time: "Sample", demo: true },
  { id: "demo-recap", kind: "Market recap", ticker: "MARKET", title: "Build your end-of-day market briefing", summary: "A sample market recap template covering major indices, sector performance, and upcoming earnings. No live prices are included.", source: "Sample market feed", sourceUrl: "", time: "Sample", demo: true },
];

export const initialState: StudioState = {
  version: 1, drafts: [], rules: [
    { id: "earnings", name: "Earnings pulse", description: "Turn reported earnings into a factual summary with actuals, estimates, and a source link.", kind: "Earnings", enabled: true, platforms: ["facebook", "x", "threads"] },
    { id: "news", name: "Breaking news desk", description: "Create an editorial draft from a verified company announcement. Review before release.", kind: "Breaking news", enabled: true, platforms: ["facebook", "x", "threads"] },
    { id: "recap", name: "The closing bell", description: "Prepare a daily market recap for your audience, with a separate video workflow for YouTube.", kind: "Market recap", enabled: false, platforms: ["facebook", "instagram", "youtube"] },
  ],
};

export function createDraft(story: Story, rules: Rule[]): Draft {
  const rule = rules.find((item) => item.kind === story.kind && item.enabled);
  return {
    id: crypto.randomUUID(), storyId: story.id, title: story.title,
    text: `${story.demo ? "[SAMPLE — DO NOT PUBLISH]\n\n" : ""}${story.title}\n\n${story.summary}${story.sourceUrl ? `\n\nSource: ${story.sourceUrl}` : ""}\n\n#Way2Investing #${story.kind === "Earnings" ? "Earnings" : "MarketNews"}`,
    platforms: [...(rule?.platforms ?? ["facebook", "x", "threads"])],
    status: "Draft", createdAt: new Date().toISOString(), scheduledAt: null,
  };
}

export function isStudioState(value: unknown): value is StudioState {
  if (!value || typeof value !== "object") return false;
  const state = value as StudioState;
  const validPlatforms = (items: unknown): items is Platform[] => Array.isArray(items) && items.every((id) => platforms.some((p) => p.id === id));
  return state.version === 1 && Array.isArray(state.drafts) && Array.isArray(state.rules)
    && state.drafts.every((d) => d && typeof d.id === "string" && typeof d.title === "string" && typeof d.text === "string" && validPlatforms(d.platforms) && ["Draft", "Approved"].includes(d.status) && typeof d.createdAt === "string" && (d.scheduledAt === null || typeof d.scheduledAt === "string"))
    && state.rules.every((r) => r && typeof r.id === "string" && typeof r.name === "string" && typeof r.description === "string" && ["Earnings", "Breaking news", "Market recap"].includes(r.kind) && typeof r.enabled === "boolean" && validPlatforms(r.platforms));
}
