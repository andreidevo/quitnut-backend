const { z } = require("zod");
const { validate } = require("../validate.js");

const acceptChangeZodSchema = z.object({
    id: z.union([
        z.string(),
        z.number()
    ]),
});

const validateAcceptChange = validate(acceptChangeZodSchema);

module.exports = validateAcceptChange;
