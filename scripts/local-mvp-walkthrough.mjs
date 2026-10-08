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

await page.goto(base + "/", { waitUntil: "networkidle" });
await page.getByRole("heading", { name: /needs your attention/i }).waitFor();
note("root opens today without login: " + page.url());
await page.getByRole("button", { name: "Continue" }).click();
await page.getByText("Most important").waitFor();
await page.getByRole("heading", { name: "Send outstanding quote" }).waitFor();
const pulse = page.locator("section").filter({ has: page.getByRole("heading", { name: "Business pulse" }) });
await pulse.getByText("1", { exact: true }).first().waitFor();
await page.screenshot({ path: `${out}/today-desktop.png` });
note("today hero is the overdue quote");

await page.getByRole("link", { name: "Work", exact: true }).click();
await page.getByRole("heading", { name: "Work", exact: true }).waitFor();
await page.getByRole("heading", { name: "Overdue" }).waitFor();
await page.getByText("Overdue by 2 days").waitFor();
await page.screenshot({ path: `${out}/work-desktop.png` });
note("work groups overdue in owner language");

await page.getByRole("link", { name: "Opportunities", exact: true }).click();
await page.getByText("Ready to review").waitFor();
await page.getByText("Estimated: 6 hrs/month").waitFor();
await page.getByRole("button", { name: /Lead intake/ }).click();
await page.getByText("The problem").waitFor();
await page.getByText("Estimated · about 6 hours a month").waitFor();
await page.screenshot({ path: `${out}/opportunities-desktop.png` });
note("opportunity review uses owner language");

await page.getByRole("button", { name: "More" }).click();
await page.getByRole("link", { name: "Activity", exact: true }).click();
await page.getByRole("heading", { name: "What happened" }).waitFor();
await page.getByRole("heading", { name: "Yesterday" }).waitFor();
await page.screenshot({ path: `${out}/activity-desktop.png` });

await page.getByRole("button", { name: "More" }).click();
await page.getByRole("link", { name: "Account", exact: true }).click();
await page.getByText("This preview saves data on this device.").waitFor();
await page.screenshot({ path: `${out}/account-desktop.png` });
note("more menu reaches activity and account");

await page.setViewportSize({ width: 390, height: 844 });
await page.getByRole("link", { name: "Today", exact: true }).locator("visible=true").click();
await page.getByRole("heading", { name: /needs your attention/i }).waitFor();
await page.getByRole("link", { name: "Work", exact: true }).locator("visible=true").waitFor();
await page.getByRole("button", { name: "More" }).waitFor();
await page.screenshot({ path: `${out}/today-mobile.png` });
note("mobile dock is Today, Work, Opportunities, More");

await page.setViewportSize({ width: 1600, height: 900 });
await page.screenshot({ path: `${out}/nvrtrack-poster.png` });

await page.setViewportSize({ width: 1440, height: 1000 });
await page.getByRole("button", { name: "Complete" }).first().click();
await page.getByRole("heading", { name: "Send outstanding quote" }).waitFor({ state: "detached" });
const after = page.locator("section").filter({ has: page.getByRole("heading", { name: "Business pulse" }) });
await after.getByText("0", { exact: true }).waitFor();
note("completing the quote clears it and updates the pulse");

await page.reload({ waitUntil: "networkidle" });
await page.getByText("Task completed").first().waitFor();
note("completion survived reload");

await page.getByRole("button", { name: "More" }).click();
await page.getByRole("link", { name: "Account", exact: true }).click();
await page.getByRole("button", { name: "Reset demo workspace" }).click();
await page.getByRole("button", { name: "Confirm reset" }).click();
await page.getByText("Demo workspace restored.").waitFor();
await page.getByRole("link", { name: "Work", exact: true }).click();
await page.getByText("Send outstanding quote").waitFor();
note("reset restored the quote");

const zoomed = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await zoomed.goto(base + "/today", { waitUntil: "networkidle" });
await zoomed.evaluate(() => {
  document.documentElement.style.zoom = "2";
});
await zoomed.getByRole("heading", { name: /needs your attention/i }).waitFor();
note("200% zoom still shows the Today statement");

const calm = await browser.newContext({ reducedMotion: "reduce" });
const calmPage = await calm.newPage({ viewport: { width: 1280, height: 800 } });
await calmPage.goto(base + "/today", { waitUntil: "networkidle" });
await calmPage.getByRole("heading", { name: /needs your attention/i }).waitFor();
note("reduced motion still renders Today");
await calm.close();

await browser.close();
note("walkthrough ok");
