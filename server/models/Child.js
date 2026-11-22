const mongoose = require('mongoose');

const childSchema = new mongoose.Schema(
  {
    registered_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    tcl_number: { type: String, required: true, unique: true, trim: true, maxlength: 30 },
    child_name: { type: String, required: true, trim: true, maxlength: 100 },
    birth_date: { type: Date, required: true },
    sex: { type: String, enum: ['Male', 'Female'], required: true },
    guardian_name: { type: String, required: true, trim: true, maxlength: 100 },
    guardian_contact: { type: String, required: true, match: /^\+639\d{9}$/ },
    purok_address: { type: String, required: true, trim: true, maxlength: 150 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Child', childSchema);