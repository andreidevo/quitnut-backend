const { z } = require("zod");
const { validate } = require("../validate");

const loginZodSchema = z.object({
  email: z.union([z.string(), z.number().transform((val) => val.toString())]),
  password: z.union([
    z.string(),
    z.number().transform((val) => val.toString()),
  ]),
});

const validateLogin = validate(loginZodSchema);

module.exports = validateLogin;
