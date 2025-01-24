const express = require('express');
const router = express.Router();
const { check, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Actor1 = require("../../models/Actor");


const fs = require('fs');
const path = require('path');
const { uploadImage, upload, processFileData, processPDF, convertToPDF } = require('../../Functions/PdfFunctions');
const multer = require('multer');



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

      // Check if the subscription is still valid
      const now = new Date();
      if (new Date(actor.subscribes) < now) {
        return res.status(400).json({ errors: [{ msg: "Subscription has expired. Please renew your subscription." }] });
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

    // Ensure a file was uploaded
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const uploadedFile = req.file;

    // Validate that the uploaded file is an image
    if (!uploadedFile.mimetype.startsWith('image/')) {
      return res.status(400).json({ error: 'Uploaded file is not an image' });
    }

    const fileName = uploadedFile.filename;

    let { nom, prenom, telephone, email, willaya, category, password } = req.body;
    const imageFileName = fileName; // Store the image filename

    if (!prenom) {
      prenom = " "; // Now this is allowed
    }

    try {
      let existingUserByPhone = await Actor1.findOne({ telephone });
      let existingUserByEmail = await Actor1.findOne({ email });

      if (existingUserByPhone || existingUserByEmail) {
        return res.status(400).json({ errors: [{ msg: "User already exists" }] });
      }

      // Create a new actor with image file reference instead of PDF
      let actor = new Actor1({
        nom,
        prenom,
        telephone,
        email,
        willaya,
        category,
        dataPdf: imageFileName,  // You might consider renaming this field to something like "profileImage"
        password
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
// Download PDF for actor's profile
router.get('/downloadlogos', (req, res) => {
  const fileId = req.query.file;  // Get fileId from the query parameter
  const filePath = path.join('uploads/logos', fileId);  // Build the path using fileId

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
// Update actor's information including image file update
router.put(
  '/update/:id', // Middleware to handle single file upload with field name 'file'
  async (req, res) => {
    const { id } = req.params;
    const {
      nom,
      prenom,
      telephone,
      email,
      willaya,
      category,
      password,
      status,
      subscribes, 
      nomSociete
      // Notice we're not destructuring dataPdf from req.body
    } = req.body;

    try {
      // Find the actor by ID
      let actor = await Actor1.findById(id);
      if (!actor) {
        return res.status(404).json({ msg: 'Actor not found' });
      }

      // Check for duplicate phone or email conditions (if updating those fields)
      if (telephone && telephone !== actor.telephone) {
        const existingPhone = await Actor1.findOne({ telephone });
        if (existingPhone) return res.status(400).json({ msg: 'Phone number already exists' });
      }
      if (email && email !== actor.email) {
        const existingEmail = await Actor1.findOne({ email });
        if (existingEmail) return res.status(400).json({ msg: 'Email already exists' });
      }

      // Update fields if provided
      if (nom) actor.nom = nom;
      if (prenom) actor.prenom = prenom;
      if (telephone) actor.telephone = telephone;
      if (email) actor.email = email;
      if (willaya) actor.willaya = willaya;
      if (category) actor.category = category;
      if (nomSociete) actor.nomSociete = nomSociete;
      

      
      // If no file is uploaded, preserve the existing dataPdf

      // Update password if provided
      if (password) {
        const salt = await bcrypt.genSalt(10);
        actor.password = await bcrypt.hash(password, salt);
      }

      if (status !== undefined) actor.status = status;
      if (subscribes) actor.subscribes = subscribes;

      // Save updated actor
      await actor.save();

      res.json({ msg: 'Actor updated successfully', actor });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);





router.put(
  '/update-image/:id',
  upload.single('file'), 
  async (req, res) => {
    const { id } = req.params;

    // Check if a file was uploaded
    if (!req.file) {
      return res.status(400).json({ msg: 'No file uploaded' });
    }

    // Validate that the uploaded file is an image
    if (!req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({ msg: 'Uploaded file is not an image' });
    }

    
    if (!req.file.filename) {
      return res.status(400).json({ msg: 'No filename uploaded' });
    }
    try {
      // Use findByIdAndUpdate with $set to update only the dataPdf field
      const updatedActor = await Actor1.findByIdAndUpdate(
        id,
        { $set: { dataPdf: req.file.filename} },
        { new: true }  // Return the updated document
      );

      if (!updatedActor) {
        return res.status(404).json({ msg: 'Actor not found' });
      }

      res.json({ 
        msg: 'Image updated successfully', 
        dataPdf: updatedActor.dataPdf 
      });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);





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




// @route    PUT api/auth/update-subscribe/:id
// @desc     Update the subscribes date for a specific actor
// @access   Private
router.put('/update-subscribe/:id', async (req, res) => {
  const { id } = req.params; // Get actor ID from the URL parameter
  const { subscribes } = req.body; // Get the new subscription date from the request body

  // Validate that a date is provided
  if (!subscribes) {
    return res.status(400).json({ msg: 'Subscribes date is required' });
  }

  try {
    // Find the actor by ID
    let actor = await Actor1.findById(id);

    // If actor not found
    if (!actor) {
      return res.status(404).json({ msg: 'Actor not found' });
    }

    // Update the subscribes field
    actor.subscribes = new Date(subscribes);

    // Save the updated actor
    await actor.save();

    // Respond with success and updated actor data
    res.json({ msg: 'Subscribes date updated successfully', actor });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});



// Configure multer storage for logos
const storagedddd = multer.diskStorage({
  destination: function(req, file, cb) {
      cb(null, 'uploads/logos'); // Ensure this directory exists
  },
  filename: function(req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const uploadddd = multer({ storage: storagedddd });

// @route    PUT /api/auth/update-logo/:id
// @desc     Update actor's logo image
// @access   Private
router.put('/update-logo/:id', uploadddd.single('file'), async (req, res) => {
  const { id } = req.params;

  try {
      let actor = await Actor1.findById(id);
      if (!actor) {
          return res.status(404).json({ error: 'Actor not found' });
      }

      if (!req.file) {
          return res.status(400).json({ error: 'No file uploaded' });
      }

      // Update the logo field with the filename
      actor.logo = req.file.filename;

      await actor.save();

      res.json({ success: true, logo: actor.logo });
  } catch (error) {
      console.error('Error updating logo:', error);
      res.status(500).json({ error: 'Server error' });
  }
});



























module.exports = router;
