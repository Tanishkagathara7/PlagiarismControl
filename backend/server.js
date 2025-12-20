const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs-extra');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
require('dotenv').config();

const PlagiarismDetector = require('./plagiarism-detector');
const { extractStudentInfo } = require('./utils');

// Configuration
const PORT = process.env.PORT || 8000;
const HOST = process.env.PORT ? '0.0.0.0' : '127.0.0.1';
const MONGO_URL = process.env.MONGO_URL;
const DB_NAME = process.env.DB_NAME;
const JWT_SECRET = process.env.JWT_SECRET_KEY || 'your-secret-key-change-in-production';
const CORS_ORIGINS = process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['*'];

// Initialize Express app
const app = express();

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false
}));
app.use(compression());

// CORS configuration - MUST be before other middleware
app.use((req, res, next) => {
  // Set CORS headers for all requests
  res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  next();
});

// Also use the cors middleware as backup
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'Cache-Control'],
  optionsSuccessStatus: 200
}));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url} - Origin: ${req.headers.origin || 'none'}`);
  next();
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// File upload configuration
const UPLOAD_DIR = path.join(__dirname, 'uploads');
fs.ensureDirSync(UPLOAD_DIR);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const fileId = uuidv4();
    const ext = path.extname(file.originalname);
    cb(null, `${fileId}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.originalname.endsWith('.ipynb')) {
      cb(null, true);
    } else {
      cb(new Error('Only .ipynb files are allowed'), false);
    }
  }
});

// Database connection
let db;
let client;

async function connectToDatabase() {
  try {
    client = new MongoClient(MONGO_URL);
    await client.connect();
    db = client.db(DB_NAME);
    console.log('✓ Connected to MongoDB');
  } catch (error) {
    console.error('✗ MongoDB connection failed:', error);
    process.exit(1);
  }
}

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ detail: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(401).json({ detail: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// API Routes

// Root endpoint
app.get('/api/', (req, res) => {
  res.json({
    message: 'PlagiarismControl API',
    status: 'running',
    version: '1.0.0',
    platform: 'Node.js',
    cors_origins: CORS_ORIGINS,
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    cors_test: 'OK'
  });
});

// Handle OPTIONS requests for all API routes
app.options('/api/*', (req, res) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control');
  res.status(200).end();
});

// Authentication routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ detail: 'Username and password are required' });
    }

    // Check if user already exists
    const existingUser = await db.collection('admins').findOne({ username });
    if (existingUser) {
      return res.status(400).json({ detail: 'Username already exists' });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create admin document
    const adminDoc = {
      id: uuidv4(),
      username,
      password: hashedPassword,
      created_at: new Date().toISOString()
    };

    await db.collection('admins').insertOne(adminDoc);

    res.json({ message: 'Admin registered successfully' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ detail: 'Username and password are required' });
    }

    // Find admin
    const admin = await db.collection('admins').findOne({ username });
    if (!admin) {
      return res.status(401).json({ detail: 'Invalid credentials' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, admin.password);
    if (!isValidPassword) {
      return res.status(401).json({ detail: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign({ sub: username }, JWT_SECRET, { expiresIn: '24h' });

    res.json({
      token,
      username
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

// File upload routes
app.post('/api/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ detail: 'No file uploaded' });
    }

    const { student_name, student_id } = req.body;

    if (!student_name || !student_id) {
      return res.status(400).json({ detail: 'Student name and ID are required' });
    }

    // Check file limit
    const filesCount = await db.collection('files').countDocuments();
    if (filesCount >= 300) {
      // Delete uploaded file
      await fs.remove(req.file.path);
      return res.status(400).json({ detail: 'Maximum file limit (300) reached' });
    }

    // Get upload order
    const uploadOrder = filesCount + 1;

    // Create file metadata
    const fileMetadata = {
      id: path.parse(req.file.filename).name, // Use the UUID from filename
      student_name,
      student_id,
      filename: req.file.originalname,
      file_path: req.file.path,
      upload_timestamp: new Date().toISOString(),
      upload_order: uploadOrder
    };

    await db.collection('files').insertOne(fileMetadata);

    res.json({
      message: 'File uploaded successfully',
      file_id: fileMetadata.id
    });
  } catch (error) {
    console.error('Upload error:', error);
    // Clean up uploaded file on error
    if (req.file) {
      await fs.remove(req.file.path).catch(() => {});
    }
    res.status(500).json({ detail: 'File upload failed' });
  }
});

app.post('/api/upload/bulk', authenticateToken, upload.array('files', 300), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ detail: 'No files provided' });
    }

    // Check current file count
    const currentCount = await db.collection('files').countDocuments();
    if (currentCount + req.files.length > 300) {
      // Clean up uploaded files
      for (const file of req.files) {
        await fs.remove(file.path).catch(() => {});
      }
      return res.status(400).json({
        detail: `Upload would exceed maximum limit. Current: ${currentCount}, Trying to add: ${req.files.length}, Max: 300`
      });
    }

    const uploadedFiles = [];
    const failedFiles = [];

    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      try {
        // Extract student info from filename
        const { studentName, studentId } = extractStudentInfo(file.originalname);

        // Get upload order
        const uploadOrder = currentCount + uploadedFiles.length + 1;

        // Create file metadata
        const fileMetadata = {
          id: path.parse(file.filename).name,
          student_name: studentName,
          student_id: studentId,
          filename: file.originalname,
          file_path: file.path,
          upload_timestamp: new Date().toISOString(),
          upload_order: uploadOrder
        };

        await db.collection('files').insertOne(fileMetadata);

        uploadedFiles.push({
          file_id: fileMetadata.id,
          filename: file.originalname,
          student_name: studentName,
          student_id: studentId
        });
      } catch (error) {
        failedFiles.push({
          filename: file.originalname,
          error: error.message
        });
        // Clean up failed file
        await fs.remove(file.path).catch(() => {});
      }
    }

    res.json({
      message: `Bulk upload completed. ${uploadedFiles.length} files uploaded successfully.`,
      uploaded_files: uploadedFiles,
      failed_files: failedFiles,
      total_uploaded: uploadedFiles.length,
      total_failed: failedFiles.length
    });
  } catch (error) {
    console.error('Bulk upload error:', error);
    // Clean up all uploaded files on error
    if (req.files) {
      for (const file of req.files) {
        await fs.remove(file.path).catch(() => {});
      }
    }
    res.status(500).json({ detail: 'Bulk upload failed' });
  }
});

// File management routes
app.get('/api/files', authenticateToken, async (req, res) => {
  try {
    const files = await db.collection('files')
      .find({}, {
        projection: {
          _id: 0,
          id: 1,
          student_name: 1,
          student_id: 1,
          filename: 1,
          upload_timestamp: 1,
          upload_order: 1
        }
      })
      .sort({ upload_order: 1 })
      .limit(300)
      .toArray();

    res.json(files);
  } catch (error) {
    console.error('Get files error:', error);
    res.status(500).json({ detail: 'Failed to retrieve files' });
  }
});

app.get('/api/files/count', authenticateToken, async (req, res) => {
  try {
    const count = await db.collection('files').countDocuments();
    res.json({ count, max: 300 });
  } catch (error) {
    console.error('Get files count error:', error);
    res.status(500).json({ detail: 'Failed to get file count' });
  }
});

app.delete('/api/files/:fileId', authenticateToken, async (req, res) => {
  try {
    const { fileId } = req.params;

    const file = await db.collection('files').findOne({ id: fileId });
    if (!file) {
      return res.status(404).json({ detail: 'File not found' });
    }

    // Delete physical file
    await fs.remove(file.file_path).catch(() => {});

    // Delete from database
    await db.collection('files').deleteOne({ id: fileId });

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ detail: 'Failed to delete file' });
  }
});

app.delete('/api/files', authenticateToken, async (req, res) => {
  try {
    // Get all files to delete physical files
    const files = await db.collection('files').find({}, { projection: { file_path: 1 } }).toArray();

    let deletedCount = 0;
    let failedCount = 0;

    // Delete physical files
    for (const file of files) {
      try {
        await fs.remove(file.file_path);
        deletedCount++;
      } catch (error) {
        failedCount++;
        console.error(`Failed to delete file ${file.file_path}:`, error);
      }
    }

    // Delete all records from database
    const result = await db.collection('files').deleteMany({});

    res.json({
      message: `Deleted ${result.deletedCount} file records`,
      deleted_files: deletedCount,
      failed_files: failedCount,
      total_records_deleted: result.deletedCount
    });
  } catch (error) {
    console.error('Delete all files error:', error);
    res.status(500).json({ detail: 'Failed to delete files' });
  }
});

// Analysis routes
app.post('/api/analyze', authenticateToken, async (req, res) => {
  try {
    const { threshold = 0.5 } = req.body;

    const files = await db.collection('files').find({}).limit(300).toArray();

    if (files.length < 2) {
      return res.status(400).json({ detail: 'At least 2 files are required for analysis' });
    }

    // Limit files for performance
    const filesToAnalyze = files.slice(0, 100);

    const filesData = filesToAnalyze.map(f => ({
      file_id: f.id,
      student_name: f.student_name,
      student_id: f.student_id,
      file_path: f.file_path,
      upload_order: f.upload_order
    }));

    // Run plagiarism detection
    const detector = new PlagiarismDetector(threshold);
    const results = await detector.detectPlagiarism(filesData);

    // Create analysis result
    const analysisResult = {
      id: uuidv4(),
      analysis_timestamp: new Date().toISOString(),
      threshold,
      results,
      total_files: filesToAnalyze.length,
      total_matches: results.length
    };

    // Save to database
    await db.collection('analysis_results').insertOne(analysisResult);

    res.json(analysisResult);
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ detail: `Analysis failed: ${error.message}` });
  }
});

app.get('/api/results/latest', authenticateToken, async (req, res) => {
  try {
    const result = await db.collection('analysis_results')
      .findOne({}, { projection: { _id: 0 } }, { sort: { analysis_timestamp: -1 } });

    if (!result) {
      return res.json({ results: [], total_files: 0, total_matches: 0 });
    }

    res.json(result);
  } catch (error) {
    console.error('Get latest result error:', error);
    res.status(500).json({ detail: 'Failed to get latest result' });
  }
});

app.get('/api/results/history', authenticateToken, async (req, res) => {
  try {
    const results = await db.collection('analysis_results')
      .find({}, {
        projection: {
          _id: 0,
          id: 1,
          analysis_timestamp: 1,
          threshold: 1,
          total_files: 1,
          total_matches: 1,
          results: 1
        }
      })
      .sort({ analysis_timestamp: -1 })
      .limit(50)
      .toArray();

    // Add summary statistics
    results.forEach(result => {
      if (result.results && result.results.length > 0) {
        const similarities = result.results.map(r => r.similarity || 0);
        result.avg_similarity = similarities.reduce((a, b) => a + b, 0) / similarities.length;
        result.max_similarity = Math.max(...similarities);
        result.high_risk_count = similarities.filter(s => s >= 70).length;
        result.medium_risk_count = similarities.filter(s => s >= 40 && s < 70).length;
        result.low_risk_count = similarities.filter(s => s < 40).length;
      } else {
        result.avg_similarity = 0;
        result.max_similarity = 0;
        result.high_risk_count = 0;
        result.medium_risk_count = 0;
        result.low_risk_count = 0;
      }
    });

    res.json(results);
  } catch (error) {
    console.error('Get analysis history error:', error);
    res.status(500).json({ detail: 'Failed to get analysis history' });
  }
});

// Test endpoint for filename extraction
app.post('/api/test-extraction', authenticateToken, (req, res) => {
  try {
    const { filename } = req.body;
    const { studentName, studentId } = extractStudentInfo(filename);
    
    res.json({
      filename,
      extracted_name: studentName,
      extracted_id: studentId
    });
  } catch (error) {
    console.error('Test extraction error:', error);
    res.status(500).json({ detail: 'Test extraction failed' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ detail: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ detail: 'Endpoint not found' });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...');
  if (client) {
    await client.close();
    console.log('✓ Database connection closed');
  }
  process.exit(0);
});

// Start server
async function startServer() {
  try {
    await connectToDatabase();
    
    app.listen(PORT, HOST, () => {
      console.log('🚀 Plagiarism Control Backend Server Started');
      console.log(`🌐 Server: http://${HOST}:${PORT}`);
      console.log(`📚 API Base: http://${HOST}:${PORT}/api`);
      console.log('📁 Upload Directory:', UPLOAD_DIR);
      console.log('🔒 JWT Secret:', JWT_SECRET.substring(0, 10) + '...');
      console.log('📊 Database:', DB_NAME);
      console.log('🌍 CORS Origins:', CORS_ORIGINS);
      console.log('🔧 Environment:', process.env.NODE_ENV || 'development');
      console.log('✅ Ready to accept requests');
      console.log('');
      console.log('Test the API:');
      console.log(`  curl http://${HOST}:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();