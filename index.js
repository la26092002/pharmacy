const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const path = require('path'); // Import the path module

const app = express();
dotenv.config();

// Connect Database
connectDB();

// Enable CORS
app.use(cors({
  origin: '*', // Allow all domains or specify your frontend URL
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));


// Body parser middleware
app.use(express.json());

app.use(helmet());

app.use(compression());

// Rate Limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});

app.use(limiter);

app.get('/hello', (req, res) => {
  res.send('Hello World');
});

// Define Routes
app.use('/api/auth', require('./routes/api/auth'));
app.use('/api/product', require('./routes/api/product'));
app.use('/api/productCota', require('./routes/api/productCota'));
app.use('/api/offer', require('./routes/api/offre'));
app.use('/api/admin', require('./routes/api/authAdmin'));
app.use('/api/contact', require('./routes/api/contact'));


app.use('/uploads', express.static(path.join(__dirname, 'uploads')));



const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`SERVER 192.168.21.241 STARTED ON PORT ${PORT}`));
