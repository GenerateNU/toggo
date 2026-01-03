import {
  PathItem,
  Operation,
  Response,
  Responses,
  String,
  Object,
  MediaType,
} from "fluid-oas";

const healthcheckSchema = Object.addProperties({
  status: String.addExample("OK").addDescription(
    "Health status of the service",
  ),
});

const getHealthcheckResponses = Responses({
  200: Response.addDescription("Successfully Retrieved User!").addContents({
    "application/json": MediaType.addSchema(healthcheckSchema),
  }),
});

export const getHealthcheck = PathItem.addMethod({
  get: Operation.addResponses(getHealthcheckResponses),
});
