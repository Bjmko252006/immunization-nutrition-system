require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { protect, requireRole } = require('./middleware/auth');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Immunization & Nutrition API is running' });
});

// Mga patakaran ng role (ayon sa Chapter 5):
// - BHW lang ang nagdaragdag ng bakuna at nagmamarka na naibigay na
// - BNS lang ang nagpapasok ng OPT+ measurement at nakakakita ng reports
// - Pareho ang may access sa TCL at defaulter list
app.post('/api/immunizations', protect, requireRole('BHW'));
app.put('/api/immunizations/:id/administer', protect, requireRole('BHW'));
app.post('/api/nutrition', protect, requireRole('BNS'));
app.use('/api/reports', protect, requireRole('BNS'));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/children', require('./routes/children'));
app.use('/api/immunizations', require('./routes/immunizations'));
app.use('/api/nutrition', require('./routes/nutrition'));
app.use('/api/reports', require('./routes/reports'));

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });