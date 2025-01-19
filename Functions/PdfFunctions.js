

const PDFParser = require('pdf-parse');
const fs = require('fs');
const multer = require('multer');
const path = require('path');
const mammoth = require('mammoth');
const pdf = require('html-pdf');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'authUploads/');
    },
    filename: (req, file, cb) => {
      const originalName = path.parse(file.originalname).name; // Get name without extension
      const timestamp = Date.now(); // Current timestamp
      const extension = path.extname(file.originalname); // File extension
      const newFilename = `${timestamp}_${originalName}${extension}`; // New file name with timestamp prefix
      cb(null, newFilename);
    },
  });
  
  const upload = multer({ storage });

  const storageProduct = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'pruductUploads/');
    },
    filename: (req, file, cb) => {
      const originalName = path.parse(file.originalname).name; // Get name without extension
      const timestamp = Date.now(); // Current timestamp
      const extension = path.extname(file.originalname); // File extension
      const newFilename = `${timestamp}_${originalName}${extension}`; // New file name with timestamp prefix
      cb(null, newFilename);
    },
  });
  
  const uploadProduct = multer({ storage:storageProduct });

  const storageCotaProduct = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'pruductCotaUploads/');
    },
    filename: (req, file, cb) => {
      const originalName = path.parse(file.originalname).name; // Get name without extension
      const timestamp = Date.now(); // Current timestamp
      const extension = path.extname(file.originalname); // File extension
      const newFilename = `${timestamp}_${originalName}${extension}`; // New file name with timestamp prefix
      cb(null, newFilename);
    },
  });
  
  const uploadCotaProduct = multer({ storage:storageCotaProduct });


  const storageOffre = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'OffreUploads/');
    },
    filename: (req, file, cb) => {
      const originalName = path.parse(file.originalname).name; // Get name without extension
      const timestamp = Date.now(); // Current timestamp
      const extension = path.extname(file.originalname); // File extension
      const newFilename = `${timestamp}_${originalName}${extension}`; // New file name with timestamp prefix
      cb(null, newFilename);
    },
  });
  
  const uploadOffre = multer({ storage:storageOffre });
  
  
  // Function to process the file data (perform your file processing logic here)
  function processFileData(fileData) {
    fs.writeFile('output.txt', fileData, (err) => {
      if (err) {
        console.error('Error writing file:', err);
      } else {
        console.log('File written successfully');
      }
    });
  }

  
  
  // Function to process the PDF and count word occurrences
  async function processPDF(pdfFilePath, res) {
    try {
      // Parse the PDF content
      const pdfBuffer = fs.readFileSync(pdfFilePath);
      const data = await PDFParser(pdfBuffer);
      const pdfText = data.text;
  
      // Define the words to search and their initial count
      const technologies = ['Node.js', 'React.js', 'Angular', 'Vue.js', 'JavaScript', 'TypeScript', 'HTML', 'CSS', 'Sass', 'Bootstrap', 'jQuery', 'Python', 'Java', 'Ruby', 'Go', 'PHP', 'Swift', 'Kotlin', 'Rust', 'SQL', 'MongoDB', 'Firebase', 'AWS', 'Azure', 'Docker', 'Kubernetes', 'Git', 'GitHub', 'Jenkins', 'CI/CD', 'REST API', 'GraphQL', 'OAuth', 'JSON', 'XML', 'Microservices', 'Artificial Intelligence', 'Machine Learning', 'Data Science', 'Big Data', 'Blockchain'];
      let wordCounts = {};
  
      // Count the occurrences of each search word
      technologies.forEach((word) => {
        const regex = new RegExp(word, 'gi');
        const count = (pdfText.match(regex) || []).length;
        wordCounts[word] = count;
      });
  
      // Return the word counts as the response
      wordCounts = Object.fromEntries(Object.entries(wordCounts).filter(([key, value]) => value !== 0));
      return { wordCounts };
    } catch (error) {
      console.error('An error occurred while processing the PDF:', error);
      res.status(500).json({ error: 'Failed to process the PDF' });
    } finally {
      // Clean up - delete the uploaded file and PDF file if needed
    }
  }


  // Function to process the PDF and count word occurrences
async function processPDF2(pdfFilePath, searchTerms, res) {
  try {
      // Parse the PDF content
      const pdfBuffer = fs.readFileSync(pdfFilePath);
      const data = await PDFParser(pdfBuffer);
      const pdfText = data.text;

      // Define the words to search and their initial count
      let wordCounts = {};

      // Count the occurrences of each search word
      searchTerms.forEach((word) => {
          const regex = new RegExp(word, 'gi'); // Case-insensitive search
          const count = (pdfText.match(regex) || []).length;
          wordCounts[word] = count;
      });

      // Return the word counts and the extracted text
      wordCounts = Object.fromEntries(Object.entries(wordCounts).filter(([key, value]) => value !== 0));
      return { wordCounts, pdfText };
  } catch (error) {
      console.error('An error occurred while processing the PDF:', error);
      res.status(500).json({ error: 'Failed to process the PDF' });
  }
}
  
  // Helper function to convert files to PDF using external converter
  async function convertToPDF(filePath) {
    return new Promise((resolve, reject) => {
      const convertedFilePath = path.join('converted/', `${path.parse(filePath).name}.pdf`);
  
      mammoth.extractRawText({ path: filePath })
        .then((result) => {
          const html = `<html><body>${result.value}</body></html>`;
  
          pdf.create(html).toFile(convertedFilePath, (error) => {
            if (error) {
              reject(error);
            } else {
              resolve(convertedFilePath);
            }
          });
        })
        .catch((error) => {
          reject(error);
        });
    });
  
  }







  //register part accept images 


  const storageImage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'authUploads/');
    },
    filename: (req, file, cb) => {
      const originalName = path.parse(file.originalname).name;
      const timestamp = Date.now();
      const extension = path.extname(file.originalname);
      const newFilename = `${timestamp}_${originalName}${extension}`;
      cb(null, newFilename);
    },
  });
  
  const imageFileFilterImage = (req, file, cb) => {
    // Accept images only
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  };
  
  const uploadImage = multer({ storageImage, fileFilter: imageFileFilterImage });
  

  // Export the functions and constants
module.exports = {
    upload,
    uploadProduct,
    uploadCotaProduct,
    uploadOffre,
    processFileData,
    processPDF,
    convertToPDF,
    uploadImage,
    processPDF2
  };