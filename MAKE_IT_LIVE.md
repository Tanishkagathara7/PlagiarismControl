# 🌐 Make Your Plagiarism Control App Live

## 🎯 Goal: Deploy to Cloud (No Local Servers Needed)

Follow these steps to make your application accessible via a public URL that anyone can visit.

## 🚀 Quick Start (5 Minutes)

### Step 1: Create GitHub Repository

1. Go to [GitHub.com](https://github.com) and create a new repository called `plagiarism-control`
2. Upload your project files or use Git:

```bash
cd PlagiarismControl-main
git init
git add .
git commit -m "Initial deployment"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/plagiarism-control.git
git push -u origin main
```

### Step 2: Deploy Backend (2 minutes)

1. Go to [Railway.app](https://railway.app)
2. Sign up with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your `plagiarism-control` repository
5. Set **Root Directory** to `backend`
6. Add these environment variables:
   ```
   MONGO_URL=mongodb+srv://rag123456:rag123456@cluster0.qipvo.mongodb.net/
   DB_NAME=plagiarism_control
   JWT_SECRET_KEY=plagiarism-control-secret-key-2024
   CORS_ORIGINS=*
   ```
7. Deploy! You'll get a URL like: `https://plagiarism-control-backend-production.railway.app`

### Step 3: Deploy Frontend (2 minutes)

1. Go to [Vercel.com](https://vercel.com)
2. Sign up with GitHub
3. Click "New Project" → Import your repository
4. Set **Root Directory** to `frontend`
5. Add environment variable:
   ```
   REACT_APP_BACKEND_URL=https://your-railway-backend-url.railway.app
   ```
6. Deploy! You'll get a URL like: `https://plagiarism-control.vercel.app`

## 🎉 Your App is Live!

**Frontend URL**: `https://your-app.vercel.app`
**Backend API**: `https://your-backend.railway.app`

## ✅ Test Your Live App

1. Open your Vercel URL in any browser
2. Register a new admin account
3. Login to the dashboard
4. Upload some .ipynb files
5. Run plagiarism analysis
6. View results and export PDF

## 🔧 Alternative Platforms

### Backend Alternatives:
- **Render**: [render.com](https://render.com) (Free tier)
- **Heroku**: [heroku.com](https://heroku.com) (Paid)
- **DigitalOcean**: [digitalocean.com](https://digitalocean.com) (Paid)

### Frontend Alternatives:
- **Netlify**: [netlify.com](https://netlify.com) (Free tier)
- **GitHub Pages**: [pages.github.com](https://pages.github.com) (Free)
- **Firebase Hosting**: [firebase.google.com](https://firebase.google.com) (Free tier)

## 🛠️ Troubleshooting

### Backend Not Working?
- Check Railway logs for errors
- Verify environment variables are set correctly
- Test API endpoint: `https://your-backend.railway.app/api/`

### Frontend Not Loading?
- Check Vercel build logs
- Verify `REACT_APP_BACKEND_URL` points to your Railway backend
- Clear browser cache

### CORS Errors?
- Ensure `CORS_ORIGINS=*` is set in Railway backend
- Or set specific frontend URL: `CORS_ORIGINS=https://your-app.vercel.app`

## 💰 Cost

**Free Tier Limits:**
- Railway: 500 hours/month (enough for small usage)
- Vercel: 100GB bandwidth/month
- MongoDB Atlas: 512MB storage (already configured)

**Total Cost: $0/month** for moderate usage

## 🔒 Security for Production

After deployment, consider:

1. **Change JWT Secret**: Generate a strong random key
2. **Restrict CORS**: Set specific allowed origins instead of `*`
3. **Environment Secrets**: Use platform secret management
4. **Custom Domain**: Add your own domain name
5. **SSL Certificate**: Ensure HTTPS (automatic on Vercel/Railway)

## 📱 Share Your App

Once live, you can:
- Share the URL with students/teachers
- Embed in your website
- Add to your portfolio
- Use for academic projects

## 🎯 Next Steps

1. **Custom Domain**: Add your own domain (optional)
2. **Analytics**: Add Google Analytics (optional)
3. **Monitoring**: Set up uptime monitoring
4. **Backups**: Configure database backups
5. **Updates**: Push updates via Git (auto-deploys)

---

## 🚀 One-Click Deploy Buttons

**Backend**: [![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/YOUR_USERNAME/plagiarism-control&plugins=postgresql&envs=MONGO_URL,DB_NAME,JWT_SECRET_KEY,CORS_ORIGINS)

**Frontend**: [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/plagiarism-control&project-name=plagiarism-control&repository-name=plagiarism-control&root-directory=frontend)

---

**🎉 Congratulations! Your Plagiarism Control app is now live on the internet!**

**No more local servers needed - just share your URL and let users access it from anywhere!**