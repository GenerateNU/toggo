// src/lib/api/apiClient.ts

export type FetchConfig = {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
    headers?: HeadersInit
    body?: unknown
    signal?: AbortSignal
  }
  
  async function getAuthToken(): Promise<string | null> {
    // e.g. SecureStore / AsyncStorage
    return null
  }
  
  const BASE_URL = process.env.EXPO_PUBLIC_API_URL
  
  export async function apiClient<T>(
    url: string,
    config: FetchConfig = {},
  ): Promise<T> {
    const token = await getAuthToken()
  
    const res = await fetch(`${BASE_URL}${url}`, {
      method: config.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...config.headers,
      },
      body:
        config.body !== undefined
          ? JSON.stringify(config.body)
          : undefined,
      signal: config.signal,
    })
  
    if (!res.ok) {
      const errorBody = await res.text()
      throw new Error(
        `API error ${res.status}: ${errorBody}`,
      )
    }
  
    return res.json() as Promise<T>
  }
  