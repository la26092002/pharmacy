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

module.exports = router;
