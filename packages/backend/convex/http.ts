import { httpRouter } from "convex/server";

import { authComponent, createAuth } from "./auth";
import { pakasirWebhook } from "./payments";

const http = httpRouter();

authComponent.registerRoutesLazy(http, createAuth, {
	cors: true,
	trustedOrigins: [process.env.SITE_URL!],
});

http.route({
	handler: pakasirWebhook,
	method: "POST",
	path: "/pakasir/webhook",
});

export default http;
