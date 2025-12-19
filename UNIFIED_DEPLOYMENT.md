# 🚀 Unified Deployment Guide - Single Server

Deploy both frontend and backend on **ONE** platform instead of two separate services.

## 🎯 Benefits of Unified Deployment

- ✅ **Single URL**: One domain for everything
- ✅ **No CORS Issues**: Frontend and backend on same origin
- ✅ **Simpler Setup**: Only one deployment to manage
- ✅ **Cost Effective**: Use only one service instead of two
- ✅ **Easier Maintenance**: Single codebase deployment

## 🚀 Quick Deploy (3 Minutes)

### Option 1: Railway (Recommended)

1. **Create GitHub Repository**
   ```bash
   cd PlagiarismControl-main
   git init
   git add .
   git commit -m "Unified deployment ready"
   git remote add origin https://github.com/YOUR_USERNAME/plagiarism-control.git
   git push -u origin main
   ```

2. **Deploy to Railway**
   - Go to [railway.app](https://railway.app)
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your repository
   - Railway will detect `Dockerfile.unified`
   - Add environment variables:
     ```
     MONGO_URL=mongodb+srv://rag123456:rag123456@cluster0.qipvo.mongodb.net/
     DB_NAME=plagiarism_control
     JWT_SECRET_KEY=your-secret-key-2024
     CORS_ORIGINS=*
     ```
   - Deploy!

3. **Access Your App**
   - You'll get ONE URL: `https://your-app.railway.app`
   - Frontend: `https://your-app.railway.app`
   - API: `https://your-app.railway.app/api/`
   - Docs: `https://your-app.railway.app/docs`

### Option 2: Render

1. **Fork Repository** (same as above)

2. **Deploy to Render**
   - Go to [render.com](https://render.com)
   - Create "New Web Service"
   - Connect your GitHub repo
   - Use these settings:
     - **Build Command**: `cd frontend && npm install --legacy-peer-deps && npm run build`
     - **Start Command**: `cd backend && python unified_backend.py`
     - **Environment**: Python 3
   - Add environment variables (same as Railway)

### Option 3: Heroku

1. **Install Heroku CLI**
2. **Create Heroku App**
   ```bash
   heroku create your-app-name
   heroku config:set MONGO_URL="your-mongodb-url"
   heroku config:set DB_NAME="plagiarism_control"
   heroku config:set JWT_SECRET_KEY="your-secret-key"
   git push heroku main
   ```

## 💻 Local Testing

Test the unified server locally before deploying:

```bash
# Run the build and serve script
run_unified.bat

# Or manually:
cd frontend
npm install --legacy-peer-deps
npm run build
cd ../backend
python unified_backend.py
```

Access at: http://localhost:8000

## 🔧 How It Works

The unified server:

1. **Builds Frontend**: React app is built into static files
2. **Serves API**: FastAPI handles `/api/*` routes
3. **Serves Frontend**: Static files served for all other routes
4. **Single Port**: Everything runs on one port (8000)

## 📁 File Structure

```
PlagiarismControl-main/
├── Dockerfile.unified          # Multi-stage Docker build
├── railway.unified.json        # Railway configuration
├── run_unified.bat            # Local build & run script
├── backend/
│   ├── unified_backend.py     # Combined server
│   ├── server.py             # Original API server
│   └── requirements.txt      # Python dependencies
└── frontend/
    ├── build/                # Built React app (created by npm run build)
    ├── src/                  # React source code
    └── package.json          # Node dependencies
```

## 🌐 Platform Comparison

| Platform | Free Tier | Build Time | Ease | Custom Domain |
|----------|-----------|------------|------|---------------|
| Railway  | 500h/month | Fast | Easy | Yes |
| Render   | 750h/month | Medium | Easy | Yes |
| Heroku   | None (paid) | Fast | Medium | Yes |
| Vercel   | Unlimited | Fast | Hard* | Yes |

*Vercel is primarily for frontend; backend needs workarounds

## 🔒 Environment Variables

Set these in your deployment platform:

```env
MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/
DB_NAME=plagiarism_control
JWT_SECRET_KEY=your-super-secret-key-change-this
CORS_ORIGINS=*
PORT=8000
```

## 🛠️ Troubleshooting

### Build Fails?
- Check Node.js version (needs 16+)
- Try `npm install --legacy-peer-deps`
- Clear npm cache: `npm cache clean --force`

### Frontend Not Loading?
- Verify build directory exists: `frontend/build/`
- Check server logs for static file errors
- Ensure `unified_backend.py` is being used

### API Not Working?
- Test API directly: `https://your-app.com/api/`
- Check environment variables are set
- Verify MongoDB connection

### CORS Errors?
- Should not happen with unified deployment
- If they occur, check `CORS_ORIGINS` setting

## 🎯 Production Optimizations

For production use:

1. **Security**:
   ```env
   JWT_SECRET_KEY=generate-a-strong-random-key
   CORS_ORIGINS=https://your-domain.com
   ```

2. **Performance**:
   - Enable gzip compression
   - Add CDN for static files
   - Use production MongoDB cluster

3. **Monitoring**:
   - Add health checks
   - Set up error logging
   - Monitor resource usage

## 💰 Cost Estimation

**Free Tier Usage:**
- Railway: 500 hours/month (20+ days)
- Render: 750 hours/month (31 days)
- MongoDB Atlas: 512MB storage

**Paid Tier (if needed):**
- Railway: $5/month
- Render: $7/month
- Heroku: $7/month

## 🎉 Benefits Summary

✅ **One URL** instead of two
✅ **No CORS issues** 
✅ **Simpler deployment**
✅ **Lower cost** (one service vs two)
✅ **Easier SSL** setup
✅ **Better performance** (no cross-origin requests)

---

## 🚀 One-Click Deploy

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/YOUR_USERNAME/plagiarism-control&envs=MONGO_URL,DB_NAME,JWT_SECRET_KEY,CORS_ORIGINS)

---

**🎉 Your unified Plagiarism Control app will be live at ONE URL!**

**Example: `https://plagiarism-control-production.railway.app`**
- Frontend: Same URL
- API: Same URL + `/api/`
- Docs: Same URL + `/docs`