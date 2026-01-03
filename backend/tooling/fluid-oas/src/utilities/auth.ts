import {
  SecurityRequirement,
  SecurityScheme,
  type OpenApiOperation,
} from "fluid-oas";

export const bearerSecurityRequirement = SecurityScheme.addType("http")
  .addScheme("bearer")
  .addBearerFormat("JWT");

export const addBearerAuthToOperation = (operation: OpenApiOperation) => {
  return operation.addSecurity([
    SecurityRequirement.addSecurityRequirement({ BearerAuth: [] }),
  ]);
};
