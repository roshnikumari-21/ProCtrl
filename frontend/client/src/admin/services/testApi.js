import api from "../../services/api.js";

export const createTest = (data) => api.post("/tests", data);
export const getMyTests = () => api.get("/tests/my-tests");
export const getTestById = (id) => api.get("/tests/" + id);
export const updateTest = (id, data) => api.put("/tests/" + id, data);
export const addCandidates = (id, candidates) => api.post("/tests/" + id + "/candidates", { candidates });
export const removeCandidate = (id, email) => api.delete("/tests/" + id + "/candidates", { data: { email } });
export const addQuestionsToTest = (id, questionIds) => api.post("/tests/" + id + "/questions", { questionIds });
export const removeQuestionFromTest = (id, questionId) => api.delete("/tests/" + id + "/questions/" + questionId);
