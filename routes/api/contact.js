const express = require('express');
const router = express.Router();
const Contact = require('../../models/Contact'); // Update the path if necessary

// @route POST /api/contact
// @desc  Create a new contact entry
// @access Public
router.post('/', async (req, res) => {
  const { name, email, message } = req.body;

  // Validate input
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'All fields are required!' });
  }

  try {
    // Save contact entry to the database
    const newContact = new Contact({ name, email, message });
    const savedContact = await newContact.save();

    res.status(201).json({
      message: 'Contact message successfully submitted!',
      contact: savedContact,
    });
  } catch (error) {
    console.error('Error saving contact message:', error);
    res.status(500).json({ error: 'Server error. Please try again later.' });
  }
});

// @route GET /api/contact
// @desc  Get all contact messages
// @access Public (Restrict access in production)
router.get('/', async (req, res) => {
  try {
    const contacts = await Contact.find().sort({ date: -1 });
    res.status(200).json(contacts);
  } catch (error) {
    console.error('Error fetching contact messages:', error);
    res.status(500).json({ error: 'Server error. Please try again later.' });
  }
});

module.exports = router;
