# 🔍 Plagiarism Control

A powerful, standalone code similarity detection tool for analyzing Jupyter notebooks with advanced plagiarism detection capabilities.

## 🌟 Features

- 📁 **File Management**: Upload and manage up to 300 Jupyter notebook files
- 🚀 **Bulk Upload**: Drag & drop support for multiple files
- 🔬 **Advanced Detection**: TF-IDF and cosine similarity analysis
- 🧹 **Code Normalization**: Removes comments and normalizes variables
- � ***Detailed Analysis**: Line-by-line comparison with similarity scores
- � ***Export**: Generate PDF reports
- 🔐 **Secure**: JWT-based authentication system
- ⚙️ **Configurable**: Adjustable similarity thresholds
- � ***Analytics**: Dashboard with charts and trends

## 💻 Local Development

### Prerequisites

- Node.js 16+ and npm
- MongoDB Atlas account

### 1. Configure Database
Update `backend/.env` with your MongoDB connection string:
```env
MONGO_URL="mongodb+srv://username:password@cluster.mongodb.net/"
DB_NAME="plagiarism_control"
JWT_SECRET_KEY="your-secret-key"
CORS_ORIGINS="*"
```

### 2. Start Backend (Node.js)
```bash
cd backend
npm install
npm start
```

### 3. Start Frontend
```bash
cd frontend
npm install --legacy-peer-deps
npm start
```

### 4. Access Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000/api
- **API Documentation**: Available via API endpoints

## 📖 Usage Guide

1. **Register**: Create an admin account on first visit
2. **Login**: Access the dashboard with your credentials
3. **Upload**: Add .ipynb files (up to 300 files supported)
4. **Analyze**: Run plagiarism detection with configurable thresholds
5. **Review**: Examine similarity scores and detailed comparisons
6. **Export**: Download results as PDF reports

## 🛠️ Technology Stack

### Backend
- **Framework**: Express.js (Node.js)
- **Database**: MongoDB Atlas
- **Authentication**: JWT tokens
- **Analysis**: Natural language processing, String similarity
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
- **Similarity Detection**: Uses multiple similarity algorithms including string similarity and token-based analysis
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
├── backend/                 # Express.js backend
│   ├── server.js           # Main server file
│   ├── plagiarism-detector.js  # Analysis engine
│   ├── utils.js           # Utility functions
│   ├── package.json       # Node.js dependencies
│   ├── Dockerfile         # Docker configuration
│   └── uploads/           # File storage
├── frontend/               # React frontend
│   ├── src/               # Source code
│   ├── public/            # Static files
│   ├── package.json       # Node dependencies
│   └── build/             # Production build
└── README.md              # This file
```

## 🚀 Quick Start

### Windows
Run the batch file to start both servers:
```bash
start_project.bat
```

### Manual Start
```bash
# Backend
cd backend
npm install
npm start

# Frontend (in new terminal)
cd frontend
npm install
npm start
```

## 🔒 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- CORS configuration
- Input validation
- File type restrictions
- Upload size limits
- Rate limiting

## 📈 Performance

- Optimized for up to 300 files
- Efficient similarity algorithms
- Async database operations
- Chunked file processing
- Memory-efficient processing

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🆘 Support

- � [Issue Tracker](https://github.com/your-username/plagiarism-control/issues)
- 📧 Email: support@yourapp.com

## � Ruoadmap

- [ ] Support for more file formats (.py, .java, .cpp)
- [ ] Advanced similarity algorithms
- [ ] Real-time collaboration features
- [ ] Integration with LMS platforms
- [ ] Mobile app support
- [ ] Advanced analytics and reporting

---

**🎉 Ready to detect plagiarism? Start analyzing with Node.js backend!**