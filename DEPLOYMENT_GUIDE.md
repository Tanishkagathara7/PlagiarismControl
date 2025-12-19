# 🚀 Cloud Deployment Guide - Plagiarism Control

This guide will help you deploy your Plagiarism Control application to the cloud so it's accessible via a public URL.

## 🎯 Deployment Strategy

- **Backend**: Railway (Free tier available)
- **Frontend**: Vercel (Free tier available)
- **Database**: MongoDB Atlas (Already configured)

## 📋 Prerequisites

1. GitHub account
2. Railway account (https://railway.app)
3. Vercel account (https://vercel.com)
4. MongoDB Atlas account (already set up)

## 🔧 Step 1: Prepare Your Code

### 1.1 Create a GitHub Repository

1. Go to GitHub and create a new repository called `plagiarism-control`
2. Clone it locally or push your existing code:

```bash
cd PlagiarismControl-main
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/plagiarism-control.git
git push -u origin main
```

## 🚂 Step 2: Deploy Backend to Railway

### 2.1 Deploy via Railway Dashboard

1. Go to https://railway.app and sign up/login
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your `plagiarism-control` repository
4. Railway will detect the Dockerfile in the backend folder
5. Set the root directory to `backend`

### 2.2 Configure Environment Variables

In Railway dashboard, go to your project → Variables tab and add:

```
MONGO_URL=mongodb+srv://rag123456:rag123456@cluster0.qipvo.mongodb.net/
DB_NAME=plagiarism_control
JWT_SECRET_KEY=plagiarism-control-secret-key-change-in-production-2024
CORS_ORIGINS=*
```

### 2.3 Deploy

1. Railway will automatically build and deploy
2. You'll get a URL like: `https://your-app-name.railway.app`
3. Test it by visiting: `https://your-app-name.railway.app/api/`

## 🌐 Step 3: Deploy Frontend to Vercel

### 3.1 Update Frontend Environment

1. Update `frontend/.env`:

```env
REACT_APP_BACKEND_URL=https://your-app-name.railway.app
WDS_SOCKET_PORT=3000
ENABLE_HEALTH_CHECK=false
```

2. Commit and push changes:

```bash
git add .
git commit -m "Update backend URL for production"
git push
```

### 3.2 Deploy via Vercel Dashboard

1. Go to https://vercel.com and sign up/login
2. Click "New Project"
3. Import your GitHub repository
4. Set the root directory to `frontend`
5. Add environment variable:
   - `REACT_APP_BACKEND_URL`: `https://your-app-name.railway.app`

### 3.3 Deploy

1. Vercel will automatically build and deploy
2. You'll get a URL like: `https://your-app-name.vercel.app`

## 🎉 Step 4: Test Your Live Application

1. **Frontend URL**: `https://your-app-name.vercel.app`
2. **Backend API**: `https://your-app-name.railway.app/api/`
3. **API Docs**: `https://your-app-name.railway.app/docs`

### Test the complete flow:
1. Open your Vercel URL
2. Register an admin account
3. Login to the dashboard
4. Upload some .ipynb files
5. Run plagiarism analysis
6. View results

## 🔧 Alternative: One-Click Deploy

### Option A: Railway Template

1. Fork this repository
2. Click this button: [![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template)
3. Connect your forked repository

### Option B: Vercel Template

1. Fork this repository
2. Click: [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone)
3. Set root directory to `frontend`

## 🛠️ Troubleshooting

### Backend Issues:
- Check Railway logs for errors
- Verify environment variables are set
- Ensure MongoDB connection string is correct

### Frontend Issues:
- Check Vercel build logs
- Verify `REACT_APP_BACKEND_URL` is set correctly
- Test backend API endpoints directly

### CORS Issues:
- Ensure `CORS_ORIGINS=*` is set in backend
- Or set specific frontend URL: `CORS_ORIGINS=https://your-app.vercel.app`

## 📱 Custom Domain (Optional)

### For Vercel (Frontend):
1. Go to Project Settings → Domains
2. Add your custom domain
3. Configure DNS records as instructed

### For Railway (Backend):
1. Go to Project Settings → Domains
2. Add your custom domain
3. Configure DNS records as instructed

## 🔒 Security Considerations

For production use, consider:

1. **Change JWT Secret**: Generate a strong secret key
2. **Restrict CORS**: Set specific allowed origins
3. **Environment Variables**: Use secure secret management
4. **Database Security**: Use MongoDB Atlas security features
5. **Rate Limiting**: Add API rate limiting
6. **HTTPS**: Ensure all connections use HTTPS

## 💰 Cost Estimation

- **Railway**: Free tier (500 hours/month)
- **Vercel**: Free tier (100GB bandwidth/month)
- **MongoDB Atlas**: Free tier (512MB storage)

**Total**: $0/month for small usage

## 🎯 Next Steps

After deployment:

1. Share your live URL with users
2. Monitor usage and performance
3. Set up analytics (optional)
4. Configure backups for important data
5. Set up monitoring and alerts

---

**🎉 Congratulations! Your Plagiarism Control application is now live on the internet!**

**Live URLs:**
- **Application**: `https://your-app-name.vercel.app`
- **API**: `https://your-app-name.railway.app`