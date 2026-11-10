require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const { startEscalationJob } = require("./jobs/EscalationJob");

const app = express();

app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    process.env.FRONTEND_URL?.replace(/\/$/, '')
  ].filter(Boolean),
  credentials: true,
}));
app.use(express.json());

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/complaints", require("./routes/complaintRoutes"));
app.use("/api/dashboard", require("./routes/dashboardRoutes"));
app.use("/api/testimonials", require("./routes/testimonialRoutes"));
app.get("/", (req, res) => res.send("CivicConnect API is live! ⚡"));
app.get("/health", (req, res) => {
  const ready = mongoose.connection.readyState === 1;
  res.status(ready ? 200 : 503).json({ status: ready ? "ok" : "unavailable" });
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error.code === "LIMIT_FILE_SIZE")
    return res.status(400).json({ message: "Each image must be 5 MB or smaller." });
  if (error.name === "MulterError")
    return res.status(400).json({ message: "Upload at most two images using the images field." });
  if (error.name === "CastError" || error.name === "ValidationError" || error.status === 400)
    return res.status(400).json({ message: "Invalid request data." });
  if (error.status === 503)
    return res.status(503).json({ message: "Image uploads are unavailable. Submit without an image or try again later." });
  console.error(error.message);
  res.status(500).json({ message: "Server error" });
});

async function start() {
  for (const name of ["MONGO_URI", "JWT_SECRET"]) {
    if (!process.env[name]?.trim()) throw new Error(`Missing required environment variable: ${name}`);
  }

  await connectDB();
  await Promise.all([
    require("./models/User").init(),
    require("./models/Complaint").init(),
  ]);
  const port = Number(process.env.PORT ?? 5000);
  const server = app.listen(port, () => {
    console.log(`🚀 Server on port ${server.address().port}`);
    startEscalationJob();
  });
}

start().catch(error => {
  console.error(error.message);
  process.exit(1);
});
