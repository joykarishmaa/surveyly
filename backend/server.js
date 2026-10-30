
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const surveyRoutes = require("./routes/surveyRoutes");
const aiRoutes = require("./routes/aiRoutes");
const authRoutes = require("./routes/authRoutes");

const app = express();

app.use(cors());
app.use(express.json());

console.log("surveyRoutes:", typeof surveyRoutes);
console.log("aiRoutes:", typeof aiRoutes);

app.use("/api/surveys", surveyRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/auth", authRoutes);


mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected successfully");
  })
  .catch((error) => {
    console.log("MongoDB connection error:", error.message);
  });

app.get("/api/health", (req, res) => {
  res.json({ message: "Backend is working!" });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
