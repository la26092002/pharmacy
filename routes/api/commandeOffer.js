const express = require('express');
const router = express.Router();
const CommandOffer = require('./../../models/CommandOffer');

// Create a new CommandOffer
router.post('/', async (req, res) => {
    try {
        const { user, offers } = req.body;
        const newCommandOffer = new CommandOffer({ user, offers });
        await newCommandOffer.save();
        res.status(201).json(newCommandOffer);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all CommandOffers
router.get('/', async (req, res) => {
    try {
        const commandOffers = await CommandOffer.find().populate('user').populate('offers');
        res.status(200).json(commandOffers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update offers if status is not confirmed
router.put('/offers/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { offers } = req.body;
        const commandOffer = await CommandOffer.findById(id);
        
        if (!commandOffer) {
            return res.status(404).json({ message: 'CommandOffer not found' });
        }
        
        if (commandOffer.status === 'confirmed') {
            return res.status(400).json({ message: 'Cannot update offers when status is confirmed' });
        }

        commandOffer.offers = offers;
        await commandOffer.save();
        res.status(200).json(commandOffer);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update status
router.put('/status/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        if (!['pending', 'confirmed', 'canceled'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status value' });
        }
        
        const commandOffer = await CommandOffer.findByIdAndUpdate(
            id,
            { status },
            { new: true }
        );
        
        if (!commandOffer) {
            return res.status(404).json({ message: 'CommandOffer not found' });
        }
        
        res.status(200).json(commandOffer);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
