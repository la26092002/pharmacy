const express = require('express');
const router = express.Router();
const { check, validationResult } = require("express-validator");
const Product = require("../../models/ProductCota");
const Actor1 = require("../../models/Actor");
const { uploadCotaProduct, processPDF, convertToPDF } = require('../../Functions/PdfFunctions');
const path = require('path');
const fs = require('fs');

require('dotenv').config();
// POST: Create a new product
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

    console.log(fileName);

    const { name, actor } = req.body;
    const dataPdf = fileName;

    try {
        // Check if the actor exists
        let existingActor = await Actor1.findOne({ _id: actor });
        if (!existingActor) {
            return res.status(403).json({ errors: [{ msg: "Actor does not exist" }] });
        }

        // Create and save the new product
        let product = new Product({
            name, 
            actor, 
            dataPdf
        });

        const createProduct = await product.save();
        res.json(createProduct);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});



// GET: Fetch all products with pagination and optional last 24 hours filter
router.get('/', async (req, res) => {
    const { page = 0, size = 5, date ,id} = req.query; // Defaults for pagination and additional date query
    const limit = parseInt(size);
    const skip = parseInt(page) * limit;
  
    try {
        // Build the filter object
        const filter = {};
  
        // If the date query is true, filter for the last 24 hours
        if (date == 'true') {
            const now = new Date();
            const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            filter.date = { $gte: last24Hours, $lte: now };
        }

        if (id) {
            filter.actor = id; // Filter by actor ID
        }
  
        // Fetch total items count based on the filter
        const totalItems = await Product.countDocuments(filter);
  
        // Fetch products based on the filter, pagination, and population
        const products = await Product.find(filter)
            .populate('actor', 'nom prenom email category telephone') // Populate specific fields
            .skip(skip)
            .limit(limit);
  
        res.json({
            success: true,
            data: products,
            totalItems,
            totalPages: Math.ceil(totalItems / limit),
            currentPage: parseInt(page),
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server Error' });
    }
  });


// GET: Download PDF
router.get('/download', (req, res) => {
  const fileId = req.query.file;  // Get fileId from the query parameter
  const filePath = `./pruductCotaUploads/${fileId}`;  // Build the path using fileId

  if (!fs.existsSync(filePath)) {
      const notFoundError = new CustomError(404, 'PDF file not found');
      return next(notFoundError);
  }

  res.download(filePath, `1731543273465_CV_ElhadjLarbi.pdf`, (err) => {
      if (err) {
          const downloadError = new CustomError(500, 'Error: Unable to download the PDF file');
          return next(downloadError);
      }
  });
});

// GET: Fetch a product by ID
router.get('/:id', async (req, res) => {
  try {
      const product = await Product.findById(req.params.id).populate('actor', 'nom prenom email category telephone');
      if (!product) {
          return res.status(404).json({ msg: 'Product not found' });
      }
      res.json(product);
  } catch (err) {
      console.error(err.message);
      if (err.kind === 'ObjectId') {
          return res.status(404).json({ msg: 'Product not found' });
      }
      res.status(500).send('Server Error');
  }
});




// PUT: Update an existing product by ID
router.put('/:id', uploadCotaProduct.single('file'), [
    check("name", "name is required").not().isEmpty(),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { name } = req.body;
    const productId = req.params.id;

    try {
        // Check if the product exists
        let product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ msg: "Product not found" });
        }

        // If a new file is uploaded, replace the existing file
        if (req.file) {
            const uploadedFile = req.file;
            const newFileName = uploadedFile.filename;
            const newFilePath = path.join('pruductCotaUploads', newFileName);

            // Delete the old file if it exists
            if (product.dataPdf) {
                const oldFilePath = path.join('pruductCotaUploads', product.dataPdf);
                if (fs.existsSync(oldFilePath)) {
                    fs.unlinkSync(oldFilePath);
                }
            }

            // Update the file path in the product
            product.dataPdf = newFileName;
        }

        // Update the product fields
        product.name = name;

        // Save the updated product
        const updatedProduct = await product.save();
        res.json(updatedProduct);
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: "Product not found" });
        }
        res.status(500).send('Server Error');
    }
});



// PUT: Toggle the `delete` field of a product by ID
router.put('/toggle-delete/:id', async (req, res) => {
    try {
        const productId = req.params.id;

        // Find the product by ID
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ msg: "Product not found" });
        }

        // Toggle the `delete` field
        product.delete = !product.delete;

        // Save the updated product
        const updatedProduct = await product.save();

        res.json({ msg: "Product `delete` field toggled", product: updatedProduct });
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: "Product not found" });
        }
        res.status(500).send('Server Error');
    }
});


module.exports = router;
