const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CommandOfferSchema = new mongoose.Schema(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: 'actor',
            required: true
        },
        offers: [
            {
                type: Schema.Types.ObjectId,
                ref: 'offre',
                required: true
            }
        ],
        status: {
            type: String,
            enum: ['pending', 'confirmed', 'canceled'],
            default: 'pending'
        }
    },
    { timestamps: true }
);

// Creating indexes
CommandOfferSchema.index({ user: 1 }); // Index on 'user' field
CommandOfferSchema.index({ offers: 1 }); // Index on 'offers' field

module.exports = mongoose.model('CommandOffer', CommandOfferSchema);
