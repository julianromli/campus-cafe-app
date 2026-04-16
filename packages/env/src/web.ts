import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  clientPrefix: "VITE_",
  client: {
    VITE_GOOGLE_CLIENT_ID: z.string().optional(),
    VITE_CONVEX_URL: z.url(),
    VITE_CONVEX_SITE_URL: z.url(),
  },
  runtimeEnv: (import.meta as any).env,
  emptyStringAsUndefined: true,
});
