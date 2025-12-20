const fs = require('fs-extra');
const natural = require('natural');
const stringSimilarity = require('string-similarity');
const { diffLines } = require('diff');
const crypto = require('crypto');

class CodeNormalizer {
  /**
   * Remove Python comments from code
   */
  static removeComments(code) {
    // Remove single line comments
    code = code.replace(/#.*$/gm, '');
    
    // Remove multi-line comments (triple quotes)
    code = code.replace(/"""[\s\S]*?"""/g, '');
    code = code.replace(/'''[\s\S]*?'''/g, '');
    
    return code;
  }

  /**
   * Normalize whitespace and indentation
   */
  static normalizeWhitespace(code) {
    const lines = code.split('\n');
    const normalizedLines = [];
    
    for (const line of lines) {
      const stripped = line.trim();
      if (stripped) {
        normalizedLines.push(stripped);
      }
    }
    
    return normalizedLines.join('\n');
  }

  /**
   * Normalize variable names to generic names
   */
  static normalizeVariableNames(code) {
    const keywords = new Set([
      'def', 'class', 'import', 'from', 'if', 'else', 'elif', 'for', 'while',
      'return', 'try', 'except', 'finally', 'with', 'as', 'break', 'continue',
      'pass', 'raise', 'assert', 'yield', 'lambda', 'True', 'False', 'None',
      'and', 'or', 'not', 'in', 'is', 'print', 'range', 'len', 'str', 'int',
      'float', 'list', 'dict', 'set', 'tuple', 'open', 'file'
    ]);

    const tokenRegex = /\b[a-zA-Z_][a-zA-Z0-9_]*\b/g;
    const tokens = code.match(tokenRegex) || [];
    
    const varMapping = new Map();
    let varCounter = 0;
    let normalizedCode = code;

    for (const token of tokens) {
      if (!keywords.has(token) && !varMapping.has(token)) {
        varMapping.set(token, `var${varCounter}`);
        varCounter++;
      }
    }

    for (const [original, normalized] of varMapping) {
      const regex = new RegExp(`\\b${original}\\b`, 'g');
      normalizedCode = normalizedCode.replace(regex, normalized);
    }

    return normalizedCode;
  }

  /**
   * Apply all normalizations
   */
  static normalizeCode(code, normalizeVars = true) {
    code = this.removeComments(code);
    code = this.normalizeWhitespace(code);
    if (normalizeVars) {
      code = this.normalizeVariableNames(code);
    }
    return code;
  }
}

class NotebookParser {
  /**
   * Extract code cells from Jupyter notebook
   */
  static async extractCodeFromNotebook(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const notebook = JSON.parse(content);
      
      const codeCells = [];
      
      if (notebook.cells) {
        for (const cell of notebook.cells) {
          if (cell.cell_type === 'code' && cell.source) {
            if (Array.isArray(cell.source)) {
              codeCells.push(cell.source.join(''));
            } else {
              codeCells.push(cell.source);
            }
          }
        }
      }
      
      return codeCells.join('\n\n');
    } catch (error) {
      console.error(`Error reading notebook ${filePath}:`, error.message);
      return '';
    }
  }
}

class PlagiarismDetector {
  constructor(threshold = 0.5, normalizeVars = true) {
    this.threshold = threshold;
    this.normalizeVars = normalizeVars;
    this.codeHashes = new Map();
  }

  /**
   * Calculate hash for duplicate detection
   */
  calculateCodeHash(code) {
    return crypto.createHash('md5').update(code).digest('hex');
  }

  /**
   * Calculate similarity between two code strings using multiple methods
   */
  calculateSimilarity(code1, code2) {
    if (!code1 || !code2) return 0;

    // Method 1: String similarity (Dice coefficient)
    const stringSim = stringSimilarity.compareTwoStrings(code1, code2);

    // Method 2: Token-based similarity using natural
    const tokenizer = new natural.WordTokenizer();
    const tokens1 = tokenizer.tokenize(code1.toLowerCase()) || [];
    const tokens2 = tokenizer.tokenize(code2.toLowerCase()) || [];
    
    const set1 = new Set(tokens1);
    const set2 = new Set(tokens2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    const jaccardSim = union.size > 0 ? intersection.size / union.size : 0;

    // Method 3: Line-based similarity
    const lines1 = code1.split('\n').filter(line => line.trim());
    const lines2 = code2.split('\n').filter(line => line.trim());
    
    let matchingLines = 0;
    const totalLines = Math.max(lines1.length, lines2.length);
    
    if (totalLines > 0) {
      for (const line1 of lines1) {
        for (const line2 of lines2) {
          if (stringSimilarity.compareTwoStrings(line1, line2) > 0.8) {
            matchingLines++;
            break;
          }
        }
      }
    }
    
    const lineSim = totalLines > 0 ? matchingLines / totalLines : 0;

    // Combine similarities with weights
    const combinedSimilarity = (stringSim * 0.4) + (jaccardSim * 0.3) + (lineSim * 0.3);
    
    return Math.min(combinedSimilarity, 1.0);
  }

  /**
   * Find matching lines between two code blocks
   */
  findMatchingLines(code1, code2, maxMatches = 20) {
    const lines1 = code1.split('\n').map(line => line.trim()).filter(line => line);
    const lines2 = code2.split('\n').map(line => line.trim()).filter(line => line);
    
    const matches = [];
    const line2Set = new Map();
    
    // Create a map for faster lookup
    lines2.forEach((line, index) => {
      if (!line2Set.has(line)) {
        line2Set.set(line, []);
      }
      line2Set.get(line).push(index);
    });

    for (let i = 0; i < lines1.length && matches.length < maxMatches; i++) {
      const line1 = lines1[i];
      
      // Check for exact matches first
      if (line2Set.has(line1)) {
        const indices = line2Set.get(line1);
        matches.push({
          lineA: i + 1,
          lineB: indices[0] + 1,
          code: line1,
          similarity: 100.0
        });
        continue;
      }

      // Check for similar matches
      if (line1.length > 10 && matches.length < maxMatches) {
        for (let j = 0; j < lines2.length; j++) {
          const line2 = lines2[j];
          if (line2.length > 10) {
            const similarity = stringSimilarity.compareTwoStrings(line1, line2);
            if (similarity > 0.85) {
              matches.push({
                lineA: i + 1,
                lineB: j + 1,
                code: line1,
                similarity: Math.round(similarity * 100 * 10) / 10
              });
              break;
            }
          }
        }
      }
    }

    return matches;
  }

  /**
   * Detect plagiarism among multiple files
   */
  async detectPlagiarism(filesData) {
    if (filesData.length < 2) {
      return [];
    }

    console.log(`Processing ${filesData.length} files...`);

    // Step 1: Process all files and extract codes
    const processedFiles = [];

    for (const fileData of filesData) {
      try {
        const rawCode = await NotebookParser.extractCodeFromNotebook(fileData.file_path);
        const normalizedCode = CodeNormalizer.normalizeCode(rawCode, this.normalizeVars);

        // Skip empty files
        if (!normalizedCode.trim()) {
          continue;
        }

        processedFiles.push({
          student_name: fileData.student_name,
          student_id: fileData.student_id,
          file_id: fileData.file_id,
          raw_code: rawCode,
          normalized_code: normalizedCode,
          upload_order: fileData.upload_order || 0,
          code_hash: this.calculateCodeHash(normalizedCode)
        });
      } catch (error) {
        console.error(`Error processing file ${fileData.filename || 'unknown'}:`, error.message);
        continue;
      }
    }

    if (processedFiles.length < 2) {
      return [];
    }

    console.log(`Calculating similarities for ${processedFiles.length} files...`);

    // Step 2: Compare all pairs
    const results = [];

    for (let i = 0; i < processedFiles.length; i++) {
      for (let j = i + 1; j < processedFiles.length; j++) {
        const fileA = processedFiles[i];
        const fileB = processedFiles[j];

        let similarity;

        // Check for exact duplicates first
        if (fileA.code_hash === fileB.code_hash) {
          similarity = 1.0;
        } else {
          similarity = this.calculateSimilarity(fileA.normalized_code, fileB.normalized_code);
        }

        if (similarity >= this.threshold) {
          // Calculate matching lines for high similarity cases
          let matchingLines = [];
          if (similarity > 0.7) {
            matchingLines = this.findMatchingLines(
              fileA.normalized_code,
              fileB.normalized_code,
              20
            );
          }

          results.push({
            studentA: fileA.student_name,
            studentA_id: fileA.student_id,
            fileA_id: fileA.file_id,
            studentB: fileB.student_name,
            studentB_id: fileB.student_id,
            fileB_id: fileB.file_id,
            similarity: Math.round(similarity * 100 * 100) / 100,
            matching_lines: matchingLines,
            total_matches: matchingLines.length
          });
        }
      }
    }

    // Sort by similarity (highest first)
    results.sort((a, b) => b.similarity - a.similarity);

    console.log(`Found ${results.length} potential matches`);
    return results;
  }
}

module.exports = PlagiarismDetector;