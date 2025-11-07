// CustomPagination.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CustomPagination from "../CustomPagination";

describe("CustomPagination", () => {
  it("renders correct pages and disables navigation at first page", () => {
    const mockOnPageChange = vi.fn();

    render(<CustomPagination currentPage={1} pageCount={5} onPageChange={mockOnPageChange} />);

    // First & Prev should be disabled
    expect(screen.getByText("«").closest("li")).toHaveClass("disabled"); // First
    expect(screen.getByText("‹").closest("li")).toHaveClass("disabled"); // Prev

    // First page should be active
    expect(screen.getByText("1").closest("li")).toHaveClass("active");

    // Last page exists
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("calls onPageChange when clicking a page number", () => {
    const mockOnPageChange = vi.fn();

    render(<CustomPagination currentPage={2} pageCount={5} onPageChange={mockOnPageChange} />);

    fireEvent.click(screen.getByText("3"));
    expect(mockOnPageChange).toHaveBeenCalledWith(3);

    fireEvent.click(screen.getByText("1"));
    expect(mockOnPageChange).toHaveBeenCalledWith(1);
  });

  it("calls onPageChange when clicking next and prev", () => {
    const mockOnPageChange = vi.fn();

    render(<CustomPagination currentPage={3} pageCount={5} onPageChange={mockOnPageChange} />);

    fireEvent.click(screen.getByText("›")); // Next
    expect(mockOnPageChange).toHaveBeenCalledWith(4);

    fireEvent.click(screen.getByText("‹")); // Prev
    expect(mockOnPageChange).toHaveBeenCalledWith(2);
  });

  it("disables next/last when on last page", () => {
    const mockOnPageChange = vi.fn();

    render(<CustomPagination currentPage={5} pageCount={5} onPageChange={mockOnPageChange} />);

    expect(screen.getByText("›").closest("li")).toHaveClass("disabled"); // Next
    expect(screen.getByText("»").closest("li")).toHaveClass("disabled"); // Last
  });
});
