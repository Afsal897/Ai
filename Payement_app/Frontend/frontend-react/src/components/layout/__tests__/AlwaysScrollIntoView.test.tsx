// AlwaysScrollIntoView.test.tsx
import { render } from "@testing-library/react";
import { describe, it, vi, expect, beforeEach } from "vitest";
import AlwaysScrollIntoView from "../AlwaysScrollIntoView";

describe("AlwaysScrollIntoView", () => {
  beforeEach(() => {
    // mock scrollIntoView
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("renders the div", () => {
    const { container } = render(<AlwaysScrollIntoView />);
    const div = container.querySelector("div");
    expect(div).toBeInTheDocument();
  });

  it("calls scrollIntoView on mount", () => {
    render(<AlwaysScrollIntoView />);
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
    });
  });
});
