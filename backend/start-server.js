#!/usr/bin/env node

/**
 * Simple script to start the Node.js server
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

function checkDependencies() {
  console.log('Checking dependencies...');
  
  const packageJsonPath = path.join(__dirname, 'package.json');
  const nodeModulesPath = path.join(__dirname, 'node_modules');
  
  if (!fs.existsSync(packageJsonPath)) {
    console.log('✗ package.json not found');
    return false;
  }
  
  if (!fs.existsSync(nodeModulesPath)) {
    console.log('✗ node_modules not found');
    return false;
  }
  
  console.log('✓ Dependencies appear to be installed');
  return true;
}

function installDependencies() {
  console.log('Installing dependencies...');
  
  return new Promise((resolve, reject) => {
    const npm = spawn('npm', ['install'], {
      stdio: 'inherit',
      cwd: __dirname
    });
    
    npm.on('close', (code) => {
      if (code === 0) {
        console.log('✓ Dependencies installed successfully');
        resolve(true);
      } else {
        console.log('✗ Failed to install dependencies');
        reject(false);
      }
    });
    
    npm.on('error', (error) => {
      console.log('✗ Failed to run npm install:', error.message);
      reject(false);
    });
  });
}

function startServer() {
  console.log('Starting Node.js server...');
  console.log('Server will be available at: http://localhost:8000');
  console.log('API Base URL: http://localhost:8000/api');
  console.log('Press Ctrl+C to stop the server');
  console.log('');
  
  const server = spawn('node', ['server.js'], {
    stdio: 'inherit',
    cwd: __dirname
  });
  
  server.on('error', (error) => {
    console.log('✗ Failed to start server:', error.message);
    process.exit(1);
  });
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    server.kill('SIGINT');
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down server...');
    server.kill('SIGTERM');
    process.exit(0);
  });
}

async function main() {
  console.log('=== Plagiarism Control Backend Server (Node.js) ===');
  console.log('');
  
  try {
    // Check if dependencies are installed
    if (!checkDependencies()) {
      console.log('Installing missing dependencies...');
      await installDependencies();
    }
    
    // Start the server
    startServer();
    
  } catch (error) {
    console.log('Please install dependencies manually:');
    console.log('npm install');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}