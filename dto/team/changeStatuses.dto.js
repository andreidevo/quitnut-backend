const { z } = require("zod");
const { validate } = require("../validate.js");

const changeStatusesZodSchema = z.object({
  updates: z.array(z.object({
    Type: z.string(),
    streakDays: z.number(),
    maxPeople: z.number()
  }))
});

const validateChangeStatuses = validate(changeStatusesZodSchema);

module.exports = validateChangeStatuses;
