const { z } = require("zod");
const { validate } = require("../validate");

const setUsernameZodSchema = z.object({
  username: z.union([
    z.string(),
    z.number().transform((val) => val.toString()),
  ]),
});

const validateSetUsername = validate(setUsernameZodSchema);

module.exports = validateSetUsername;
