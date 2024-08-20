const { z } = require("zod");
const { validate } = require("../validate.js");

const allowedMimeTypes = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp'
];

const uploadImageSchema = z.object({
  file: z.object({
    mimetype: z.string().refine(val => allowedMimeTypes.includes(val), {
      message: "Invalid file type. Only JPEG, JPG, PNG, WebP images are allowed.",
    }),
    size: z.number().max(5 * 1024 * 1024, "File size exceeds 5MB limit."),
    originalname: z.string()
  }),
  bucket_name: z.string(),
});

const uploadImage = validate(uploadImageSchema);

module.exports = uploadImage;