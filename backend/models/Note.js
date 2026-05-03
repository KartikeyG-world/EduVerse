const mongoose = require("mongoose");

const NoteSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  title: { 
    type: String, 
    default: "Untitled Note", 
    trim: true 
  },
  content: { 
    type: String, 
    default: "" 
  },
  summary: { 
    type: String, 
    default: "" 
  },
  tags: [{ type: String }],
  isPinned: { 
    type: Boolean, 
    default: false 
  },
  lastEditedAt: { 
    type: Date, 
    default: Date.now 
  }
}, { timestamps: true });

module.exports = mongoose.model("Note", NoteSchema);
