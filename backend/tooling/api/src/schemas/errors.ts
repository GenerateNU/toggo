import { Object, String } from "fluid-oas";

export const errorSchema = Object.addProperties({
  message: String.addReadOnly(true),
});
