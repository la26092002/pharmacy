const express = require('express');
const router = express.Router();
const { check, validationResult } = require("express-validator");
const Product = require("../../models/Product");
const Actor1 = require("../../models/Actor");
const { uploadProduct, processPDF, convertToPDF,processPDF2 } = require('../../Functions/PdfFunctions');
const path = require('path');
const fs = require('fs');

require('dotenv').config();

router.get('/search-in-pdf', async (req, res) => {
    const { page = 0, size = 5, searchTerms, productName, date, id } = req.query; // Defaults for pagination and additional filters
    const limit = parseInt(size);
    const skip = parseInt(page) * limit;

    try {
        // Build the filter object
        const filter = {};
        if (productName) {
            filter.name = { $regex: productName, $options: 'i' }; // Case-insensitive search
        }

        // If the date query is true, filter for the last 24 hours
        if (date == 'true') {
            const now = new Date();
            const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            filter.date = { $gte: last24Hours, $lte: now };
        }

        if (id) {
            filter.actor = id; // Filter by actor ID
        }

        let matchingProducts = [];
        let totalItems;

        if (searchTerms) {
            // Convert the comma-separated search terms into an array
            const searchTermsArray = searchTerms.split(',').map(term => term.trim());

            // Fetch all products based on the filter
            const products = await Product.find(filter).populate('actor', 'nom prenom email category');

            // Loop through each product to search in the PDF content
            for (const product of products) {
                const filePath = path.join('pruductUploads', product.dataPdf);

                if (fs.existsSync(filePath)) {
                    // Extract text from the PDF and search for the terms
                    const { wordCounts } = await processPDF2(filePath, searchTermsArray, res);

                    // If any of the search terms are found, add the product to the matching list
                    if (Object.keys(wordCounts).length > 0) {
                        matchingProducts.push({
                            ...product.toObject(), // Convert Mongoose document to plain object
                            wordCounts, // Include the word counts for reference
                        });
                    }
                }
            }

            totalItems = matchingProducts.length;
        } else {
            // If no searchTerms are provided, fetch products like the '/' API
            totalItems = await Product.countDocuments(filter);

            const products = await Product.find(filter)
                .populate('actor', 'nom prenom email category') // Populate specific fields
                .skip(skip)
                .limit(limit);

            matchingProducts = products.map(product => product.toObject()); // Convert Mongoose documents to plain objects
        }

        // Apply pagination to the matching products
        const paginatedProducts = matchingProducts.slice(skip, skip + limit);

        // Return the paginated matching products
        res.json({
            success: true,
            data: paginatedProducts,
            totalItems,
            totalPages: Math.ceil(totalItems / limit),
            currentPage: parseInt(page),
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server Error' });
    }
});

/*

router.get('/search-in-pdf', async (req, res) => {
    const { searchTerms } = req.query; // Get the search terms from the query parameters

    if (!searchTerms) {
        return res.status(400).json({ error: 'Search terms are required' });
    }

    // Convert the comma-separated search terms into an array
    const searchTermsArray = searchTerms.split(',').map(term => term.trim());

    try {
        // Fetch all products
        const products = await Product.find().populate('actor', 'nom prenom email category');

        // Array to hold products that match the search terms
        const matchingProducts = [];

        // Loop through each product to search in the PDF content
        for (const product of products) {
            const filePath = path.join('pruductUploads', product.dataPdf);

            if (fs.existsSync(filePath)) {
                // Extract text from the PDF and search for the terms
                const { wordCounts } = await processPDF2(filePath, searchTermsArray, res);

                // If any of the search terms are found, add the product to the matching list
                if (Object.keys(wordCounts).length > 0) {
                    matchingProducts.push({
                        product,
                        wordCounts, // Include the word counts for reference
                    });
                }
            }
        }

        // Return the matching products
        res.json({
            success: true,
            data: matchingProducts,
            totalItems: matchingProducts.length,
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server Error' });
    }
});
*/




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

    console.log(fileName);

    const { name, actor } = req.body;
    const dataPdf = fileName;

    try {
        // Check if the actor exists
        //let existingActor = await Actor1.findOne({ id: actor });
        let existingActor = await Actor1.findOne({ _id: actor });
        if (!existingActor) {
            return res.status(400).json({ errors: [{ msg: "Actor does not exist" }] });
        }

        // Check if a product was already added today by this actor
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const existingProduct = await Product.findOne({
            actor,
            date: { $gte: startOfDay, $lte: endOfDay }
        });

        if (existingProduct) {
            return res.status(400).json({ error: "You can only add one product per day." });
        }

        // Create and save the new product
        let product = new Product({
            name, 
            actor, 
            dataPdf,
        });

        const createProduct = await product.save();
        res.json({ data: createProduct });
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



// GET: Fetch all products with pagination, optional search by productName, and optional last 24 hours filter
router.get('/', async (req, res) => {
    const { page = 0, size = 5, productName, date , id} = req.query; // Defaults for pagination and additional date query
    const limit = parseInt(size);
    const skip = parseInt(page) * limit;

    try {
        // Build the filter object
        const filter = {};
        if (productName) {
            filter.name = { $regex: productName, $options: 'i' }; // Case-insensitive search
        }

        
        // If the date query is true, filter for the last 24 hours
        if (date === 'true') {
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




// PUT: Update an existing product by ID
router.put('/:id', uploadProduct.single('file'), [
    check("name", "name is required").not().isEmpty(),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { name,  } = req.body;
    
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
            const newFilePath = path.join('pruductUploads', newFileName);

            // Delete the old file if it exists
            if (product.dataPdf) {
                const oldFilePath = path.join('pruductUploads', product.dataPdf);
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
        const product = await Product.findByIdAndDelete(productId);
        


       

        res.json({ msg: "Product `delete` field toggled" });
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: "Product not found" });
        }
        res.status(500).send('Server Error');
    }
});







module.exports = router;
