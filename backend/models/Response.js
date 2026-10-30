
const mongoose = require("mongoose");

const responseSchema = new mongoose.Schema({
  surveyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Survey",
    required: true
  },
  answers: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  submittedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Response", responseSchema);
