const { z } = require("zod");
const { validateQuery } = require("../validateQuery.js");

const apppleCallbackGetZodSchema = z.object({
  // token: z.string(),
  code: z.string(),
  useBundleId: z.string()
});

const validateApppleCallbackGet = validateQuery(apppleCallbackGetZodSchema);

module.exports = validateApppleCallbackGet;
