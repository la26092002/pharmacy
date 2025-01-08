const express = require('express');
const router = express.Router();
const { check, validationResult } = require("express-validator");
const Offre = require("../../models/Offre");
const Actor1 = require("../../models/Actor");
const { uploadOffre, processPDF, convertToPDF } = require('../../Functions/PdfFunctions');
const path = require('path');
const fs = require('fs');

require('dotenv').config();

// POST: Add a new offre
router.post('/', uploadOffre.single('file'), [
    check("name", "Name is required").not().isEmpty(),
    check("actor", "Actor is required").not().isEmpty(),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const uploadedFile = req.file;
    const fileName = uploadedFile.filename; // Generated filename
    const filePath = path.join('offreUploads', fileName); // Full file path

    console.log(fileName);

    const { name, actor } = req.body;
    const dataPdf = fileName;

    try {
        // Check if the actor exists
        let existingActor = await Actor1.findOne({ id: actor });
        if (!existingActor) {
            return res.status(400).json({ errors: [{ msg: "Actor does not exist" }] });
        }

        // Check if an offre was already added today by this actor
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const existingOffre = await Offre.findOne({
            actor,
            createdAt: { $gte: startOfDay, $lte: endOfDay }
        });

        if (existingOffre) {
            return res.status(400).json({ error: "You can only add one offre per day." });
        }

        // Create and save the new offre
        let offre = new Offre({
            name, 
            actor, 
            dataPdf,
        });

        const createOffre = await offre.save();
        res.json({ data: createOffre });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});



// GET: Fetch all offres with pagination, optional search by offreName, actor ID, and optional last 24 hours filter
router.get('/', async (req, res) => {
    const { page = 0, size = 5, offreName, date, id } = req.query; // Defaults for pagination and additional date query
    const limit = parseInt(size);
    const skip = parseInt(page) * limit;

    try {
        // Build the filter object
        const filter = {};

        // If `offreName` is provided, add a case-insensitive search filter
        if (offreName) {
            filter.name = { $regex: offreName, $options: 'i' };
        }

        // If `id` is provided, filter by actor ID
        if (id) {
            filter.actor = id;
        }

        // If the `date` query is true, filter for the last 24 hours
        if (date == 'true') {
            const now = new Date();
            const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            filter.date = { $gte: last24Hours, $lte: now };
        }

        // Fetch total items count based on the filter
        const totalItems = await Offre.countDocuments(filter);

        // Fetch offres based on the filter, pagination, and population
        const offres = await Offre.find(filter)
            .populate('actor', 'nom prenom email category') // Populate specific fields
            .skip(skip)
            .limit(limit);

        res.json({
            success: true,
            data: offres,
            totalItems,
            totalPages: Math.ceil(totalItems / limit),
            currentPage: parseInt(page),
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server Error' });
    }
});


// GET: Download an offre PDF
router.get('/download', (req, res) => {
    const fileId = req.query.file;  // Get fileId from the query parameter
    const filePath = `./offreUploads/${fileId}`;  // Build the path using fileId

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'PDF file not found' });
    }

    res.download(filePath, `Offre.pdf`, (err) => {
        if (err) {
            return res.status(500).json({ error: 'Error: Unable to download the PDF file' });
        }
    });
});

// GET: Fetch a single offre by ID
router.get('/:id', async (req, res) => {
    try {
        const offre = await Offre.findById(req.params.id).populate('actor', 'nom prenom email category');
        if (!offre) {
            return res.status(404).json({ msg: 'Offre not found' });
        }
        res.json(offre);
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Offre not found' });
        }
        res.status(500).send('Server Error');
    }
});

module.exports = router;
