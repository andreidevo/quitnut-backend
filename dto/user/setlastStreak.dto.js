const { z } = require("zod");
const { validate } = require("../validate");

const setLastStreakZodSchema = z.object({
  date: z.union([
    z.string(),
    z.number().transform((val) => val.toString()),
  ]),
});

const validateSetLastStreak = validate(setLastStreakZodSchema);

module.exports = validateSetLastStreak;