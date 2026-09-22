import { expect, type Page } from "@playwright/test";

export interface CustomFoodValues {
  name: string;
  brand?: string;
  servingSize?: string;
  servingUnit?: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
}

export async function openCreateCustomFood(page: Page) {
  await page.getByRole("tab", { name: "Custom" }).click();
  await page.getByRole("link", { name: "Create Custom Food" }).click();
  await expect(page.getByRole("heading", { name: "Create Custom Food" })).toBeVisible();
}

export async function fillCustomFoodForm(page: Page, values: CustomFoodValues) {
  await page.getByLabel("Name").fill(values.name);
  if (values.brand !== undefined) {
    await page.getByLabel("Brand").fill(values.brand);
  }
  await page.getByLabel("Serving amount").fill(values.servingSize ?? "1");
  await page.getByLabel("Serving unit").fill(values.servingUnit ?? "serving");
  await page.getByLabel("Calories").fill(values.calories);
  await page.getByLabel("Protein").fill(values.protein);
  await page.getByLabel("Carbs").fill(values.carbs);
  await page.getByLabel("Fat").fill(values.fat);
}

export async function createCustomFoodFromAdd(page: Page, values: CustomFoodValues) {
  await openCreateCustomFood(page);
  await fillCustomFoodForm(page, values);
  await page.getByRole("button", { name: "Save Food" }).click();
}

export async function createAndLogCustomFood(page: Page, values: CustomFoodValues, addLabel = "Add to Breakfast") {
  await createCustomFoodFromAdd(page, values);
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: addLabel }).click();
}
