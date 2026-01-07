// api/client.ts

export type RequestConfig<TBody = unknown> = {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  url: string;
  headers?: Record<string, string>;
  data?: TBody;
  signal?: AbortSignal;
};

export type ResponseErrorConfig<T = unknown> =
  | { status?: number; message?: string; data?: T }
  | Error;

type ClientResponse<TData> = { data: TData };

async function getAuthToken(): Promise<string | null> {
  // TODO: SecureStore / AsyncStorage
  return null;
}

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "";

export default async function request<TData, TError = unknown, TBody = unknown>(
  config: RequestConfig<TBody>,
): Promise<ClientResponse<TData>> {
  const token = await getAuthToken();

  const res = await globalThis.fetch(`${BASE_URL}${config.url}`, {
    method: config.method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(config.headers ?? {}),
    },
    body: config.data !== undefined ? JSON.stringify(config.data) : undefined,
    signal: config.signal,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    // throw something compatible with ResponseErrorConfig<TError>
    throw {
      status: res.status,
      message: text || `Request failed with ${res.status}`,
    } as ResponseErrorConfig<TError>;
  }

  if (res.status === 204) {
    return { data: undefined as unknown as TData };
  }

  const contentType = res.headers.get("content-type") ?? "";
  const data = (contentType.includes("application/json")
    ? await res.json()
    : await res.text()) as unknown as TData;

  return { data };
}
