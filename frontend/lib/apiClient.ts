import { toast } from "sonner";

const getAuthToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("authToken");
};

const request = async (endpoint: string, options: RequestInit = {}) => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) {
    throw new Error("API URL is not configured. Please set NEXT_PUBLIC_API_URL.");
  }

  const token = getAuthToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers as any),
  };

  if (token) {
    (headers as any)["Authorization"] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${apiUrl}${endpoint}`, {
      ...options,
      headers,
    });

    const responseText = await response.text();
    let responseData: any = {};
    try {
      responseData = responseText ? JSON.parse(responseText) : {};
    } catch {
      responseData = { message: responseText || "An unexpected server response occurred." };
    }

    if (!response.ok) {
      const errorMessage =
        Array.isArray(responseData.message)
          ? responseData.message.join(", ")
          : typeof responseData.message === "string"
          ? responseData.message
          : `Request failed with status ${response.status}`;
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }

    return responseData;
  } catch (error: any) {
    if (!error.message.includes("Request failed") && !error.message.includes("column")) {
       toast.error(error.message || "A network or unknown error occurred.");
    }
    throw error;
  }
};

export const apiClient = {
  get: (endpoint: string) => request(endpoint),
  post: (endpoint: string, body: any) =>
    request(endpoint, { method: "POST", body: JSON.stringify(body) }),
  put: (endpoint: string, body: any) =>
    request(endpoint, { method: "PUT", body: JSON.stringify(body) }),
  delete: (endpoint: string) => request(endpoint, { method: "DELETE" }),
};
