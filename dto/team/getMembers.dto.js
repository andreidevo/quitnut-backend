const { z } = require("zod");
const { validate } = require("../validate.js");

const getMembersZodSchema = z.object({
    id: z.union([
        z.string(),
        z.number()
    ]),
    page: z.any(),
    size: z.any()
});

const validateGetMembers = validate(getMembersZodSchema);

module.exports = validateGetMembers;
