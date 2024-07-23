const { z } = require("zod");
const { validate } = require("../validate.js");

const changeStatusesZodSchema = z.object({
    updates: z.union([
        z.string(),
        z.number(),
        z.array()
    ]),
});

const validateChangeStatuses = validate(changeStatusesZodSchema);

module.exports = validateChangeStatuses;
