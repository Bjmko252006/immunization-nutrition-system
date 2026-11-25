const express = require('express');
const Child = require('../models/Child');
const ImmunizationRecord = require('../models/ImmunizationRecord');
const NutritionAssessment = require('../models/NutritionAssessment');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

const DAY = 24 * 60 * 60 * 1000;

function ageInMonths(birthDate) {
  const b = new Date(birthDate);
  const n = new Date();
  let months = (n.getFullYear() - b.getFullYear()) * 12 + (n.getMonth() - b.getMonth());
  if (n.getDate() < b.getDate()) months -= 1;
  return Math.max(months, 0);
}

// Buod para sa BNS: bilang ng mga bata, nutrition status, at defaulters
router.get('/summary', async (req, res) => {
  try {
    const children = await Child.find().lean();

    // pinakabagong nutrition assessment ng bawat bata
    const latest = await NutritionAssessment.aggregate([
      { $sort: { date_measured: -1, createdAt: -1 } },
      {
        $group: {
          _id: '$child_id',
          risk: { $first: '$risk_classification' },
          date_measured: { $first: '$date_measured' },
          waz: { $first: '$waz_score' },
          haz: { $first: '$haz_score' },
          whz: { $first: '$whz_score' },
        },
      },
    ]);
    const latestByChild = new Map(latest.map((l) => [String(l._id), l]));

    const counts = { Normal: 0, Moderate: 0, Severe: 0, 'Above Normal': 0, 'Not assessed': 0 };
    const atRisk = [];
    for (const c of children) {
      const l = latestByChild.get(String(c._id));
      const risk = l ? l.risk : 'Not assessed';
      counts[risk] += 1;
      if (risk === 'Moderate' || risk === 'Severe') {
        atRisk.push({
          tcl_number: c.tcl_number,
          child_name: c.child_name,
          age_months: ageInMonths(c.birth_date),
          guardian_name: c.guardian_name,
          guardian_contact: c.guardian_contact,
          risk,
          date_measured: l.date_measured,
          waz: l.waz,
          haz: l.haz,
          whz: l.whz,
        });
      }
    }
    atRisk.sort((a, b) => (a.risk === b.risk ? 0 : a.risk === 'Severe' ? -1 : 1));

    // defaulters: Pending o Defaulter na lampas na sa scheduled date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const overdue = await ImmunizationRecord.find({
      status: { $in: ['Pending', 'Defaulter'] },
      scheduled_date: { $lt: today },
    })
      .populate('child_id', 'tcl_number child_name guardian_name guardian_contact')
      .sort({ scheduled_date: 1 })
      .lean();

    const defaulters = overdue
      .filter((r) => r.child_id)
      .map((r) => {
        const due = new Date(r.scheduled_date);
        due.setHours(0, 0, 0, 0);
        return {
          tcl_number: r.child_id.tcl_number,
          child_name: r.child_id.child_name,
          guardian_name: r.child_id.guardian_name,
          guardian_contact: r.child_id.guardian_contact,
          vaccine_name: r.vaccine_name,
          dose_number: r.dose_number,
          scheduled_date: r.scheduled_date,
          days_overdue: Math.round((today - due) / DAY),
        };
      });

    res.json({
      generated_at: new Date(),
      total_children: children.length,
      counts,
      at_risk: atRisk,
      defaulters,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;