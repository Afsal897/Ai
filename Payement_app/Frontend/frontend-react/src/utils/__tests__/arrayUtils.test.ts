import { describe, it, expect } from "vitest";
import { filterNonEmptyValues } from "../arrayUtils";

type TestItem = {
  value?: string | null;
};

describe("filterNonEmptyValues", () => {
  it("removes items with empty strings", () => {
    const input: TestItem[] = [
      { value: "abc" },
      { value: "" },
      { value: "   " },
      { value: "def" },
    ];
    const result = filterNonEmptyValues(input, "value");
    expect(result).toEqual([{ value: "abc" }, { value: "def" }]);
  });

  it("removes items with undefined or null values", () => {
    const input: TestItem[] = [
      { value: "abc" },
      { value: undefined },
      { value: null },
      { value: "xyz" },
    ];
    const result = filterNonEmptyValues(input, "value");
    expect(result).toEqual([{ value: "abc" }, { value: "xyz" }]);
  });

  it("removes duplicates after trimming", () => {
    const input: TestItem[] = [
      { value: "abc" },
      { value: " abc " },
      { value: "ABC" },
      { value: "abc" },
    ];
    const result = filterNonEmptyValues(input, "value");
    expect(result).toEqual([{ value: "abc" }, { value: "ABC" }]);
  });

  it("returns empty array when all values are invalid", () => {
    const input: TestItem[] = [
      { value: "" },
      { value: " " },
      { value: undefined },
      { value: null },
    ];
    const result = filterNonEmptyValues(input, "value");
    expect(result).toEqual([]);
  });
});
