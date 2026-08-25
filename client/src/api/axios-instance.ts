import axios, { type AxiosRequestConfig } from "axios";

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost/rnp_calendar/server/public/api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

/**
 * A 401 from the verify endpoint means "bad or expired token", not "session expired". Bouncing to
 * /login with the current URL as `redirect` caused the expired-link login loop: that URL carries a
 * one-shot token which can never be replayed, so every later login landed back on a dead link.
 * AuthVerify handles this case itself.
 */
const isVerifyCall = (url = "") => url.includes("/auth/discord/verify");

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error?.response?.status === 401 &&
      !isVerifyCall(error?.config?.url) &&
      window.location.pathname !== "/login"
    ) {
      const redirect = window.location.pathname + window.location.search;
      window.location.replace(`/login?redirect=${encodeURIComponent(redirect)}`);
    }
    return Promise.reject(error);
  },
);

export type ErrorType<T> = T & { status: number };

export const axiosInstance = <T>(
  config: AxiosRequestConfig,
  options?: AxiosRequestConfig,
): Promise<T> => {
  return client({ ...config, ...options }).then((response) => response.data);
};
