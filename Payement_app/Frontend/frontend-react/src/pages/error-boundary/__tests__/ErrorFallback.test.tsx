import { render } from "@testing-library/react";
import { describe, it } from "vitest";
import ErrorFallback from "../ErrorFallback";

describe("ErrorFallback page", () => {
  it("renders the ErrorFallback page", () => {
    render(<ErrorFallback />);
  });
});
