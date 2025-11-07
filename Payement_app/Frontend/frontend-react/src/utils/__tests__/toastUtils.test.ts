import { describe, it, expect, vi } from "vitest";
import Swal from "sweetalert2";
import { showConfirmDialog } from "../toastUtils";

vi.mock("sweetalert2", () => ({
  default: {
    fire: vi.fn(() =>
      Promise.resolve({
        isConfirmed: true,
        isDismissed: false,
        value: true,
      })
    ),
  },
}));

describe("showConfirmDialog", () => {
  it("should call Swal.fire with default options", async () => {
    await showConfirmDialog();

    expect(Swal.fire).toHaveBeenCalledWith(
      expect.objectContaining({
        text: "Do you want to proceed?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Yes",
        cancelButtonText: "Cancel",
        confirmButtonColor: "#0d6efd",
      })
    );
  });

  it("should override default text when options are passed", async () => {
    await showConfirmDialog({ text: "Are you sure?" });

    expect(Swal.fire).toHaveBeenCalledWith(
      expect.objectContaining({
        text: "Are you sure?",
      })
    );
  });

  it("should return the result from Swal.fire", async () => {
    const result = await showConfirmDialog();
    expect(result).toEqual({
      isConfirmed: true,
      isDismissed: false,
      value: true,
    });
  });
});
