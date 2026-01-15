import axios from "axios";

const candidateApi = axios.create({
  baseURL: "http://localhost:5000/api",
  withCredentials: true,
});

candidateApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("candidate_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default candidateApi;

export const uploadIDCard = (formData) => {
  return candidateApi.post("/auth/upload-id-card", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};
