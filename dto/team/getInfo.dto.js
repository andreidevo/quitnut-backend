const { z } = require("zod");
const { validate } = require("../validate.js");

const getInfoZodSchema = z.object({
    id: z.union([
        z.string(),
        z.number()
    ]),
});

const validateGetInfo = validate(getInfoZodSchema);

module.exports = validateGetInfo;
