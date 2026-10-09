import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const base = "http://localhost:3000";
const out = "/opt/cursor/artifacts";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

function note(message) {
  console.log(message);
}

async function settle() {
  await page.locator(".nvr-page").first().waitFor();
  await page.waitForFunction(() => {
    const node = document.querySelector(".nvr-page");
    return node ? Number(getComputedStyle(node).opacity) === 1 : false;
  });
}

await page.goto(`${base}/opportunities`, { waitUntil: "networkidle" });
await settle();
await page.getByRole("button", { name: /Proposal drafting assistant/ }).click();
await page.getByRole("button", { name: "Plan improvement" }).click();
await page.getByRole("button", { name: "Review plan" }).click();
await page.getByRole("button", { name: "Confirm draft plan" }).click();
await page.getByText("Status: Planning").waitFor();
await page.getByText("This is a draft. It is not approved to build or launch.").waitFor();
await page.getByText("Next step: Confirm the current workflow").waitFor();
note("draft plan created without approval");

await page.goto(`${base}/today`, { waitUntil: "networkidle" });
await settle();
await page.getByText("Implementation waiting for approval").waitFor();
await page.screenshot({ path: `${out}/today-plan-approval.png` });
note("today shows approval as an attention item");

await page.goto(`${base}/opportunities?focus=opp-proposal-assistant`, { waitUntil: "networkidle" });
await settle();
await page.getByRole("button", { name: "Approve plan" }).click();
await page.getByText("Status: Approved").waitFor();
await page.getByRole("button", { name: "Building" }).click();
await page.getByText("Status: Building").waitFor();
await page.getByRole("button", { name: "Testing" }).click();
await page.getByText("Status: Testing").waitFor();
await page.getByRole("button", { name: "Pause" }).click();
await page.getByText("Status: Paused").waitFor();
await page.getByRole("button", { name: "Resume" }).click();
await page.getByText("Status: Testing").waitFor();
note("approved, moved to testing, paused, and resumed");

await page.goto(`${base}/results`, { waitUntil: "networkidle" });
await settle();
await page.getByText("Baseline not established yet.").waitFor();
await page.getByRole("button", { name: "Create measurement" }).click();
await page.getByLabel("Value").fill("8");
await page.getByLabel("Period").fill("October");
await page.getByRole("button", { name: "Save measurement" }).click();
await page.getByText("Collecting results.").waitFor();
await page.getByLabel("Measurement role").selectOption("follow_up");
await page.getByLabel("Evidence type").selectOption("estimated");
await page.getByLabel("Value").fill("5");
await page.getByRole("button", { name: "Save measurement" }).click();
await page.getByText("Observed change is only shown when both numbers are measured.").waitFor();
note("an estimate does not become an observed change");

await page.goto(`${base}/activity`, { waitUntil: "networkidle" });
await settle();
await page.getByText("Implementation planned").waitFor();
await page.getByText("Implementation approved").waitFor();
await page.getByText("Baseline recorded").waitFor();
await page.screenshot({ path: `${out}/activity-improvement.png` });
note("activity records the loop");

await page.reload({ waitUntil: "networkidle" });
await page.getByText("Implementation approved").waitFor();
note("persisted after reload");

await page.setViewportSize({ width: 390, height: 844 });
await page.goto(`${base}/results`, { waitUntil: "networkidle" });
await settle();
await page.getByText("Did the change actually help?").waitFor();
await page.screenshot({ path: `${out}/results-mobile.png` });

await page.setViewportSize({ width: 1440, height: 1000 });
await page.goto(`${base}/today`, { waitUntil: "networkidle" });
await page.evaluate(() => {
  document.documentElement.style.zoom = "2";
});
await page.getByRole("heading", { name: /needs your attention/i }).waitFor();
note("200% zoom still shows Today");

const calm = await browser.newContext({ reducedMotion: "reduce" });
const calmPage = await calm.newPage();
await calmPage.goto(`${base}/today`, { waitUntil: "networkidle" });
await calmPage.getByRole("heading", { name: /needs your attention/i }).waitFor();
await calm.close();
note("reduced motion still renders Today");

await page.goto(`${base}/account`, { waitUntil: "networkidle" });
await page.evaluate(() => {
  document.documentElement.style.zoom = "1";
});
await page.getByRole("button", { name: "Reset demo workspace" }).click();
await page.getByRole("button", { name: "Confirm reset" }).click();
await page.getByText("Demo workspace restored.").waitFor();
await page.goto(`${base}/opportunities?focus=opp-proposal-assistant`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: "Plan improvement" }).waitFor();
note("reset removed the draft plan");

await browser.close();
note("walkthrough ok");
