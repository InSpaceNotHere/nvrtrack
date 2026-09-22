import { describe, expect, it } from "vitest";

import { addFoodHref, customFoodCreateHref, customFoodEditHref, parseMealDateParams } from "./custom-food-routes";

describe("custom food routes", () => {
  it("builds create and edit hrefs without catalog metadata", () => {
    expect(customFoodCreateHref()).toBe("/nutrition/foods/new");
    expect(customFoodCreateHref({ meal: "breakfast", date: "2031-06-01" })).toBe(
      "/nutrition/foods/new?meal=breakfast&date=2031-06-01",
    );
    expect(customFoodEditHref("food-1", { meal: "lunch", date: "2031-06-02" })).toBe(
      "/nutrition/foods/food-1/edit?meal=lunch&date=2031-06-02",
    );
  });

  it("returns to Add Food with the saved food selected after create", () => {
    expect(addFoodHref({ meal: "breakfast", date: "2031-06-01", saved: "abc" })).toBe(
      "/nutrition/add?meal=breakfast&date=2031-06-01&saved=abc",
    );
  });

  it("parses meal and date params", () => {
    expect(parseMealDateParams({ meal: "dinner", date: ["2031-06-03"] })).toEqual({
      meal: "dinner",
      date: "2031-06-03",
    });
  });
});
