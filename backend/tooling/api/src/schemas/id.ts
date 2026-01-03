import { String } from "fluid-oas";

export const uuidSchema = String.addFormat("uuid")
  .addExample("5e91507e-5630-4efd-9fd4-799178870b10")
  .addDescription("Unique identifer");
