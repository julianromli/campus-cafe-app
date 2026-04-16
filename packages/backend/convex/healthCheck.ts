import { v } from "convex/values";

import { query } from "./_generated/server";

export const get = query({
  args: {},
  returns: v.literal("OK"),
  handler: async () => {
    return "OK" as const;
  },
});
