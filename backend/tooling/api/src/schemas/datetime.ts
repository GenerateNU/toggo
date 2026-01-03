import { String } from "fluid-oas";

export const timestampSchema = String.addFormat("date-time")
  .addExample("2023-10-05T14:48:00.000Z")
  .addDescription("Timestamp in ISO 8601 format");
