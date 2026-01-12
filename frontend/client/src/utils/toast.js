import { toast } from "react-toastify";

/* ===============================
   SUCCESS
=============================== */
export const toastSuccess = (message) => {
  toast.success(message);
};

/* ===============================
   ERROR (API SAFE)
=============================== */
export const toastError = (err, fallback = "Something went wrong") => {
  const message =
    err?.response?.data?.message ||
    err?.message ||
    fallback;

  toast.error(message);
};

/* ===============================
   WARNING
=============================== */
export const toastWarn = (message) => {
  toast.warn(message);
};

/* ===============================
   INFO
=============================== */
export const toastInfo = (message) => {
  toast.info(message);
};
