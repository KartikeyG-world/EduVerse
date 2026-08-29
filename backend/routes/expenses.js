const express = require("express");
const router = express.Router();
const Expense = require("../models/Expense");
const { protect, optionalAuth } = require("../middlewares/auth");

// Get all expenses for a user with optional date range
router.get("/", optionalAuth, async (req, res) => {
  try {
    if (!req.user) return res.json([]);
    const limit = Math.min(Math.max(Number(req.query.limit) || 200, 1), 500);
    const filter = { userId: req.user._id };

    if (req.query.startDate || req.query.endDate) {
      filter.date = {};
      if (req.query.startDate) filter.date.$gte = new Date(req.query.startDate);
      if (req.query.endDate) filter.date.$lte = new Date(req.query.endDate);
    }

    const expenses = await Expense.find(filter)
      .sort({ date: -1 })
      .limit(limit)
      .lean();
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch expenses" });
  }
});

// Add a new expense
router.post("/", protect, async (req, res) => {
  try {
    const { amount, description, category } = req.body;

    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0 || parsedAmount > 1000000) {
      return res.status(400).json({ 
        success: false, 
        message: "Amount must be a positive number up to 1,000,000" 
      });
    }

    if (!description || typeof description !== 'string' || description.trim().length === 0 || description.trim().length > 200) {
      return res.status(400).json({ 
        success: false, 
        message: "Description is required and cannot exceed 200 characters" 
      });
    }

    const allowedCategories = ["Education", "Food", "Entertainment", "Transport", "Other"];
    const safeCategory = allowedCategories.includes(category) ? category : "Other";

    const newExpense = new Expense({
      userId: req.user._id,
      amount: parsedAmount,
      description: description.trim(),
      category: safeCategory,
    });
    const savedExpense = await newExpense.save();
    res.status(201).json(savedExpense);
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to create expense" });
  }
});

// Delete an expense
router.delete("/:id", protect, async (req, res) => {
  try {
    await Expense.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    res.json({ message: "Expense deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete expense" });
  }
});

module.exports = router;
