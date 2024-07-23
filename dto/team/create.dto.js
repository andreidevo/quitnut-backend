const { z } = require("zod");
const { validate } = require("../validate.js");

const createZodSchema = z.object({
    type: z.string(),
    publicname: z.string(),
    title: z.string(),
});

const validateCreate = validate(createZodSchema);

module.exports = validateCreate;
