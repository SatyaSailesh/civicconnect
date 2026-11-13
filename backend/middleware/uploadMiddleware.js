const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { createCloudinaryStorage } = require("../services/cloudinaryStorage");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = createCloudinaryStorage(cloudinary);

const uploadsEnabled = ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"]
  .every(name => Boolean(process.env[name]?.trim()));

const upload = multer({
  fileFilter(req, file, callback) {
    if (!uploadsEnabled) return callback(Object.assign(new Error("Cloudinary is not configured"), { status: 503 }));
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.mimetype))
      return callback(Object.assign(new Error("Use JPEG, PNG or WebP images."), { status: 400 }));
    callback(null, true);
  },
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 2 },
});

module.exports = upload;
