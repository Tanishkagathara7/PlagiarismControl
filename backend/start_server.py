#!/usr/bin/env python3
"""
Simple script to start the FastAPI server
"""

import sys
import os
import subprocess

def check_dependencies():
    """Check if required packages are installed"""
    try:
        import uvicorn
        import fastapi
        print("✓ FastAPI and Uvicorn are installed")
        return True
    except ImportError as e:
        print(f"✗ Missing dependencies: {e}")
        return False

def install_dependencies():
    """Install required dependencies"""
    print("Installing dependencies...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        print("✓ Dependencies installed successfully")
        return True
    except subprocess.CalledProcessError:
        print("✗ Failed to install dependencies")
        return False

def start_server():
    """Start the FastAPI server"""
    try:
        import uvicorn
        print("Starting FastAPI server...")
        print("Server will be available at: http://localhost:8000")
        print("API Documentation: http://localhost:8000/docs")
        print("Press Ctrl+C to stop the server")
        
        uvicorn.run(
            "server:app",
            host="127.0.0.1",
            port=8000,
            reload=True,
            log_level="info"
        )
    except Exception as e:
        print(f"✗ Failed to start server: {e}")
        return False

def main():
    print("=== Plagiarism Control Backend Server ===")
    print()
    
    # Check if dependencies are installed
    if not check_dependencies():
        print("Installing missing dependencies...")
        if not install_dependencies():
            print("Please install dependencies manually:")
            print("pip install -r requirements.txt")
            sys.exit(1)
    
    # Start the server
    start_server()

if __name__ == "__main__":
    main()