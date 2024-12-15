const express = require('express');
const router = express.Router();
const { check, validationResult } = require("express-validator");
const Product = require("../../models/Product");
const Actor1 = require("../../models/Actor");
const { uploadProduct, processPDF, convertToPDF } = require('../../Functions/PdfFunctions');
const path = require('path');
const fs = require('fs');

require('dotenv').config();

router.post('/', uploadProduct.single('file'), [
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
    const filePath = path.join('pruductUploads', fileName); // Full file path
    //const fileData = fs.readFileSync(filePath); // Read the file

    console.log(fileName)
   

    const { name, actor } = req.body;
    const dataPdf = fileName;

    try {
        let existingActor = await Actor1.findOne({ id: actor });
        if (!existingActor) {
          return res.status(400).json({ errors: [{ msg: "Actor already exists" }] });
        }

        let product = new Product({
          name, actor, dataPdf,
        });

        const createProduct = await product.save();
        res.json({data:createProduct});
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


/*
router.get('/', async (req, res) => {
  try {
      const products = await Product.find().populate('actor', 'nom prenom email category'); // Populate specific fields
      res.json(products);
  } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
  }
});
 */



// GET: Fetch all products with pagination and optional search by productName
router.get('/', async (req, res) => {
    const { page = 0, size = 5, productName } = req.query; // Defaults for pagination
    const limit = parseInt(size);
    const skip = parseInt(page) * limit;
  
    try {
        // Build the filter object
        const filter = {};
        if (productName) {
            filter.name = { $regex: productName, $options: 'i' }; // Case-insensitive search
        }
  
        // Fetch total items count based on the filter
        const totalItems = await Product.countDocuments(filter);
  
        // Fetch products based on the filter, pagination, and population
        const products = await Product.find(filter)
            .populate('actor', 'nom prenom email category') // Populate specific fields
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
  


router.get('/download', (req, res) => {
  //const filePath = `./pruductUploads/1731543273465_CV_ElhadjLarbi.pdf`;

  const fileId = req.query.file;  // Get fileId from the query parameter
  const filePath = `./pruductUploads/${fileId}`;  // Build the path using fileId

  if (!fs.existsSync(filePath)) {
      const notFoundError = new CustomError(404, 'PDF file not found');
      return next(notFoundError);
  }

  res.download(filePath, `Product.pdf`, (err) => {
      if (err) {
          const downloadError = new CustomError(500, 'Error: Unable to download the PDF file');
          return next(downloadError);
      }
  });


});

router.get('/:id', async (req, res) => {
  try {
      const product = await Product.findById(req.params.id).populate('actor', 'nom prenom email category');
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






module.exports = router;
