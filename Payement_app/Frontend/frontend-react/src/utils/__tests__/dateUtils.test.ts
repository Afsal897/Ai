// dateUtils.test.ts
import { describe, it, expect } from "vitest";
import { convertToJapaneseDate, formatUTCToLocalDate } from "../dateUtils"; // adjust path

describe("convertToJapaneseDate", () => {
  it("should format date string into Japanese YYYY年MM月DD日", () => {
    const result = convertToJapaneseDate("2025-08-22T10:20:30Z");
    const d = new Date("2025-08-22T10:20:30Z");

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");

    expect(result).toBe(`${year}年${month}月${day}日 `);
  });
});

describe("formatUTCToLocalDate", () => {
  it("should return -- if date is missing", () => {
    expect(formatUTCToLocalDate(undefined)).toBe("--");
    expect(formatUTCToLocalDate("")).toBe("--");
  });

  it("should format date in English locale", () => {
    const d = new Date("2025-08-22T10:20:30Z");
    const result = formatUTCToLocalDate("2025-08-22T10:20:30Z", "en");

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const seconds = String(d.getSeconds()).padStart(2, "0");

    expect(result).toBe(`${year}-${month}-${day} ${hours}:${minutes}:${seconds}`);
  });

  it("should format date in Japanese locale", () => {
    const d = new Date("2025-08-22T10:20:30Z");
    const result = formatUTCToLocalDate("2025-08-22T10:20:30Z", "jp");

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const seconds = String(d.getSeconds()).padStart(2, "0");

    expect(result).toBe(`${year}年${month}月${day}日 ${hours}時${minutes}分${seconds}秒`);
  });

  it("should default to en format for unknown locale", () => {
    const d = new Date("2025-08-22T10:20:30Z");
    const result = formatUTCToLocalDate("2025-08-22T10:20:30Z", "fr");

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const seconds = String(d.getSeconds()).padStart(2, "0");

    expect(result).toBe(`${year}-${month}-${day} ${hours}:${minutes}:${seconds}`);
  });
});
