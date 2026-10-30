
const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    type: { type: String, required: true },
    options: { type: [String], default: [] }
  },
  { _id: false }
);

const surveySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ""
  },
  questions: {
    type: [questionSchema],
    default: []
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Survey", surveySchema);
