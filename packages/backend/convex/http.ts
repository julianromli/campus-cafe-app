import { httpRouter } from "convex/server";

import { authComponent, createAuth } from "./auth";
import { mayarWebhook } from "./payments";

const http = httpRouter();

authComponent.registerRoutesLazy(http, createAuth, {
  cors: true,
  trustedOrigins: [process.env.SITE_URL!],
});

http.route({
  handler: mayarWebhook,
  method: "POST",
  path: "/mayar/webhook",
});

export default http;
