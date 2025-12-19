#!/usr/bin/env python3
"""
Build frontend and serve everything from one server
"""

import os
import subprocess
import sys
from pathlib import Path

def build_frontend():
    """Build the React frontend"""
    frontend_dir = Path(__file__).parent / 'frontend'
    
    print("🔨 Building React frontend...")
    
    # Check if node_modules exists
    if not (frontend_dir / 'node_modules').exists():
        print("📦 Installing frontend dependencies...")
        result = subprocess.run(['npm', 'install', '--legacy-peer-deps'], 
                              cwd=frontend_dir, capture_output=True, text=True)
        if result.returncode != 0:
            print(f"❌ Failed to install dependencies: {result.stderr}")
            return False
    
    # Build the frontend
    result = subprocess.run(['npm', 'run', 'build'], 
                          cwd=frontend_dir, capture_output=True, text=True)
    
    if result.returncode == 0:
        print("✅ Frontend built successfully!")
        return True
    else:
        print(f"❌ Frontend build failed: {result.stderr}")
        return False

def start_unified_server():
    """Start the unified server"""
    backend_dir = Path(__file__).parent / 'backend'
    
    print("🚀 Starting unified server...")
    
    # Change to backend directory and start server
    os.chdir(backend_dir)
    
    # Import and run the modified server
    try:
        import uvicorn
        from unified_backend import app
        
        port = int(os.environ.get("PORT", 8000))
        host = "0.0.0.0" if os.environ.get("PORT") else "127.0.0.1"
        
        print(f"🌐 Server starting at: http://{host}:{port}")
        print(f"📚 API Documentation: http://{host}:{port}/docs")
        print(f"🎨 Frontend: http://{host}:{port}")
        
        uvicorn.run(app, host=host, port=port, reload=False)
        
    except ImportError:
        print("❌ Failed to import server. Make sure dependencies are installed.")
        return False

def main():
    print("🎯 Building and serving Plagiarism Control as unified app...")
    
    # Build frontend first
    if not build_frontend():
        print("❌ Cannot continue without frontend build")
        sys.exit(1)
    
    # Start unified server
    start_unified_server()

if __name__ == "__main__":
    main()