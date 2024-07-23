const { z } = require("zod");
const { validate } = require("../validate.js");

const removeZodSchema = z.object({
    id: z.union([
        z.string(),
        z.number()
    ]),
});

const validateRemove = validate(removeZodSchema);

module.exports = validateRemove;
