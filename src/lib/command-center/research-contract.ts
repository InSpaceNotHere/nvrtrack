export const RESEARCH_SCHEMA_VERSION = "nvrtrack-research-result-v1" as const;

export type ResearchRunStatus = "complete" | "partial" | "failed";
export type FindingStatus = "supported" | "uncertain" | "contradicted";
export type RecommendationState = "supported" | "preliminary" | "withheld";

export interface ResearchSource {
  id: string;
  title: string;
  publisher: string;
  url: string;
}

export interface ResearchEvidence {
  id: string;
  source_id: string;
  excerpt: string;
  retrieved_at: string | null;
}

export interface ResearchFinding {
  id: string;
  text: string;
  status: FindingStatus;
  reason: string;
  evidence_ids: string[];
}

export interface ResearchRecommendation {
  id: string;
  text: string;
  state: RecommendationState;
  finding_ids: string[];
}

export interface ResearchGap {
  id: string;
  text: string;
}

export interface ResearchResult {
  schema_version: typeof RESEARCH_SCHEMA_VERSION;
  request_id: string;
  run_id: string;
  status: ResearchRunStatus;
  topic: string;
  business_context: {
    business_name: string;
    opportunity_title: string;
  };
  completed_at: string;
  summary: string;
  findings: ResearchFinding[];
  recommendations: ResearchRecommendation[];
  sources: ResearchSource[];
  evidence: ResearchEvidence[];
  evidence_gaps: ResearchGap[];
  limitations: string[];
  provider_summary: {
    note: string;
  };
}

export type ResearchParseResult =
  | { ok: true; result: ResearchResult }
  | { ok: false; error: string };

const RUN_STATUSES = new Set<ResearchRunStatus>(["complete", "partial", "failed"]);
const FINDING_STATUSES = new Set<FindingStatus>(["supported", "uncertain", "contradicted"]);
const RECOMMENDATION_STATES = new Set<RecommendationState>(["supported", "preliminary", "withheld"]);

export function parseResearchResult(value: unknown, now: Date = new Date()): ResearchParseResult {
  if (!isRecord(value)) return fail("Research result must be an object.");
  if (value.schema_version !== RESEARCH_SCHEMA_VERSION) {
    return fail("Unsupported research schema version.");
  }
  if (!RUN_STATUSES.has(value.status as ResearchRunStatus)) return fail("Research status is not recognized.");
  if (!isId(value.request_id) || !isId(value.run_id)) return fail("Research request and run ids are required.");
  if (!isText(value.topic) || !isText(value.summary)) return fail("Research topic and summary are required.");
  if (!isRecord(value.business_context)) return fail("Business context is required.");
  if (!isText(value.business_context.business_name) || !isText(value.business_context.opportunity_title)) {
    return fail("Business context must name the business and opportunity.");
  }
  if (!isTimestamp(value.completed_at, now)) return fail("Research completion time is not a valid timestamp.");
  if (!isRecord(value.provider_summary) || !isText(value.provider_summary.note)) {
    return fail("Provider summary must stay plain text.");
  }

  const sources = parseList(value.sources, parseSource);
  const evidence = parseList(value.evidence, (item) => parseEvidence(item, now));
  const findings = parseList(value.findings, parseFinding);
  const recommendations = parseList(value.recommendations, parseRecommendation);
  const gaps = parseList(value.evidence_gaps, parseGap);
  const limitations = parseStringList(value.limitations);
  if (!sources || !evidence || !findings || !recommendations || !gaps || !limitations) {
    return fail("Research lists are incomplete or malformed.");
  }

  const ids = [...sources, ...evidence, ...findings, ...recommendations, ...gaps].map((item) => item.id);
  if (new Set(ids).size !== ids.length) return fail("Research ids must be unique.");

  const sourceIds = new Set(sources.map((item) => item.id));
  const evidenceIds = new Set(evidence.map((item) => item.id));
  const findingIds = new Set(findings.map((item) => item.id));

  if (evidence.some((item) => !sourceIds.has(item.source_id))) {
    return fail("Evidence references a missing source.");
  }
  if (findings.some((item) => item.evidence_ids.some((id) => !evidenceIds.has(id)))) {
    return fail("A finding references missing evidence.");
  }
  if (findings.some((item) => item.status === "supported" && item.evidence_ids.length === 0)) {
    return fail("A supported finding needs evidence.");
  }
  if (recommendations.some((item) => item.finding_ids.some((id) => !findingIds.has(id)))) {
    return fail("A recommendation references a missing finding.");
  }

  return {
    ok: true,
    result: {
      schema_version: RESEARCH_SCHEMA_VERSION,
      request_id: value.request_id,
      run_id: value.run_id,
      status: value.status as ResearchRunStatus,
      topic: value.topic.trim(),
      business_context: {
        business_name: value.business_context.business_name.trim(),
        opportunity_title: value.business_context.opportunity_title.trim(),
      },
      completed_at: value.completed_at,
      summary: value.summary.trim(),
      findings,
      recommendations,
      sources,
      evidence,
      evidence_gaps: gaps,
      limitations,
      provider_summary: { note: value.provider_summary.note.trim() },
    },
  };
}

export function researchCounts(result: ResearchResult): {
  sources: number;
  supportedFindings: number;
  evidenceGaps: number;
} {
  return {
    sources: result.sources.length,
    supportedFindings: result.findings.filter((item) => item.status === "supported").length,
    evidenceGaps: result.evidence_gaps.length,
  };
}

function parseSource(value: unknown): ResearchSource | null {
  if (!isRecord(value) || !isId(value.id) || !isText(value.title) || !isText(value.publisher)) return null;
  if (!isHttpUrl(value.url)) return null;
  return { id: value.id, title: value.title.trim(), publisher: value.publisher.trim(), url: value.url };
}

function parseEvidence(value: unknown, now: Date): ResearchEvidence | null {
  if (!isRecord(value) || !isId(value.id) || !isId(value.source_id) || !isText(value.excerpt)) return null;
  if (value.retrieved_at !== null && value.retrieved_at !== undefined && !isTimestamp(value.retrieved_at, now)) return null;
  return {
    id: value.id,
    source_id: value.source_id,
    excerpt: value.excerpt.trim(),
    retrieved_at: typeof value.retrieved_at === "string" ? value.retrieved_at : null,
  };
}

function parseFinding(value: unknown): ResearchFinding | null {
  if (!isRecord(value) || !isId(value.id) || !isText(value.text) || !isText(value.reason)) return null;
  if (!FINDING_STATUSES.has(value.status as FindingStatus) || !Array.isArray(value.evidence_ids)) return null;
  if (!value.evidence_ids.every((id) => typeof id === "string" && id.length > 0)) return null;
  return {
    id: value.id,
    text: value.text.trim(),
    status: value.status as FindingStatus,
    reason: value.reason.trim(),
    evidence_ids: value.evidence_ids,
  };
}

function parseRecommendation(value: unknown): ResearchRecommendation | null {
  if (!isRecord(value) || !isId(value.id) || !isText(value.text)) return null;
  if (!RECOMMENDATION_STATES.has(value.state as RecommendationState) || !Array.isArray(value.finding_ids)) return null;
  if (value.finding_ids.length === 0 || !value.finding_ids.every((id) => typeof id === "string")) return null;
  return {
    id: value.id,
    text: value.text.trim(),
    state: value.state as RecommendationState,
    finding_ids: value.finding_ids,
  };
}

function parseGap(value: unknown): ResearchGap | null {
  if (!isRecord(value) || !isId(value.id) || !isText(value.text)) return null;
  return { id: value.id, text: value.text.trim() };
}

function parseList<T>(value: unknown, parse: (item: unknown) => T | null): T[] | null {
  if (!Array.isArray(value)) return null;
  const items = value.map(parse);
  if (items.some((item) => item === null)) return null;
  return items as T[];
}

function parseStringList(value: unknown): string[] | null {
  if (!Array.isArray(value) || !value.every((item) => isText(item))) return null;
  return value.map((item) => item.trim());
}

function isHttpUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function isTimestamp(value: unknown, now: Date): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)) return false;
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return false;
  const latest = now.getTime() + 24 * 60 * 60 * 1000;
  return time >= Date.parse("2000-01-01T00:00:00.000Z") && time <= latest;
}

function isId(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value === value.trim();
}

function isText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function fail(error: string): ResearchParseResult {
  return { ok: false, error };
}
