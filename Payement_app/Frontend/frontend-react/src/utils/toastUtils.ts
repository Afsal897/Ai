import Swal, {
  type SweetAlertOptions,
  type SweetAlertResult,
} from "sweetalert2";

export const showConfirmDialog = (
  options?: SweetAlertOptions
): Promise<SweetAlertResult> => {
  return Swal.fire({
    text: "Do you want to proceed?",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Yes",
    cancelButtonText: "Cancel",
    confirmButtonColor: "#0d6efd",
    ...options,
  });
};
