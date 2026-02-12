import request from "@/api/client";

// Typeahead search for places
export const searchPlacesTypeahead = async (query: string, limit = 5) => {
  const params = new URLSearchParams({
    q: query,
    limit: limit.toString(),
  });

  return request<any>({
    method: "GET",
    url: `/api/v1/search/places/typeahead?${params.toString()}`,
  });
};

// Get place details by place_id or input text
export const getPlaceDetails = async (params: {
  place_id?: string;
  input?: string;
  language?: string;
}) => {
  return request<any>({
    method: "POST",
    url: "/api/v1/search/places/details",
    data: params,
  });
};
