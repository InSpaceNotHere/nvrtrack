"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  campaignInputSchema,
  EMPTY_INPUT,
  formatPack,
  type CampaignInput,
  type ContentPack,
} from "@/lib/content";
import { SAMPLES } from "@/lib/samples";

type Tab = "social" | "email" | "video";
type ResultSource = "sample" | "live";
const SAMPLE_LABELS = ["Handyman", "Event services", "Fitness coach"] as const;

const fieldLimits: Record<keyof CampaignInput, number | undefined> = {
  businessName: 120,
  businessFacts: 4000,
  targetAudience: 1000,
  topic: 1200,
  tone: undefined,
  nextAction: 500,
  avoid: 1000,
};

function sameInput(a: CampaignInput, b: CampaignInput | null) {
  return b !== null && JSON.stringify(a) === JSON.stringify(b);
}

export default function Home() {
  const [input, setInput] = useState<CampaignInput>(EMPTY_INPUT);
  const [pack, setPack] = useState<ContentPack | null>(null);
  const [snapshot, setSnapshot] = useState<CampaignInput | null>(null);
  const [source, setSource] = useState<ResultSource | null>(null);
  const [selectedSampleId, setSelectedSampleId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("social");
  const [loading, setLoading] = useState(false);
  const [edited, setEdited] = useState(false);
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<string[]>([]);
  const requestId = useRef(0);
  const inputRef = useRef(input);

  useEffect(() => {
    inputRef.current = input;
  }, [input]);

  const stale = pack !== null && !sameInput(input, snapshot);
  const totalCharacters = useMemo(
    () => Object.values(input).join("").length,
    [input],
  );

  function updateInput<K extends keyof CampaignInput>(
    key: K,
    value: CampaignInput[K],
  ) {
    setInput((current) => ({ ...current, [key]: value }));
    setSelectedSampleId(null);
    setFieldErrors([]);
    setMessage("");
  }

  function invalidatePending() {
    requestId.current += 1;
    setLoading(false);
  }

  function loadSample(index: number) {
    invalidatePending();
    const sample = SAMPLES[index];
    setInput({ ...sample.input });
    setPack(structuredClone(sample.pack));
    setSnapshot({ ...sample.input });
    setSource("sample");
    setSelectedSampleId(sample.id);
    setEdited(false);
    setFieldErrors([]);
    setMessage("");
    setTab("social");
  }

  function reset() {
    invalidatePending();
    setInput(EMPTY_INPUT);
    setPack(null);
    setSnapshot(null);
    setSource(null);
    setSelectedSampleId(null);
    setEdited(false);
    setFieldErrors([]);
    setMessage("Workbench reset.");
    setTab("social");
  }

  async function generate() {
    if (loading) return;
    const parsed = campaignInputSchema.safeParse(input);
    if (!parsed.success) {
      setFieldErrors(parsed.error.issues.map((issue) => issue.message));
      setMessage("Please correct the highlighted form issues.");
      return;
    }
    if (
      pack &&
      edited &&
      !window.confirm("Generate new content and replace your edited drafts?")
    ) {
      return;
    }

    const submitted = { ...parsed.data };
    const id = ++requestId.current;
    setLoading(true);
    setFieldErrors([]);
    setMessage("");

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(submitted),
      });
      const data = (await response.json()) as {
        pack?: ContentPack;
        error?: string;
        issues?: string[];
      };
      if (id !== requestId.current || !sameInput(inputRef.current, submitted)) {
        return;
      }
      if (!response.ok || !data.pack) {
        setFieldErrors(data.issues ?? []);
        setMessage(
          data.error ||
            "New generation failed. Your inputs and existing drafts were retained.",
        );
        return;
      }
      setPack(data.pack);
      setSnapshot(submitted);
      setSource("live");
      setSelectedSampleId(null);
      setEdited(false);
      setMessage("Live content pack generated from the submitted snapshot.");
      setTab("social");
    } catch {
      if (id === requestId.current) {
        setMessage(
          "New generation failed. Your inputs and existing drafts were retained.",
        );
      }
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }

  function updatePack(next: ContentPack) {
    setPack(next);
    setEdited(true);
    setMessage("");
  }

  async function copyText(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setMessage(`${label} copied.`);
    } catch {
      setMessage("Copy failed. Select the draft text and copy it manually.");
    }
  }

  function downloadAll() {
    if (!pack) return;
    const url = URL.createObjectURL(
      new Blob([formatPack(pack)], { type: "text/plain;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "nvr-content-pack.txt";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    setMessage("Content pack downloaded.");
  }

  return (
    <main>
      <header className="site-header">
        <div className="shell header-inner">
          <div className="brand" aria-label="NVR Content">
            <img
              className="brand-logo"
              src="/nvr-shared-logo.png"
              width="84"
              height="30"
              alt="NVR"
            />
            <span className="brand-divider" aria-hidden="true" />
            <span className="brand-product">NVR Content</span>
          </div>
          <div className="demo-badge">
            <span aria-hidden="true">◆</span>
            Sample demo · Prepared data
          </div>
        </div>
      </header>

      <div className="shell">
        <section className="intro" aria-labelledby="page-title">
          <div className="intro-copy">
            <h1 id="page-title">Turn your business ideas into content.</h1>
            <p>Choose an example. Review the drafts. Edit and copy.</p>
          </div>
        </section>

        <section className="sample-card" aria-labelledby="samples-title">
          <div>
            <span className="sample-kicker">Prepared examples</span>
            <h2 id="samples-title">Choose a fictional sample</h2>
            <p>Prepared examples are ready to review.</p>
          </div>
          <div className="sample-actions">
            {SAMPLES.map((sample, index) => (
              <button
                className={`button secondary preset-button ${
                  selectedSampleId === sample.id ? "selected" : ""
                }`}
                type="button"
                key={sample.id}
                aria-pressed={selectedSampleId === sample.id}
                onClick={() => loadSample(index)}
              >
                {SAMPLE_LABELS[index]}
              </button>
            ))}
          </div>
        </section>

        <div className="workspace">
          <form
            className="card form-card"
            onSubmit={(event) => {
              event.preventDefault();
              void generate();
            }}
          >
            <div className="section-heading">
              <div className="heading-with-icon">
                <span className="section-icon" aria-hidden="true">▤</span>
                <div>
                <h2>Business details</h2>
                <p>Use only information you approve for draft content.</p>
                </div>
              </div>
              <button className="text-button" type="button" onClick={reset}>
                Reset
              </button>
            </div>

            <label>
              <span className="label-title">
                Business name <strong className="required-indicator">Required</strong>
              </span>
              <input
                required
                maxLength={fieldLimits.businessName}
                value={input.businessName}
                onChange={(event) =>
                  updateInput("businessName", event.target.value)
                }
              />
            </label>
            <label>
              <span className="label-title">
                Business facts <strong className="required-indicator">Required</strong>
              </span>
              <span className="hint">
                Services, location, and other approved information
              </span>
              <textarea
                required
                rows={6}
                maxLength={fieldLimits.businessFacts}
                value={input.businessFacts}
                onChange={(event) =>
                  updateInput("businessFacts", event.target.value)
                }
              />
            </label>
            <label>
              <span className="label-title">
                Target audience <strong className="required-indicator">Required</strong>
              </span>
              <input
                required
                maxLength={fieldLimits.targetAudience}
                value={input.targetAudience}
                onChange={(event) =>
                  updateInput("targetAudience", event.target.value)
                }
              />
            </label>

            <div className="campaign-title">
              <span className="section-icon" aria-hidden="true">↗</span>
              <div>
                <h2>This campaign</h2>
                <p>Tell us what you want to promote.</p>
              </div>
            </div>
            <label>
              <span className="label-title">
                Topic or offer to promote
                <strong className="required-indicator">Required</strong>
              </span>
              <textarea
                required
                rows={3}
                maxLength={fieldLimits.topic}
                value={input.topic}
                onChange={(event) => updateInput("topic", event.target.value)}
              />
            </label>
            <div className="campaign-row">
              <label>
                Tone
                <select
                  value={input.tone}
                  onChange={(event) =>
                    updateInput("tone", event.target.value as CampaignInput["tone"])
                  }
                >
                  <option>Friendly</option>
                  <option>Professional</option>
                  <option>Direct</option>
                </select>
              </label>
              <label>
                <span className="label-title">
                  Desired next action <span className="optional">Optional</span>
                </span>
                <span className="hint">For example, “Request a quote.”</span>
                <input
                  maxLength={fieldLimits.nextAction}
                  value={input.nextAction}
                  onChange={(event) =>
                    updateInput("nextAction", event.target.value)
                  }
                />
              </label>
            </div>
            <label>
              <span className="label-title">
                Things to avoid <span className="optional">Optional</span>
              </span>
              <span className="hint">For example, “Do not mention discounts.”</span>
              <textarea
                rows={3}
                maxLength={fieldLimits.avoid}
                value={input.avoid}
                onChange={(event) => updateInput("avoid", event.target.value)}
              />
            </label>

            <div className="form-meta">
              <span>{totalCharacters.toLocaleString()} / 8,000 characters</span>
            </div>
            {fieldErrors.length > 0 && (
              <div className="error-list" role="alert">
                <strong>Please fix:</strong>
                <ul>
                  {fieldErrors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
            <button className="button primary full" type="submit" disabled={loading}>
              {loading ? "Generating…" : "Generate content"}
            </button>
            <p className="privacy-note">
              Live AI is not connected in this sample. If configured, submitted
              fields are sent to OpenAI.
            </p>
          </form>

          <section className="card output-card" aria-labelledby="drafts-title">
            <div className="section-heading output-heading">
              <div className="heading-with-icon">
                <span className="section-icon" aria-hidden="true">▤</span>
                <div>
                  <h2 id="drafts-title">Your content drafts</h2>
                  <p>
                    {source === "sample"
                      ? "Prepared sample · Review and edit below."
                      : source === "live"
                        ? "Live AI draft · Review and edit below."
                        : "Review, edit, and export your content here."}
                  </p>
                </div>
              </div>
              {pack && (
                <span className={`status-badge ${stale ? "stale" : ""}`}>
                  {stale ? "Inputs changed · drafts stale" : "Matches inputs"}
                </span>
              )}
            </div>

            {message && (
              <div
                className={`message ${
                  /failed|not configured|correct|too many|timed out/i.test(message)
                    ? "warning"
                    : ""
                }`}
                role="status"
              >
                {message}
              </div>
            )}

            {!pack ? (
              <div className="empty-state">
                <div className="empty-icon" aria-hidden="true">
                  ✦
                </div>
                <h3>Start with your details or a Sample Demo</h3>
                <p>Choose a prepared example or add your own details to begin.</p>
              </div>
            ) : (
              <>
                <div className="result-toolbar">
                  <div className="tabs" role="tablist" aria-label="Content type">
                    {(
                      [
                        ["social", "Social Posts"],
                        ["email", "Email"],
                        ["video", "Video Script"],
                      ] as const
                    ).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        role="tab"
                        aria-selected={tab === value}
                        onClick={() => setTab(value)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="export-actions">
                    <button
                      className="button secondary compact"
                      type="button"
                      onClick={() => void copyText(formatPack(pack), "All content")}
                    >
                      Copy all
                    </button>
                    <button
                      className="button secondary compact"
                      type="button"
                      onClick={downloadAll}
                    >
                      Download all
                    </button>
                  </div>
                </div>

                {tab === "social" && (
                  <div role="tabpanel" className="draft-list">
                    {pack.socialPosts.map((post, index) => (
                      <article className="draft" key={index}>
                        <div className="draft-heading">
                          <h3>
                            <span className="draft-number" aria-hidden="true">
                              {index + 1}
                            </span>
                            Social post {index + 1}
                          </h3>
                          <button
                            className="text-button"
                            type="button"
                            onClick={() =>
                              void copyText(post, `Social post ${index + 1}`)
                            }
                          >
                            Copy
                          </button>
                        </div>
                        <textarea
                          className="draft-textarea"
                          aria-label={`Social post ${index + 1}`}
                          rows={7}
                          value={post}
                          onChange={(event) => {
                            const socialPosts = [...pack.socialPosts];
                            socialPosts[index] = event.target.value;
                            updatePack({ ...pack, socialPosts });
                          }}
                        />
                      </article>
                    ))}
                  </div>
                )}

                {tab === "email" && (
                  <article role="tabpanel" className="draft">
                    <div className="draft-heading">
                      <h3>Promotional email</h3>
                      <button
                        className="text-button"
                        type="button"
                        onClick={() =>
                          void copyText(
                            `Subject: ${pack.email.subject}\n\n${pack.email.body}`,
                            "Email",
                          )
                        }
                      >
                        Copy
                      </button>
                    </div>
                    <label>
                      Subject
                      <input
                        value={pack.email.subject}
                        onChange={(event) =>
                          updatePack({
                            ...pack,
                            email: { ...pack.email, subject: event.target.value },
                          })
                        }
                      />
                    </label>
                    <label>
                      Body
                      <textarea
                        className="draft-textarea email-body"
                        rows={14}
                        value={pack.email.body}
                        onChange={(event) =>
                          updatePack({
                            ...pack,
                            email: { ...pack.email, body: event.target.value },
                          })
                        }
                      />
                    </label>
                  </article>
                )}

                {tab === "video" && (
                  <article role="tabpanel" className="draft">
                    <div className="draft-heading">
                      <h3>Short video script</h3>
                      <button
                        className="text-button"
                        type="button"
                        onClick={() =>
                          void copyText(pack.videoScript, "Video script")
                        }
                      >
                        Copy
                      </button>
                    </div>
                    <textarea
                      className="draft-textarea video-body"
                      aria-label="Video script"
                      rows={12}
                      value={pack.videoScript}
                      onChange={(event) =>
                        updatePack({ ...pack, videoScript: event.target.value })
                      }
                    />
                  </article>
                )}

                {pack.detailsToConfirm.length > 0 && (
                  <aside className="confirm-details">
                    <h3>Important details to confirm</h3>
                    <ul>
                      {pack.detailsToConfirm.map((detail) => (
                        <li key={detail}>{detail}</li>
                      ))}
                    </ul>
                  </aside>
                )}
              </>
            )}

            <div className="persistent-review" role="note">
              <span className="review-icon" aria-hidden="true">i</span>
              <span>
                <strong>Review before sharing.</strong> Check every claim, link,
                and call to action before using a draft.
              </span>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
