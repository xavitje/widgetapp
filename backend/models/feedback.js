const mongoose = require('mongoose');

const FeedbackSchema = new mongoose.Schema({
    message: {
        type: String,
        required: true,
    },
    customerId: {
        type: String, 
        required: true 
    },
    screenshotUrl: {
        type: String,
        default: null,
    },
    url: {
        type: String,
        required: true,
    },
    userAgent: {
        type: String,
    },
    date: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('feedback', FeedbackSchema);
