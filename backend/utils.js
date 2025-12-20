/**
 * Utility functions for the plagiarism detection backend
 */

/**
 * Extract student name and ID from filename
 * Supports various filename formats
 */
function extractStudentInfo(filename) {
  // Remove file extension and clean filename
  const baseName = filename.replace('.ipynb', '').trim();
  
  // Handle empty or invalid filenames
  if (!baseName) {
    return { studentName: 'unknown', studentId: 'unknown' };
  }
  
  // Pattern 1: Check if filename contains " - " (dash separator)
  // Format: "Assignment - Student Name" or "Python_(Lab_05) - Student Name"
  if (baseName.includes(' - ')) {
    const parts = baseName.split(' - ');
    // Take the last part after the last dash as the student name
    const studentName = parts[parts.length - 1].trim();
    if (studentName) {
      const studentId = studentName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
      return { 
        studentName: toTitleCase(studentName), 
        studentId 
      };
    }
  }
  
  // Pattern 2: Check if filename contains "-" (dash without spaces)
  if (baseName.includes('-') && !baseName.includes(' - ')) {
    const parts = baseName.split('-');
    // Take the last part after the last dash as the student name
    const studentName = parts[parts.length - 1].trim();
    if (studentName) {
      const studentId = studentName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
      return { 
        studentName: toTitleCase(studentName), 
        studentId 
      };
    }
  }
  
  // Split by underscore
  const parts = baseName.split('_').map(part => part.trim()).filter(part => part);
  
  if (parts.length === 1) {
    // Single part - could be just a name or assignment
    const part = parts[0];
    
    // Check if it's a roll number
    if (/^roll\d+$/i.test(part)) {
      return { studentName: part.toLowerCase(), studentId: part.toLowerCase() };
    }
    
    // Check if it's just numbers (student ID)
    if (/^\d+$/.test(part)) {
      return { studentName: `student_${part}`, studentId: part };
    }
    
    // Otherwise treat as name
    return { studentName: toTitleCase(part), studentId: part.toLowerCase() };
  }
  
  // Multiple parts - find where assignment part ends and name begins
  const assignmentIndicators = [
    'lab', 'assignment', 'hw', 'project', 'task', 'exercise', 'ex', 'test', 'quiz'
  ];
  
  let nameStartIndex = 0;
  
  // Find the last assignment indicator
  for (let i = 0; i < parts.length; i++) {
    const partLower = parts[i].toLowerCase();
    
    // Check if this part is an assignment indicator
    if (assignmentIndicators.includes(partLower)) {
      nameStartIndex = i + 1;
    }
    // Check if this part starts with assignment indicator
    else if (assignmentIndicators.some(indicator => partLower.startsWith(indicator))) {
      nameStartIndex = i + 1;
    }
    // Check if this part is assignment + number (like lab7, hw3)
    else if (/^(lab|assignment|hw|project|task|exercise|ex|test|quiz)\d+$/i.test(partLower)) {
      nameStartIndex = i + 1;
    }
  }
  
  // Extract name parts (everything after the assignment indicators)
  let nameParts;
  if (nameStartIndex < parts.length) {
    nameParts = parts.slice(nameStartIndex);
  } else {
    // If no assignment indicators found, take the last 1-2 parts as name
    if (parts.length >= 2) {
      nameParts = parts.slice(-2); // Take last two parts as first_name last_name
    } else {
      nameParts = parts.slice(-1); // Take last part as name
    }
  }
  
  // Clean and format the name parts
  const cleanNameParts = [];
  for (const part of nameParts) {
    // Skip empty parts
    if (!part) continue;
    
    // Check if it's a roll number
    if (/^roll\d+$/i.test(part)) {
      return { studentName: part.toLowerCase(), studentId: part.toLowerCase() };
    }
    
    // Check if it's just numbers (student ID)
    if (/^\d+$/.test(part)) {
      return { studentName: `student_${part}`, studentId: part };
    }
    
    cleanNameParts.push(part);
  }
  
  if (cleanNameParts.length > 0) {
    const studentName = cleanNameParts.join(' ');
    const studentId = cleanNameParts.join('_').toLowerCase();
    return { 
      studentName: toTitleCase(studentName), 
      studentId 
    };
  }
  
  // Fallback: use the whole base name
  const cleanName = baseName.replace(/_/g, ' ');
  const cleanId = baseName.toLowerCase().replace(/\s+/g, '_');
  return { 
    studentName: toTitleCase(cleanName), 
    studentId: cleanId 
  };
}

/**
 * Convert string to title case
 */
function toTitleCase(str) {
  return str.replace(/\w\S*/g, (txt) => {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
}

/**
 * Validate file type
 */
function isValidNotebook(filename) {
  return filename && filename.toLowerCase().endsWith('.ipynb');
}

/**
 * Generate safe filename
 */
function generateSafeFilename(originalName, fileId) {
  const ext = require('path').extname(originalName);
  return `${fileId}${ext}`;
}

/**
 * Format file size in human readable format
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Validate environment variables
 */
function validateEnvironment() {
  const required = ['MONGO_URL', 'DB_NAME'];
  const missing = [];
  
  for (const env of required) {
    if (!process.env[env]) {
      missing.push(env);
    }
  }
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

/**
 * Create error response
 */
function createErrorResponse(message, statusCode = 500) {
  return {
    error: true,
    message,
    statusCode,
    timestamp: new Date().toISOString()
  };
}

/**
 * Create success response
 */
function createSuccessResponse(data, message = 'Success') {
  return {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  };
}

/**
 * Sanitize user input
 */
function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .substring(0, 1000); // Limit length
}

/**
 * Check if string is valid JSON
 */
function isValidJSON(str) {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Sleep function for delays
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  extractStudentInfo,
  toTitleCase,
  isValidNotebook,
  generateSafeFilename,
  formatFileSize,
  validateEnvironment,
  createErrorResponse,
  createSuccessResponse,
  sanitizeInput,
  isValidJSON,
  sleep
};