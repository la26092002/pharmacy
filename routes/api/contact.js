const express = require('express');
const router = express.Router();
const Contact = require('../../models/Contact'); // Update the path if necessary
const nodemailer = require('nodemailer');
require('dotenv').config();

// @route POST /api/contact
// @desc  Create a new contact entry and send an email notification
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

    // Create transporter for sending email
    const transporter = nodemailer.createTransport({
      port: 465,
      host: "smtp.gmail.com",
      auth: {
        user: 'larbibenyakhou.info@gmail.com',
          pass: 'pwji maxd grmy kpvs',
      },
      secure: true,
    });

    const mailData = {
      from: "larbibenyakhou.info@gmail.com",
      to: "contact@elsaidaliya.com", // Email where you receive contact messages
      subject: 'New Contact Message from ELSAIDALIYA',
      html: `<p><b>Name:</b> ${name}</p>
             <p><b>Email:</b> ${email}</p>
             <p><b>Message:</b> ${message}</p>`
    };

    // Send email
    transporter.sendMail(mailData, function (err, info) {
      if (err) {
        console.error('Error sending email:', err);
      } else {
        console.log('Email sent:', info.response);
      }
    });

    res.status(201).json({
      message: 'Contact message successfully submitted!',
      contact: savedContact,
    });
  } catch (error) {
    console.error('Error saving contact message:', error);
    res.status(500).json({ error: 'Server error. Please try again later.' });
  }
});

module.exports = router;
