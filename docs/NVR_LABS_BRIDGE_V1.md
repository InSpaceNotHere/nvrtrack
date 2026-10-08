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

The expected upstream file, `examples/nvrtrack/business-research-result-v1.json` from a separate NVR Labs repository, was not available to copy. No Labs source was imported. The owner-facing screen calls this a development fixture, not live research.

## Why transport waits

There is no HTTP call, Python process, tunnel, queue, or background worker. The next phase can add a `ResearchEngine` transport that returns this same contract. The screens should not need to change when that arrives.
