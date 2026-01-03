import { Component, Info, OpenApiV3, SecurityScheme } from "fluid-oas";
import { getHealthcheck } from "./routes/healthcheck";
import { Path } from "fluid-oas";
export const info = Info.addTitle("Toggo API")
  .addVersion("1.0.0")
  .addDescription(
    " Toggo is a chat-based app that helps trips make it out of the group chat. It focuses on the people, not the planning overload, with an easy interface to share ideas, catch up on summaries, and manage RSVPs and dates, making trip planning simpler and more collaborative.",
  );

let spec = OpenApiV3.addOpenApiVersion("3.0.3").addInfo(info);

export const bearerSecurityRequirement = SecurityScheme.addType("http")
  .addScheme("bearer")
  .addBearerFormat("JWT");

const components = Component.addSecuritySchemes({
  BearerAuth: bearerSecurityRequirement,
});
spec = spec.addComponents(components).addPaths(
  Path.addEndpoints({
    "/healthcheck": getHealthcheck,
  }),
);
spec.writeOASASync("../../openapi.yaml", true);
