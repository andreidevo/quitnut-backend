const { z } = require("zod");
const { validate } = require("../validate");

const ssZodSchema = z.object({
  ss: z.union([z.string(), z.number()]),
});

const validateSs = validate(ssZodSchema);

module.exports = validateSs;
