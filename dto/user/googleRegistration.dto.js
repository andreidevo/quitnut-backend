const { z } = require("zod");
const { validate } = require("../validate");

const googleRegisterZodSchema = z.object({
  token: z.union([z.string(), z.number()]),
  platform: z.union([z.string(), z.number()]),
});

const validateGoogleRegisterZodSchema = validate(googleRegisterZodSchema);

module.exports = validateGoogleRegisterZodSchema;
