const express = require('express');
const router = express.Router();
const { check, validationResult } = require("express-validator");
const Product = require("../../models/Product");
const Actor1 = require("../../models/Actor");
const { uploadCotaProduct, processPDF, convertToPDF } = require('../../Functions/PdfFunctions');
const path = require('path');
const fs = require('fs');

require('dotenv').config();

router.post('/', uploadCotaProduct.single('file'), [
    check("name", "name is required").not().isEmpty(),
    check("actor", "actor is required").not().isEmpty(),
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
    const filePath = path.join('pruductCotaUploads', fileName); // Full file path

    console.log(fileName)
   

    const { name, actor } = req.body;
    const dataPdf = fileName;

    try {
        let existingActor = await Actor1.findOne({ id: actor });
        if (!existingActor) {
          return res.status(400).json({ errors: [{ msg: "Actor already exists" }] });
        }

        let product = new Product({
          name, actor, dataPdf
        });

        const createProduct = await product.save();
        res.json(createProduct);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
