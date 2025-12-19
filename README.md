# 🔍 Plagiarism Control

A powerful, standalone code similarity detection tool for analyzing Jupyter notebooks with advanced plagiarism detection capabilities.

[![Deploy Backend](https://railway.app/button.svg)](https://railway.app/new/template)
[![Deploy Frontend](https://vercel.com/button)](https://vercel.com/new/clone)

## 🌟 Features

- 📁 **File Management**: Upload and manage up to 300 Jupyter notebook files
- 🚀 **Bulk Upload**: Drag & drop support for multiple files
- 🔬 **Advanced Detection**: TF-IDF and cosine similarity analysis
- 🧹 **Code Normalization**: Removes comments and normalizes variables
- 📊 **Detailed Analysis**: Line-by-line comparison with similarity scores
- 📄 **Export**: Generate PDF reports
- 🔐 **Secure**: JWT-based authentication system
- ⚙️ **Configurable**: Adjustable similarity thresholds
- 📈 **Analytics**: Dashboard with charts and trends

## 🚀 Quick Deploy (Cloud)

### Option 1: One-Click Deploy

1. **Backend**: Click [![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template)
2. **Frontend**: Click [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone)

### Option 2: Manual Deploy

Follow the detailed [Deployment Guide](DEPLOYMENT_GUIDE.md) for step-by-step instructions.

## 💻 Local Development

### Prerequisites

- Python 3.8+
- Node.js 16+ and npm/yarn
- MongoDB Atlas account

### 1. Configure Database
Update `backend/.env` with your MongoDB connection string:
```env
MONGO_URL="mongodb+srv://username:password@cluster.mongodb.net/"
DB_NAME="plagiarism_control"
JWT_SECRET_KEY="your-secret-key"
CORS_ORIGINS="*"
```

### 2. Start Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn server:app --reload --host 127.0.0.1 --port 8000
```

### 3. Start Frontend
```bash
cd frontend
npm install --legacy-peer-deps
npm start
```

### 4. Access Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## 📖 Usage Guide

1. **Register**: Create an admin account on first visit
2. **Login**: Access the dashboard with your credentials
3. **Upload**: Add .ipynb files (up to 300 files supported)
4. **Analyze**: Run plagiarism detection with configurable thresholds
5. **Review**: Examine similarity scores and detailed comparisons
6. **Export**: Download results as PDF reports

## 🛠️ Technology Stack

### Backend
- **Framework**: FastAPI (Python)
- **Database**: MongoDB Atlas
- **Authentication**: JWT tokens
- **Analysis**: scikit-learn, TF-IDF, Cosine Similarity
- **File Processing**: Jupyter notebook parsing

### Frontend
- **Framework**: React.js
- **Styling**: Tailwind CSS
- **Components**: Radix UI
- **Charts**: Recharts
- **File Upload**: React Dropzone
- **PDF Export**: jsPDF

## 📊 Analysis Features

- **Code Extraction**: Parses Jupyter notebooks to extract Python code
- **Normalization**: Removes comments, docstrings, and normalizes variable names
- **Similarity Detection**: Uses TF-IDF vectorization and cosine similarity
- **Threshold Configuration**: Adjustable similarity thresholds (30-90%)
- **Detailed Reporting**: Line-by-line comparison with similarity scores
- **Bulk Analysis**: Process multiple files simultaneously

## 🔧 Configuration

### Environment Variables

#### Backend (`backend/.env`)
```env
MONGO_URL=your-mongodb-connection-string
DB_NAME=plagiarism_control
JWT_SECRET_KEY=your-secret-key
CORS_ORIGINS=*
```

#### Frontend (`frontend/.env`)
```env
REACT_APP_BACKEND_URL=http://localhost:8000
WDS_SOCKET_PORT=3000
ENABLE_HEALTH_CHECK=false
```

## 📁 Project Structure

```
PlagiarismControl-main/
├── backend/                 # FastAPI backend
│   ├── server.py           # Main server file
│   ├── plagiarism_detector.py  # Analysis engine
│   ├── requirements.txt    # Python dependencies
│   ├── Dockerfile         # Docker configuration
│   └── uploads/           # File storage
├── frontend/               # React frontend
│   ├── src/               # Source code
│   ├── public/            # Static files
│   ├── package.json       # Node dependencies
│   └── vercel.json        # Vercel configuration
├── DEPLOYMENT_GUIDE.md     # Cloud deployment guide
└── README.md              # This file
```

## 🚀 Deployment Options

### Cloud Platforms
- **Backend**: Railway, Render, Heroku
- **Frontend**: Vercel, Netlify, GitHub Pages
- **Database**: MongoDB Atlas (free tier available)

### Self-Hosted
- Docker containers
- VPS with nginx
- Local server setup

## 🔒 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- CORS configuration
- Input validation
- File type restrictions
- Upload size limits

## 📈 Performance

- Optimized for up to 300 files
- Efficient TF-IDF vectorization
- Async database operations
- Chunked file processing
- Caching for repeated analyses

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🆘 Support

- 📖 [Deployment Guide](DEPLOYMENT_GUIDE.md)
- 🐛 [Issue Tracker](https://github.com/your-username/plagiarism-control/issues)
- 📧 Email: support@yourapp.com

## 🎯 Roadmap

- [ ] Support for more file formats (.py, .java, .cpp)
- [ ] Advanced similarity algorithms
- [ ] Real-time collaboration features
- [ ] Integration with LMS platforms
- [ ] Mobile app support
- [ ] Advanced analytics and reporting

---

**🎉 Ready to detect plagiarism? Deploy now and start analyzing!**

[![Deploy Backend](https://railway.app/button.svg)](https://railway.app/new/template) [![Deploy Frontend](https://vercel.com/button)](https://vercel.com/new/clone)