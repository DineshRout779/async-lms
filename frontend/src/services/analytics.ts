import api from "./api";

export const getAnalytics = async (filters: {
  college?: string;
  domain?: string;
  batch?: string;
  assignment?: string;
}) => {
  const res = await api.get("/analytics", { params: filters });
  return res.data.data;
};