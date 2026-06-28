require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const app = express();
connectDB();

app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    process.env.FRONTEND_URL || 'https://your-app.vercel.app'
  ],
  credentials: true,
}));
app.use(express.json());

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/complaints", require("./routes/complaintRoutes"));
app.use("/api/testimonials", require("./routes/testimonialRoutes"));
app.get("/", (req, res) => res.send("CivicConnect API is live! ⚡"));
app.get("/health", (req, res) => res.json({ status: "ok", timestamp: new Date() }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));