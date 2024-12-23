const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../../models/Admin'); // Adjust the path to your Admin model
const router = express.Router();

// Replace with your secret key for JWT
const JWT_SECRET = 'your_jwt_secret_key';

// Admin Registration
router.post('/register', async (req, res) => {
    const { name, email, password, numberPhone } = req.body;

    if (!name || !email || !password || !numberPhone) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    try {
        const existingAdmin = await Admin.findOne({ email });
        const existingAdmin2 = await Admin.findOne({ numberPhone });
        if (existingAdmin || existingAdmin2) {
            return res.status(400).json({ message: 'Admin already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newAdmin = new Admin({
            name,
            email,
            password: hashedPassword,
            numberPhone,
        });

        await newAdmin.save();

        res.status(201).json({ message: 'Admin registered successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
});

// Admin Login
router.post('/login', async (req, res) => {
    const { numberPhone, password } = req.body;

    if (!numberPhone || !password) {
        return res.status(400).json({ message: 'Phone Number and password are required' });
    }

    try {
        const admin = await Admin.findOne({ numberPhone });
        if (!admin) {
            return res.status(404).json({ message: 'Admin not found' });
        }

        const isPasswordValid = await bcrypt.compare(password, admin.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: admin._id, numberPhone: admin.numberPhone },
            JWT_SECRET,
            { expiresIn: '1h' } // Token expires in 1 hour
        );

        res.status(200).json({ message: 'Login successful', token });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
});

module.exports = router;