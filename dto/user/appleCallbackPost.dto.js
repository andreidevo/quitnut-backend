const { z } = require("zod");
const { validate } = require("../validate.js");

const apppleCallbackPostZodSchema = z.object({
  id_token: z.string(),
  code: z.string(),
});

const validateApppleCallbackPost = validate(apppleCallbackPostZodSchema);

module.exports = validateApppleCallbackPost;
