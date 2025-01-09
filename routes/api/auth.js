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



// @route    POST api/auth/email
// @desc     forget password and get token
// @access   Public
router.post(
  "/email",
  [
    check("email", "email is required").exists()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;

    try {
      let actor = await Actor1.findOne({ email: email });
      if (!actor) {
        return res.status(400).json({ errors: [{ msg: "User does not exist" }] });
      }


      // Generate a random 4-digit number
      const randomNumber = Math.floor(1000 + Math.random() * 9000);


      // Create payload for JWT
      const payload = {
        randomNumber,
        email, // Include email for reference in the token
      };

      // Sign the JWT with your secret key
      const token = jwt.sign(payload, "your_jwt_secret_key", {
        expiresIn: "1h", // Token expiry time
      });

      var nodemailer = require('nodemailer');
      // create reusable transporter object using the default SMTP transport
      const transporter = nodemailer.createTransport({
        port: 465,               // true for 465, false for other ports
        host: "smtp.gmail.com",
        auth: {
          user: 'larbibenyakhou.info@gmail.com',
          pass: 'pwji maxd grmy kpvs',
        },
        secure: true,
      });

      const mailData = {
        from: 'larbibenyakhou.info@gmail.com',  // sender address
        to: email,   // list of receivers
        subject: 'Sending Email from ELSAIDALIYA',
        text: 'That was easy!',
        html: `<b>Hey there! </b><br> This is yout code : ${randomNumber}<br/>`,
      };

      transporter.sendMail(mailData, function (err, info) {
        if (err)
          console.log(err)
        else
          console.log(info);
      });

      // Return the token
      res.json({ token });

    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  }
);

// @route    POST api/auth/validate
// @desc     Validate token and reset password
// @access   Public
router.post("/validate", async (req, res) => {
  const token = req.header("Authorization");
  const { number, newPassword } = req.body;

  // Check if token is provided
  if (!token) {
    return res.status(401).json({ errors: [{ msg: "No token, authorization denied" }] });
  }

  // Check if the number and newPassword are provided
  if (!number || !newPassword) {
    return res.status(400).json({ errors: [{ msg: "Number and new password are required" }] });
  }

  try {
    // Verify the token
    const decoded = jwt.verify(token, "your_jwt_secret_key");

    // Check if the number matches
    if (decoded.randomNumber !== number) {
      return res.status(400).json({ success: false, message: "Validation failed. Invalid code." });
    }

    // Find the actor by email
    const actor = await Actor1.findOne({ email: decoded.email });
    if (!actor) {
      return res.status(400).json({ errors: [{ msg: "User not found" }] });
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update the user's password
    actor.password = hashedPassword;
    await actor.save();

    res.json({ success: true, message: "Password reset successful" });
  } catch (err) {
    console.error(err.message);
    res.status(401).json({ errors: [{ msg: "Token is not valid" }] });
  }
});


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
      let actor = await Actor1.findOne({ telephone: numberPhone });
      if (!actor) {
        return res.status(400).json({ errors: [{ msg: "User does not exist" }] });
      }


      if (!actor.status) {
        console.log(actor.status)
        return res.status(400).json({ errors: [{ msg: "User does not have access" }] });
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
            category: actor.category,
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

// <MenuItem value="Pharmacien">Pharmacien</MenuItem>
//<MenuItem value="Fournisseur">Fournisseur</MenuItem>

// @route    GET api/actors
// @desc     Fetch all actors with pagination and optional filters for willaya and nom
// @access   Public
router.get('/', async (req, res) => {
  const { page = 0, size = 5, willaya, nom, category } = req.query; // Default pagination values
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
    if (category) {
      filter.category = { $regex: category, $options: 'i' }; // Case-insensitive search
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



// @route    PUT api/actors/update/:id
// @desc     Update selected actor's information
// @access   Private
router.put('/update/:id', async (req, res) => {
  const { id } = req.params; // Get actor ID from URL parameters
  const {
    nom,
    prenom,
    telephone,
    email,
    willaya,
    category,
    dataPdf,
    password,
    status,
    subscribes,
  } = req.body;

  try {
    // Find the actor by ID
    let actor = await Actor1.findById(id);

    // If actor not found
    if (!actor) {
      return res.status(404).json({ msg: 'Actor not found' });
    }

    // Check if the provided phone number already exists (excluding the current actor)
    if (telephone && telephone !== actor.telephone) {
      const existingPhone = await Actor1.findOne({ telephone });
      if (existingPhone) {
        return res.status(400).json({ msg: 'Phone number already exists' });
      }
    }

    // Check if the provided email already exists (excluding the current actor)
    if (email && email !== actor.email) {
      const existingEmail = await Actor1.findOne({ email });
      if (existingEmail) {
        return res.status(400).json({ msg: 'Email already exists' });
      }
    }

    // Conditionally update the actor's fields if they are provided in the request body
    if (nom) actor.nom = nom;
    if (prenom) actor.prenom = prenom;
    if (telephone) actor.telephone = telephone;
    if (email) actor.email = email;
    if (willaya) actor.willaya = willaya;
    if (category) actor.category = category;
    if (dataPdf) actor.dataPdf = dataPdf;

    // If password is provided, hash and update it
    if (password) {
      const salt = await bcrypt.genSalt(10);
      actor.password = await bcrypt.hash(password, salt);
    }

    if (status !== undefined) actor.status = status; // Update status only if provided
    if (subscribes) actor.subscribes = subscribes;

    // Save the updated actor
    await actor.save();

    // Send the updated actor data as a response
    res.json({ msg: 'Actor updated successfully', actor });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});



// @route    PUT api/auth/update-pdf/:id
// @desc     Update the PDF for a specific actor
// @access   Private
router.put('/update-pdf/:id', upload.single('file'), async (req, res) => {
  const { id } = req.params;  // Get actor ID from URL parameters

  // Check if file is uploaded
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



  const dataPdf = fileName;

  try {
    // Find the actor by ID
    let actor = await Actor1.findById(id);

    // If actor not found
    if (!actor) {
      return res.status(404).json({ msg: 'Actor not found' });
    }

    // Update the actor's PDF data field with the new file name
    actor.dataPdf = dataPdf;

    // Save the updated actor information
    const Actorr = await actor.save();

    // Respond with the updated actor data
    res.json({ msg: 'PDF updated successfully', _id : Actorr.id });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});



// @route    GET /api/auth/Data/:id
// @desc     Get actor's data by ID
// @access   Public
router.get('/Data/:id', async (req, res) => {
  const { id } = req.params;  // Get actor ID from the URL parameter

  try {
    // Find the actor by ID and exclude the password field
    let actor = await Actor1.findById(id).select('-password');
    if (!actor) {
      return res.status(404).json({ msg: 'Actor not found' });
    }

    // Return the actor's data
    res.json({
      success: true,
      actor
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});


module.exports = router;
