const { z } = require("zod");
const { validate } = require("../validate.js");

const sendReportZodSchema = z.object({
  report: z.string(),
});

const validateSendReportZodSchema = validate(sendReportZodSchema);

module.exports = validateSendReportZodSchema;
