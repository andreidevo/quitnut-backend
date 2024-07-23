const { z } = require("zod");
const { validate } = require("../validate.js");

const reportTeamZodSchema = z.object({
    id: z.union([
        z.string(),
        z.number()
    ]),
});

const validateReport = validate(reportTeamZodSchema);

module.exports = validateReport;
