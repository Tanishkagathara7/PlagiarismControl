const express = require('express');
const cors = require('cors');

const app = express();

// Simple CORS test
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.options('*', cors());

app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'CORS test successful!',
    origin: req.headers.origin,
    timestamp: new Date().toISOString()
  });
});

const PORT = 8001;
app.listen(PORT, () => {
  console.log(`CORS test server running on http://localhost:${PORT}`);
  console.log('Test with: curl -H "Origin: http://localhost:3000" http://localhost:8001/api/test');
});