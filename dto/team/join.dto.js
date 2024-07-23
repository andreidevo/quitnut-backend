const { z } = require("zod");
const { validate } = require("../validate.js");

const JoinZodSchema = z.object({
    id: z.union([
        z.string(),
        z.number()
    ]),
});

const validateJoin = validate(JoinZodSchema);

module.exports = validateJoin;
