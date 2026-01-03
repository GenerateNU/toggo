import { SecurityRequirement, type OpenApiOperation } from "fluid-oas";

export const addBearerAuthToOperation = (operation: OpenApiOperation) => {
  return operation.addSecurity([
    SecurityRequirement.addSecurityRequirement({ BearerAuth: [] }),
  ]);
};
