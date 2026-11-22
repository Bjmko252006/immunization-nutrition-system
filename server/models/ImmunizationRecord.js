const mongoose = require('mongoose');

const immunizationRecordSchema = new mongoose.Schema(
  {
    child_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Child', required: true },
    vaccine_name: { type: String, required: true, trim: true, maxlength: 50 },
    dose_number: { type: Number, required: true, min: 1, validate: Number.isInteger },
    scheduled_date: { type: Date, required: true },
    administered_date: { type: Date, default: null },
    status: {
      type: String,
      enum: ['Pending', 'Completed', 'Defaulter'],
      default: 'Pending',
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ImmunizationRecord', immunizationRecordSchema);