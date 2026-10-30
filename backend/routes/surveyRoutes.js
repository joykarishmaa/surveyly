
const express = require("express");
const mongoose = require("mongoose");
const Survey = require("../models/Survey");
const Response = require("../models/Response");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Create a survey (login required)
router.post("/", authMiddleware, async (req, res) => {
  try {
    const survey = new Survey({
      title: req.body.title,
      description: req.body.description,
      questions: req.body.questions || [],
      createdBy: req.user.userId
    });

    await survey.save();
    res.status(201).json(survey);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get only the logged-in user's surveys
router.get("/", authMiddleware, async (req, res) => {
  try {
    const surveys = await Survey.find({
      createdBy: req.user.userId
    }).sort({ createdAt: -1 });

    res.json(surveys);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update own survey (login required)
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid survey ID" });
    }

    const survey = await Survey.findOneAndUpdate(
      {
        _id: req.params.id,
        createdBy: req.user.userId
      },
      {
        title: req.body.title,
        description: req.body.description,
        questions: req.body.questions
      },
      { new: true, runValidators: true }
    );

    if (!survey) {
      return res.status(404).json({
        message: "Survey not found or you don't own it"
      });
    }

    res.json(survey);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete own survey and its responses (login required)
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid survey ID" });
    }

    const survey = await Survey.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.user.userId
    });

    if (!survey) {
      return res.status(404).json({
        message: "Survey not found or you don't own it"
      });
    }

    await Response.deleteMany({ surveyId: survey._id });

    res.json({
      message: "Survey and its responses deleted successfully"
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get one survey (public - needed for shared links)
router.get("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid survey ID" });
    }

    const survey = await Survey.findById(req.params.id);

    if (!survey) {
      return res.status(404).json({ message: "Survey not found" });
    }

    res.json(survey);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Submit a response (public - anyone with the link can respond)
router.post("/:id/responses", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid survey ID" });
    }

    const survey = await Survey.findById(req.params.id);

    if (!survey) {
      return res.status(404).json({ message: "Survey not found" });
    }

    const response = await Response.create({
      surveyId: survey._id,
      answers: req.body.answers
    });

    res.status(201).json({
      message: "Response submitted successfully",
      response
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get results of own survey (login required)
router.get("/:id/results", authMiddleware, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid survey ID" });
    }

    const survey = await Survey.findOne({
      _id: req.params.id,
      createdBy: req.user.userId
    });

    if (!survey) {
      return res.status(404).json({
        message: "Survey not found or you don't own it"
      });
    }

    const responses = await Response.find({
      surveyId: survey._id
    });

    res.json({
      survey,
      totalQuestions: survey.questions.length,
      totalResponses: responses.length,
      responses
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
