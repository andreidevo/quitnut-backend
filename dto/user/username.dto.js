const { z } = require("zod");
const { validate } = require("../validate");

const usernameZodSchema = z.object({
  username: z.union([z.string(), z.number()]),
});

const validateUsername = validate(usernameZodSchema);

module.exports = validateUsername;
