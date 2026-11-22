const express = require('express');
const mongoose = require('mongoose');
const ImmunizationRecord = require('../models/ImmunizationRecord');
const Child = require('../models/Child');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

// Listahan ng defaulters: Pending pa at lampas na sa scheduled date
router.get('/defaulters', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const records = await ImmunizationRecord.find({
      status: { $in: ['Pending', 'Defaulter'] },
      scheduled_date: { $lt: today },
    })
      .populate('child_id', 'tcl_number child_name guardian_name guardian_contact purok_address')
      .sort({ scheduled_date: 1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Lahat ng bakuna ng isang bata
router.get('/child/:childId', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.childId)) {
    return res.status(400).json({ message: 'Invalid child id' });
  }
  const records = await ImmunizationRecord.find({ child_id: req.params.childId }).sort({
    scheduled_date: 1,
  });
  res.json(records);
});

// Magdagdag ng bakuna schedule
router.post('/', async (req, res) => {
  try {
    const { child_id, vaccine_name, dose_number, scheduled_date } = req.body;
    if (!mongoose.isValidObjectId(child_id)) {
      return res.status(400).json({ message: 'Invalid child id' });
    }
    const child = await Child.findById(child_id);
    if (!child) return res.status(404).json({ message: 'Child not found' });
    const record = await ImmunizationRecord.create({
      child_id,
      vaccine_name,
      dose_number,
      scheduled_date,
    });
    res.status(201).json(record);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Markahan na naibigay na ang bakuna
router.put('/:id/administer', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid record id' });
    }
    const record = await ImmunizationRecord.findByIdAndUpdate(
      req.params.id,
      { status: 'Completed', administered_date: new Date() },
      { new: true }
    );
    if (!record) return res.status(404).json({ message: 'Record not found' });
    res.json(record);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;