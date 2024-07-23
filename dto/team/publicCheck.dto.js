const { z } = require("zod");
const { validate } = require("../validate.js");

const publicnameCheckZodSchema = z.object({
    publicname: z.string(),
});

const validatePublicnameCheck = validate(publicnameCheckZodSchema);

module.exports = validatePublicnameCheck;
