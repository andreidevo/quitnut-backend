const { z } = require("zod");
const { validate } = require("../validate.js");

const setStartDateZodSchema = z.object({
  date: z.string(),
  t: z.string(),
});

const validateSetStartDateZodSchema = validate(setStartDateZodSchema);

module.exports = validateSetStartDateZodSchema;
