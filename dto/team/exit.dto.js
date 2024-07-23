const { z } = require("zod");
const { validate } = require("../validate.js");

const exitZodSchema = z.object({
    id: z.union([
        z.string(),
        z.number()
    ]),
});

const validateExit = validate(exitZodSchema);

module.exports = validateExit;
