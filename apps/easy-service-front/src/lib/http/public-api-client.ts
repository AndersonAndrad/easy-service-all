import axios from "axios";
import { getPublicApiBaseUrl } from "@/lib/env";

export const publicApiClient = axios.create({
  baseURL: getPublicApiBaseUrl(),
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});
