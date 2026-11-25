const express = require('express');
const mongoose = require('mongoose');
const Child = require('../models/Child');
const NutritionAssessment = require('../models/NutritionAssessment');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const pickFields = (body) => {
  const { tcl_number, child_name, birth_date, sex, guardian_name, guardian_contact, purok_address } = body;
  return { tcl_number, child_name, birth_date, sex, guardian_name, guardian_contact, purok_address };
};

// Listahan ng mga bata (may search: ?q=pangalan o TCL number)
// Kasama ang pinakabagong nutrition risk ng bawat bata (latest_risk)
router.get('/', async (req, res) => {
  try {
    const { q } = req.query;
    let filter = {};
    if (q) {
      const rx = new RegExp(escapeRegex(q), 'i');
      filter = { $or: [{ child_name: rx }, { tcl_number: rx }, { guardian_name: rx }] };
    }
    const children = await Child.find(filter).sort({ createdAt: -1 });

    // pinakabagong assessment kada bata
    const latest = await NutritionAssessment.aggregate([
      { $match: { child_id: { $in: children.map((c) => c._id) } } },
      { $sort: { date_measured: -1, createdAt: -1 } },
      {
        $group: {
          _id: '$child_id',
          risk_classification: { $first: '$risk_classification' },
          date_measured: { $first: '$date_measured' },
        },
      },
    ]);
    const riskByChild = new Map(latest.map((l) => [String(l._id), l]));

    res.json(
      children.map((c) => {
        const l = riskByChild.get(String(c._id));
        return {
          ...c.toObject(),
          latest_risk: l
            ? { risk_classification: l.risk_classification, date_measured: l.date_measured }
            : null,
        };
      })
    );
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Mag-register ng bata
router.post('/', async (req, res) => {
  try {
    const child = await Child.create({ ...pickFields(req.body), registered_by: req.user.id });
    res.status(201).json(child);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'TCL number already exists' });
    }
    res.status(400).json({ message: err.message });
  }
});

// Kunin ang isang bata
router.get('/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid child id' });
    }
    const child = await Child.findById(req.params.id);
    if (!child) return res.status(404).json({ message: 'Child not found' });
    res.json(child);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// I-update ang bata
router.put('/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid child id' });
    }
    const child = await Child.findByIdAndUpdate(req.params.id, pickFields(req.body), {
      new: true,
      runValidators: true,
    });
    if (!child) return res.status(404).json({ message: 'Child not found' });
    res.json(child);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'TCL number already exists' });
    }
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;