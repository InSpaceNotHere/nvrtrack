import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const base = "http://localhost:3000";
const out = "/opt/cursor/artifacts";
await mkdir(out, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const log = [];

function note(message) {
  log.push(message);
  console.log(message);
}

await page.goto(base + "/", { waitUntil: "networkidle" });
await page.getByRole("heading", { name: "What needs my attention?" }).waitFor();
note("root opens today without login: " + page.url());
await page.getByRole("button", { name: "Continue" }).click();
await page.getByText("Send outstanding quote").first().waitFor();
await page.screenshot({ path: `${out}/today-desktop.png`, fullPage: true });

await page.getByRole("link", { name: "Tasks", exact: true }).click();
await page.getByRole("heading", { name: "Tasks", exact: true }).waitFor();
await page.getByRole("button", { name: "New task" }).click();
await page.getByLabel("Title").fill("Confirm florist delivery");
await page.getByRole("button", { name: "Save task" }).click();
await page.getByText("Confirm florist delivery").waitFor();
note("created task");

await page.getByRole("button", { name: /Confirm florist delivery/ }).click();
await page.getByLabel("Status").selectOption("completed");
await page.getByRole("button", { name: "Save task" }).click();
await page.getByText("completed ·").first().waitFor();
note("completed task");

await page.getByRole("link", { name: "Today", exact: true }).click();
await page.getByRole("heading", { name: "What needs my attention?" }).waitFor();
const attention = await page.locator("#attention-heading").locator("xpath=following-sibling::ul").innerText();
if (attention.includes("Confirm florist delivery")) {
  throw new Error("Completed medium task should not stay in attention");
}
if (!attention.includes("Send outstanding quote")) {
  throw new Error("Seed overdue quote missing from attention");
}
note("today attention still shows overdue quote and not the completed florist task");

await page.getByRole("link", { name: "Opportunities", exact: true }).click();
await page.getByRole("button", { name: "New opportunity" }).click();
await page.getByLabel("Title").fill("Venue checklist");
await page.getByLabel("Status").selectOption("approved");
await page.getByLabel("Problem").fill("Checklists are rebuilt for every venue.");
await page.getByRole("button", { name: "Save opportunity" }).click();
await page.getByText("Venue checklist").waitFor();
note("created approved opportunity");

await page.getByRole("link", { name: "Activity", exact: true }).click();
await page.getByText("Opportunity approved").first().waitFor();
await page.getByText("Task completed").first().waitFor();
await page.screenshot({ path: `${out}/activity-desktop.png`, fullPage: true });
note("activity shows task completion and opportunity approval");

await page.reload({ waitUntil: "networkidle" });
await page.getByText("Task completed").first().waitFor();
await page.getByText("Confirm florist delivery").first().waitFor();
note("activity survived reload");

await page.getByRole("link", { name: "Tasks", exact: true }).click();
await page.getByText("completed · medium").first().waitFor();
await page.screenshot({ path: `${out}/tasks-desktop.png`, fullPage: true });

await page.getByRole("link", { name: "Opportunities", exact: true }).click();
await page.getByText("Venue checklist").waitFor();
await page.screenshot({ path: `${out}/opportunities-desktop.png`, fullPage: true });

await page.setViewportSize({ width: 390, height: 844 });
await page.getByRole("link", { name: "Today", exact: true }).click();
await page.getByRole("heading", { name: "What needs my attention?" }).waitFor();
await page.screenshot({ path: `${out}/today-mobile.png`, fullPage: true });
note("mobile today captured");

await page.setViewportSize({ width: 1280, height: 900 });
await page.getByRole("link", { name: "Account", exact: true }).click();
await page.getByRole("button", { name: "Reset demo workspace" }).click();
await page.getByRole("button", { name: "Confirm reset" }).click();
await page.getByText("Demo workspace restored.").waitFor();
await page.getByRole("link", { name: "Tasks", exact: true }).click();
await page.getByText("Confirm florist delivery").waitFor({ state: "detached" });
await page.getByText("Send outstanding quote").waitFor();
note("reset restored seed and removed the created task");

await browser.close();
note("walkthrough ok");
