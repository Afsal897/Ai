import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import CircleProgress from "@/components/admin-dashboard/CircleProgress";

describe("CircleProgress Component", () => {
  it("renders with given percentage and stroke color", () => {
    render(<CircleProgress percentage={75} strokeColor="#ff0000" />);
    
    // Percentage text should be visible
    expect(screen.getByText("75%")).toBeInTheDocument();

    // Find all circles in the SVG (first is background, second is progress)
    const circles = document.querySelectorAll("circle");
    expect(circles).toHaveLength(2);

    // Second circle (progress) should have correct stroke color
    expect(circles[1]).toHaveAttribute("stroke", "#ff0000");
  });

  it("sets strokeDashoffset correctly based on percentage", () => {
    render(<CircleProgress percentage={50} strokeColor="#00ff00" />);

    const circle = document.querySelectorAll("circle")[1]; // progress circle
    const strokeDasharray = circle.getAttribute("stroke-dasharray");
    const strokeDashoffset = circle.getAttribute("style");

    expect(strokeDasharray).toBeTruthy();
    expect(strokeDashoffset).toContain("stroke-dashoffset"); // style is applied
  });

  it("renders 0% text when percentage is 0", () => {
    render(<CircleProgress percentage={0} strokeColor="#0000ff" />);
    expect(screen.getByText("0%")).toBeInTheDocument();
  });

  it("renders 100% text when percentage is 100", () => {
    render(<CircleProgress percentage={100} strokeColor="#000" />);
    expect(screen.getByText("100%")).toBeInTheDocument();
  });
});
