import axios from "axios";

const API_BASE_URL = "http://127.0.0.1:9001";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export const endpoints = {
  upload: "/upload",
  analytics: "/analytics",
  claims: "/claims",
  auditLogs: "/audit-logs",
  employeeClaims: (id: string) => `/claims/employee/${id}`,
};
