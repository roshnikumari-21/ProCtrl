import api from "../../services/api";

/* ===============================
   GET SINGLE CANDIDATE ATTEMPT
=============================== */
export const getAttemptById = (attemptId) =>
  api.get(`/admin/monitoring/attempts/${attemptId}`);

// services/monitoringApi.js
export const getAttemptsByTest = (testId) =>
  api.get(`/admin/monitoring/tests/${testId}/attempts`);

export const getAttemptStatsByTest = (testId) =>
  api.get(`/admin/monitoring/tests/${testId}/attempt-stats`);
