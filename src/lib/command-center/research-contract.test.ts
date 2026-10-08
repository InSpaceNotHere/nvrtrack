import { describe, expect, it } from "vitest";

import leadIntakeResearch from "./fixtures/juniper-lead-intake-research-v1.json";
import { parseResearchResult, researchCounts } from "./research-contract";

const now = new Date("2026-10-08T15:00:00.000Z");

function validResult(): Record<string, unknown> {
  return structuredClone(leadIntakeResearch) as Record<string, unknown>;
}

describe("nvrtrack research result contract", () => {
  it("accepts the Juniper development fixture", () => {
    const parsed = parseResearchResult(leadIntakeResearch, now);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(researchCounts(parsed.result)).toEqual({ sources: 5, supportedFindings: 3, evidenceGaps: 2 });
  });

  it("rejects an unknown schema version", () => {
    const value = validResult();
    value.schema_version = "nvrtrack-research-result-v0";
    expect(parseResearchResult(value, now)).toEqual({ ok: false, error: "Unsupported research schema version." });
  });

  it("rejects a finding that points at missing evidence", () => {
    const value = validResult();
    const findings = value.findings as Array<Record<string, unknown>>;
    findings[0].evidence_ids = ["missing-evidence"];
    expect(parseResearchResult(value, now).ok).toBe(false);
  });

  it("rejects evidence that points at a missing source", () => {
    const value = validResult();
    const evidence = value.evidence as Array<Record<string, unknown>>;
    evidence[0].source_id = "missing-source";
    expect(parseResearchResult(value, now).ok).toBe(false);
  });

  it("rejects a recommendation that points at a missing finding", () => {
    const value = validResult();
    const recommendations = value.recommendations as Array<Record<string, unknown>>;
    recommendations[0].finding_ids = ["missing-finding"];
    expect(parseResearchResult(value, now).ok).toBe(false);
  });

  it("rejects duplicate ids and unsafe source urls", () => {
    const duplicate = validResult();
    const findings = duplicate.findings as Array<Record<string, unknown>>;
    findings[1].id = findings[0].id;
    expect(parseResearchResult(duplicate, now).ok).toBe(false);

    const unsafe = validResult();
    const sources = unsafe.sources as Array<Record<string, unknown>>;
    sources[0].url = "javascript:alert(1)";
    expect(parseResearchResult(unsafe, now).ok).toBe(false);
  });

  it("rejects a malformed completion timestamp", () => {
    const value = validResult();
    value.completed_at = "tomorrow";
    expect(parseResearchResult(value, now).ok).toBe(false);
  });
});
