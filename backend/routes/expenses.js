const express = require("express");
const router = express.Router();
const Expense = require("../models/Expense");
const { protect, optionalAuth } = require("../middlewares/auth");

// Get all expenses for a user
router.get("/", optionalAuth, async (req, res) => {
  try {
    if (!req.user) return res.json([]);
    const expenses = await Expense.find({ userId: req.user._id }).sort({ date: -1 });
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch expenses" });
  }
});

// Add a new expense
router.post("/", protect, async (req, res) => {
  try {
    const { amount, description, category } = req.body;
    const newExpense = new Expense({
      userId: req.user._id,
      amount,
      description,
      category,
    });
    const savedExpense = await newExpense.save();
    res.status(201).json(savedExpense);
  } catch (err) {
    res.status(500).json({ error: "Failed to create expense" });
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
