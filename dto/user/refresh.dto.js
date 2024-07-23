const { z } = require("zod");
const { validate } = require("../validate");

const refreshZodSchema = z.object({
  accessToken: z.union([z.string(), z.number()]),
});

const validateRefresh = validate(refreshZodSchema);

module.exports = validateRefresh;
