const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const { spawn } = require('child_process');
const NutritionAssessment = require('../models/NutritionAssessment');
const Child = require('../models/Child');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

const ENGINE = path.join(__dirname, '..', 'engine', 'who_engine.py');
const PYTHON = process.platform === 'win32' ? 'py' : 'python3';

// Tinatawag ang Python WHO engine at ibinabalik ang resulta
function runEngine(input) {
  return new Promise((resolve, reject) => {
    const proc = spawn(PYTHON, [ENGINE]);
    let out = '';
    let err = '';
    proc.stdout.on('data', (d) => (out += d));
    proc.stderr.on('data', (d) => (err += d));
    proc.on('error', () => reject(new Error('Python engine could not be started')));
    proc.on('close', () => {
      try {
        const result = JSON.parse(out);
        if (result.error) return reject(Object.assign(new Error(result.error), { bad: true }));
        resolve(result);
      } catch (e) {
        reject(new Error(err || 'Engine returned no result'));
      }
    });
    proc.stdin.write(JSON.stringify(input));
    proc.stdin.end();
  });
}

// Mag-save ng bagong OPT+ assessment at i-compute ang WHO Z-scores
router.post('/', async (req, res) => {
  try {
    const { child_id, date_measured, weight_kg, height_cm } = req.body;
    if (!mongoose.isValidObjectId(child_id)) {
      return res.status(400).json({ message: 'Invalid child id' });
    }
    const child = await Child.findById(child_id);
    if (!child) return res.status(404).json({ message: 'Child not found' });

    const measured = new Date(date_measured);
    if (isNaN(measured)) return res.status(400).json({ message: 'Invalid date measured' });
    if (measured < child.birth_date) {
      return res.status(400).json({ message: 'Date measured is before the birth date' });
    }
    if (measured > new Date()) {
      return res.status(400).json({ message: 'Date measured cannot be in the future' });
    }

    // edad sa buwan (average na 30.4375 araw kada buwan)
    const ageMonths = (measured - child.birth_date) / 86400000 / 30.4375;

    const result = await runEngine({
      sex: child.sex.toLowerCase(),
      age_months: ageMonths,
      weight_kg: Number(weight_kg),
      height_cm: Number(height_cm),
    });

    const record = await NutritionAssessment.create({
      child_id,
      date_measured: measured,
      weight_kg: Number(weight_kg),
      height_cm: Number(height_cm),
      waz_score: result.waz,
      haz_score: result.haz,
      whz_score: result.whz,
      risk_classification: result.risk_classification,
    });
    res.status(201).json({ ...record.toObject(), grades: {
      waz: result.waz_grade, haz: result.haz_grade, whz: result.whz_grade,
    } });
  } catch (err) {
    res.status(err.bad ? 400 : 500).json({ message: err.message });
  }
});

// Lahat ng assessment ng isang bata
router.get('/child/:childId', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.childId)) {
    return res.status(400).json({ message: 'Invalid child id' });
  }
  const records = await NutritionAssessment.find({ child_id: req.params.childId }).sort({
    date_measured: -1,
  });
  res.json(records);
});

module.exports = router;