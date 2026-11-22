const mongoose = require('mongoose');

const nutritionAssessmentSchema = new mongoose.Schema(
  {
    child_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Child', required: true },
    date_measured: { type: Date, required: true },
    weight_kg: { type: Number, required: true, min: 0.01 },
    height_cm: { type: Number, required: true, min: 0.01 },
    waz_score: { type: Number, required: true },
    haz_score: { type: Number, required: true },
    whz_score: { type: Number, required: true },
    risk_classification: {
      type: String,
      enum: ['Normal', 'Moderate', 'Severe', 'Above Normal'],
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('NutritionAssessment', nutritionAssessmentSchema);