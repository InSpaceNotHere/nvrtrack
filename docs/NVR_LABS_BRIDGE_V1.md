# NVR Labs bridge v1

NVRTRACK reads a versioned research result. It does not run NVR Labs.

## Contract

`schema_version`: `nvrtrack-research-result-v1`

Validation lives in `src/lib/command-center/research-contract.ts`. A result is rejected when the schema version is unknown, a status is not recognized, a finding points at missing evidence, evidence points at a missing source, a recommendation points at a missing finding, ids collide, a source URL is not `http` or `https`, or a timestamp is malformed. Research text is stored as data. Nothing in the file is executed.

## Local attachment

Research stays attached to an opportunity. It is not copied into the opportunity fields.

`BusinessRepository` methods:

- `getResearchForOpportunity`
- `attachResearchResult`
- `removeResearchResult`
- `markResearchReviewed`
- `adoptResearchRecommendation`

A second attachment is refused instead of replacing the first. Adopting a recommendation updates the opportunity’s next step only after confirmation and leaves the research result unchanged. Review does not approve the opportunity.

Workspace export includes `research`. An older export without that field still imports.

## Fixture

`src/lib/command-center/fixtures/juniper-lead-intake-research-v1.json`

Origin: synthetic development fixture written in this repository. It is attached to Juniper & Co. Events / Lead intake & reply drafting and marked `demo-fixture`.

The canonical producer files were checked again for this milestone and are still not readable from this environment:

- repository: `InSpaceNotHere/nvr-labs`
- branch: `feature/nvrtrack-business-research-v1`
- files: `examples/nvrtrack/business-research-result-v1.json` and `examples/nvrtrack/nvrtrack-research-result-v1.schema.json`

No Labs source was imported. The owner-facing screen calls this a development fixture, not live research. `nvr-labs-structured-context-v1` is not accepted as a research result.

Labs owns schema versioning. NVRTRACK should pin an exact producer commit when that repository is readable. A changed Labs schema needs an explicit compatibility review. Future schema versions are not accepted silently. The app does not fetch GitHub on its own.

## Why transport waits

There is no HTTP call, Python process, tunnel, queue, or background worker. The next phase can add a `ResearchEngine` transport that returns this same contract. The screens should not need to change when that arrives.

Bridge v1 does not collect telemetry and does not call external research catalogs.

## Future boundaries

NVR Labs remains the research and evidence system. NVRTRACK does not call Census, BLS, O*NET, or OpenAlex itself. Those sources, if used, stay behind NVR Labs and arrive only as a versioned research result.

NVRTRACK also does not take a raw research API of its own. External research keeps entering through the NVR Labs contract above.

## Future implementation monitoring

When shipped automations need monitoring, prefer OpenTelemetry semantic conventions, including the GenAI and agent conventions, over a private telemetry format.

The intended path is:

Implementation → OpenTelemetry spans, events, and metrics → a normalized implementation record → NVRTRACK → business-impact calculations.

NVRTRACK keeps the business outcome:

- response time
- tasks completed
- labor capacity
- conversions
- measured hours saved
- whether a result is estimated or measured

OpenTelemetry keeps the technical record:

- runs
- duration
- failures
- model and provider calls
- agent spans
- token usage when a system reports it

Langfuse core is a possible later source of LLM observability. It is not a dependency of NVRTRACK, and Bridge v1 does not install or call it.

None of this monitoring is built yet. Bridge v1 stops at the research-result contract and the owner-facing briefing.
