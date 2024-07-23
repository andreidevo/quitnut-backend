const { z } = require("zod");
const { validate } = require("../validate.js");

const editZodSchema = z.object({
    id: z.union([
        z.string(),
        z.number()
    ]),
    title: z.union([
        z.string(),
        z.number()
    ]),
    description: z.union([
        z.string(),
        z.number()
    ]),
    publicname: z.union([
        z.string(),
        z.number()
    ]),
    url: z.union([
        z.string(),
        z.number()
    ]),
});

const validateEdit = validate(editZodSchema);

module.exports = validateEdit;
