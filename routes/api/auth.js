const express = require('express');
const router = express.Router();
const { check, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Actor1 = require("../../models/Actor");


const fs = require('fs');
const path = require('path');
const { upload, processFileData, processPDF, convertToPDF } = require('../../Functions/PdfFunctions');



require('dotenv').config();


// @route    POST api/auth
// @desc     Authenticate user and get token
// @access   Public
router.post(
  "/",
  [
    check("numberPhone", "Please include a valid phone number").isMobilePhone(),
    check("password", "Password is required").exists()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { numberPhone, password } = req.body;

    try {
      let actor = await Actor1.findOne({ telephone:numberPhone });
      if (!actor) {
        return res.status(400).json({ errors: [{ msg: "User does not exist" }] });
      }

      const isMatch = await bcrypt.compare(password, actor.password);
      if (!isMatch) {
        return res.status(400).json({ errors: [{ msg: "Incorrect password" }] });
      }

      const payload = {
        actor: {
          id: actor.id,
          category: actor.category,
          status: actor.status
        }
      };



      jwt.sign(
        payload,
        process.env.JWT_SECRET || "mysecrettoken", // Token expiration (optional)
        (err, token) => {
          if (err) throw err;
          res.status(200).json({
            category:actor.category,
            token,
            msg: "Log in successful",
            name: actor.name,
            id: actor.id,
            numberPhone: actor.telephone,
            email: actor.email
          });
        }
      );
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  }
);

// @route    POST api/register
// @desc     Register user
// @access   Public
router.post(
  "/register", upload.single('file'),
  [
    check("nom", "Name is required").not().isEmpty(),
    check("prenom", "Prenom is required").not().isEmpty(),
    check("willaya", "willaya is required").not().isEmpty(),
    check("category", "category is required").not().isEmpty(),
    check("telephone", "Please include a valid phone number").isMobilePhone(),
    check("email", "Please include a valid email").isEmail(),
    check("password", "Password must be 6 or more characters").isLength({ min: 6 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const uploadedFile = req.file;
    const fileName = uploadedFile.filename; // Generated filename
    const filePath = path.join('authUploads', fileName); // Full file path
    const fileData = fs.readFileSync(filePath); // Read the file

    // Processing the file (PDF or converting)
    if (uploadedFile.mimetype === 'application/pdf') {
      await processPDF(filePath, res); // Process PDF directly
    } else {
      const convertedFilePath = await convertToPDF(filePath); // Convert file to PDF
      await processPDF(convertedFilePath, res); // Process converted PDF
    }


    const { nom, prenom, telephone, email, willaya, category, password } = req.body;

    const dataPdf = fileName;
    try {
      let existingUserByPhone = await Actor1.findOne({ telephone });
      let existingUserByEmail = await Actor1.findOne({ email });

      if (existingUserByPhone || existingUserByEmail) {
        return res.status(400).json({ errors: [{ msg: "User already exists" }] });
      }

      let actor = new Actor1({
        nom, prenom, telephone, email, willaya, category, dataPdf, password
      });

      const salt = await bcrypt.genSalt(10);
      actor.password = await bcrypt.hash(password, salt);

      await actor.save();

      const payload = {
        actor: {
          id: actor.id,
          category: actor.category,
          status: actor.status
        }
      };


      //const statusCode = actor.status ? 200 : 403;

      jwt.sign(
        payload,
        process.env.JWT_SECRET || "mysecrettoken",
        { expiresIn: '1h' },
        (err, token) => {
          if (err) throw err;
          res.status(200).json({
            msg: "Registration successful",
            token
          });
        }
      );
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ error: "Server error" });
    }
  }
);


// @route    GET api/actors
// @desc     Fetch all actors with pagination and optional filters for willaya and nom
// @access   Public
router.get('/', async (req, res) => {
  const { page = 0, size = 5, willaya, nom } = req.query; // Default pagination values
  const limit = parseInt(size); // Number of items per page
  const skip = parseInt(page) * limit; // Items to skip for the current page

  try {
      // Build the filter object based on query parameters
      const filter = {};
      if (willaya) {
          filter.willaya = { $regex: willaya, $options: 'i' }; // Case-insensitive search for willaya
      }
      if (nom) {
          filter.nom = { $regex: nom, $options: 'i' }; // Case-insensitive search for nom
      }

      // Fetch the total number of actors matching the filter
      const totalItems = await Actor1.countDocuments(filter);

      // Fetch actors with pagination and optional filters
      const actors = await Actor1.find(filter)
          .skip(skip)
          .limit(limit);

      // Send the response with the paginated data
      res.json({
          success: true,
          data: actors,
          totalItems,
          totalPages: Math.ceil(totalItems / limit),
          currentPage: parseInt(page),
      });
  } catch (err) {
      console.error(err.message);
      res.status(500).json({ error: 'Server Error' });
  }
});


// Download PDF for actor's profile
router.get('/download', (req, res) => {
  const fileId = req.query.file;  // Get fileId from the query parameter
  const filePath = path.join('authUploads', fileId);  // Build the path using fileId

  // Check if the file exists
  if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'PDF file not found' });
  }

  // Send the file for download
  res.download(filePath, (err) => {
      if (err) {
          console.error(err);
          return res.status(500).json({ error: 'Unable to download the PDF file' });
      }
  });
});



module.exports = router;
