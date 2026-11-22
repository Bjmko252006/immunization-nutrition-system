const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    full_name: { type: String, required: true, trim: true, maxlength: 100 },
    role: { type: String, enum: ['BNS', 'BHW'], required: true },
    username: { type: String, required: true, unique: true, trim: true, maxlength: 30 },
    password_hash: { type: String, required: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

module.exports = mongoose.model('User', userSchema);