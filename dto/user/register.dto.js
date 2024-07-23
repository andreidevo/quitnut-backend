const { z } = require("zod");
const { validate } = require("../validate");

const registerZodSchema = z.object({
  email: z.union([z.string(), z.number().transform((val) => val.toString())]),
  password: z.union([
    z.string(),
    z.number().transform((val) => val.toString()),
  ]),
});

const validateRegister = validate(registerZodSchema);

module.exports = validateRegister;
