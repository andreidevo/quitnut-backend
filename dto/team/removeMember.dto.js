const { z } = require("zod");
const { validate } = require("../validate.js");

const removeZodSchema = z.object({
    id: z.union([
        z.string(),
        z.number()
    ]),
    user_name: z.union([
      z.string(),
      z.number()
    ]),
});

const validateRemoveMember = validate(removeZodSchema);

module.exports = validateRemoveMember;
