export type Prediction = {
  place_id: string;
  description: string;
};

export type SelectedLocation = {
  name: string;
  place_id: string;
  lat: number;
  lng: number;
};