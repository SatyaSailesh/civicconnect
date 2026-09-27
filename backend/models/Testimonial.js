const mongoose = require("mongoose");

const TestimonialSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    name: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    text: { type: String, required: true, trim: true, maxlength: 300 },
    rating: { type: Number, required: true, min: 1, max: 5 },
    approved: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model("Testimonial", TestimonialSchema);
