const mongoose = require('mongoose');

const smsLogSchema = new mongoose.Schema({
  record_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ImmunizationRecord', required: true },
  recipient_number: { type: String, required: true, match: /^\+639\d{9}$/ },
  message_body: { type: String, required: true, maxlength: 160 },
  twilio_sid: { type: String, unique: true, sparse: true },
  delivery_status: {
    type: String,
    enum: ['Queued', 'Sent', 'Delivered', 'Failed'],
    required: true,
  },
  sent_at: { type: Date, default: Date.now, required: true },
});

module.exports = mongoose.model('SmsLog', smsLogSchema);