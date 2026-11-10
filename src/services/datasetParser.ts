/**
 * HEALML – Universal Dataset Parser & Schema Detector
 * Supports CSV, XLSX, and XLS file formats.
 * Automatically infers schema, column roles, missingness, duplicates,
 * constant columns, outliers, and auto-detects candidate target features.
 */

import * as XLSX from 'xlsx';
import { DataRow, DataColumn, Dataset, MLTaskType, ColumnRole } from '../types/pipeline';

// Common keywords suggesting target prediction features
const TARGET_KEYWORDS = [
  'target', 'label', 'class', 'status', 'outcome', 'survived',
  'readmitted', 'default', 'churn', 'risk', 'price', 'salary',
  'value', 'revenue', 'cost', 'failure', 'response', 'purchase',
  'approved', 'fraud', 'diagnosis', 'condition', 'severity'
];

// Common keywords identifying row index / ID columns that should not be default model features
const IDENTIFIER_KEYWORDS = [
  'id', 'uuid', 'key', 'index', 'code', 'encounter_id', 'patient_nbr',
  'account_id', 'sensor_node_id', 'passengerid', 'ssn', 'serial'
];

// Helper: safely parse numbers formatted with currency symbols, percentages, or commas
export function parsePotentialNumber(val: any): number | null {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  if (typeof val === 'boolean') return null;
  if (typeof val !== 'string') return null;

  const trimmed = val.trim();
  if (trimmed === '') return null;

  // Check if string is a number directly
  const directNum = Number(trimmed);
  if (!isNaN(directNum) && !trimmed.includes(':') && !trimmed.includes('/')) {
    return directNum;
  }

  // Handle accounting parentheses (e.g. "(120.50)" -> -120.50)
  let cleaned = trimmed;
  let isNegative = false;
  if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
    isNegative = true;
    cleaned = cleaned.slice(1, -1).trim();
  }

  // Strip currency symbols: $, €, £, ¥, ₹
  cleaned = cleaned.replace(/^[\$€£¥₹]\s*/, '').replace(/\s*[\$€£¥₹]$/, '');

  // Strip percentages (e.g. "15%" -> 15)
  if (cleaned.endsWith('%')) {
    cleaned = cleaned.slice(0, -1).trim();
  }

  // Strip thousands commas (e.g. "1,250.50" -> "1250.50")
  cleaned = cleaned.replace(/,/g, '');

  const parsed = Number(cleaned);
  if (!isNaN(parsed) && cleaned !== '') {
    return isNegative ? -Math.abs(parsed) : parsed;
  }

  return null;
}

/**
 * Deeply analyzes dataset rows to extract rich column metadata,
 * role classification, and statistical distributions.
 */
export function analyzeUniversalSchema(rows: DataRow[]): {
  columns: DataColumn[];
  duplicateCount: number;
  constantColumnsCount: number;
  autoDetectedTarget: string;
  suggestedTaskType: MLTaskType;
} {
  if (!rows || rows.length === 0) {
    return {
      columns: [],
      duplicateCount: 0,
      constantColumnsCount: 0,
      autoDetectedTarget: '',
      suggestedTaskType: 'unsupervised',
    };
  }

  const columnNames = Object.keys(rows[0]);
  const rowCount = rows.length;

  // 1. Duplicate detection across non-ID fields
  const seenRows = new Set<string>();
  let duplicateCount = 0;
  rows.forEach((r) => {
    // Strip obvious IDs when checking row equality
    const testRow: Record<string, any> = {};
    for (const key of Object.keys(r)) {
      if (!IDENTIFIER_KEYWORDS.some((kw) => key.toLowerCase().includes(kw))) {
        testRow[key] = r[key];
      }
    }
    const serialized = JSON.stringify(testRow);
    if (seenRows.has(serialized)) {
      duplicateCount++;
    } else {
      seenRows.add(serialized);
    }
  });

  let constantColumnsCount = 0;

  // 2. Column-by-column deep analysis
  const columns: DataColumn[] = columnNames.map((name) => {
    let missingCount = 0;
    let invalidTypeCount = 0;
    const values: any[] = [];
    const numericValues: number[] = [];
    const dateValues: number[] = [];

    rows.forEach((r) => {
      const val = r[name];
      if (
        val === null ||
        val === undefined ||
        val === '' ||
        val === 'NA' ||
        val === 'N/A' ||
        val === 'null' ||
        val === 'NaN' ||
        val === '?' ||
        val === '-'
      ) {
        missingCount++;
      } else {
        values.push(val);

        // Check if numeric or parseable number-as-text
        const parsedNum = parsePotentialNumber(val);
        if (parsedNum !== null) {
          numericValues.push(parsedNum);
        } else {
          // Check if parseable date
          if (typeof val === 'string' && val.length >= 8 && !isNaN(Date.parse(val))) {
            dateValues.push(Date.parse(val));
          }
        }
      }
    });

    const nonNullCount = values.length;
    const uniqueValues = Array.from(new Set(values.map(String)));
    const uniqueCount = uniqueValues.length;
    const isConstant = uniqueCount <= 1;
    if (isConstant) constantColumnsCount++;

    const numericRatio = nonNullCount > 0 ? numericValues.length / nonNullCount : 0;
    const dateRatio = nonNullCount > 0 ? dateValues.length / nonNullCount : 0;
    const uniqueRatio = nonNullCount > 0 ? uniqueCount / nonNullCount : 0;

    // Detect if column is an identifier
    const nameLower = name.toLowerCase();
    const matchesIdKeyword = IDENTIFIER_KEYWORDS.some(
      (kw) => nameLower === kw || nameLower.startsWith(kw + '_') || nameLower.endsWith('_' + kw)
    );
    const isIdentifier = (matchesIdKeyword && uniqueRatio > 0.6) || (uniqueRatio > 0.95 && uniqueCount > 50 && numericRatio < 0.9);

    let type: ColumnRole = 'categorical';
    if (isIdentifier) {
      type = 'identifier';
    } else if (dateRatio > 0.75) {
      type = 'datetime';
    } else if (numericRatio > 0.85) {
      type = 'numeric';
    } else {
      type = 'categorical';
    }

    // Compute statistics for numeric columns
    let min: number | undefined;
    let max: number | undefined;
    let mean: number | undefined;
    let median: number | undefined;
    let std: number | undefined;
    let skewness: number | undefined;
    let outlierCount = 0;

    if (type === 'numeric' && numericValues.length > 0) {
      min = Number(Math.min(...numericValues).toFixed(2));
      max = Number(Math.max(...numericValues).toFixed(2));
      const sum = numericValues.reduce((a, b) => a + b, 0);
      mean = Number((sum / numericValues.length).toFixed(2));

      // Median
      const sorted = [...numericValues].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      median = Number((sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2).toFixed(2));

      // Standard Deviation
      const variance = numericValues.reduce((acc, v) => acc + Math.pow(v - (mean || 0), 2), 0) / numericValues.length;
      std = Number(Math.sqrt(variance).toFixed(2));

      // Sample Skewness: sum((x - mean)^3) / ((N-1) * std^3)
      if (numericValues.length > 3 && std > 0) {
        const m3 = numericValues.reduce((acc, v) => acc + Math.pow(v - (mean || 0), 3), 0) / numericValues.length;
        skewness = Number((m3 / Math.pow(std, 3)).toFixed(3));
      } else {
        skewness = 0;
      }

      // Outliers using IQR (Tukey's Fences)
      if (sorted.length >= 8) {
        const q1 = sorted[Math.floor(sorted.length * 0.25)];
        const q3 = sorted[Math.floor(sorted.length * 0.75)];
        const iqr = q3 - q1;
        const lowerFence = q1 - 1.5 * iqr;
        const upperFence = q3 + 1.5 * iqr;
        outlierCount = numericValues.filter((v) => v < lowerFence || v > upperFence).length;
      }

      invalidTypeCount = nonNullCount - numericValues.length;
    }

    return {
      name,
      type,
      missingCount,
      uniqueCount,
      mean,
      median,
      min,
      max,
      std,
      skewness,
      isIdentifier,
      isConstant,
      outlierCount,
      invalidTypeCount,
      categories: type === 'categorical' ? uniqueValues.slice(0, 10) : undefined,
    };
  });

  // 3. Dynamic Target Feature Recommendation
  // We evaluate every column and score its likelihood of being the machine learning target
  let bestTarget = '';
  let highestScore = -1;

  columns.forEach((col, idx) => {
    if (col.isIdentifier || col.isConstant) return;

    let score = 0;
    const colNameLower = col.name.toLowerCase();

    // Keyword match boost
    for (const kw of TARGET_KEYWORDS) {
      if (colNameLower === kw) score += 50;
      else if (colNameLower.includes(kw)) score += 30;
    }

    // Position heuristic: target is frequently the last column in datasets
    if (idx === columns.length - 1) score += 20;

    // Cardinality suitability
    if (col.uniqueCount === 2) {
      score += 25; // Binary classification target
    } else if (col.uniqueCount >= 3 && col.uniqueCount <= 12) {
      score += 20; // Multiclass classification target
    } else if (col.type === 'numeric' && col.uniqueCount > 20 && col.missingCount === 0) {
      score += 15; // Continuous regression target candidate
    }

    // Penalty for high missingness
    const missingRatio = col.missingCount / (rowCount || 1);
    score -= missingRatio * 30;

    if (score > highestScore) {
      highestScore = score;
      bestTarget = col.name;
    }
  });

  // Default fallback if no clear candidate
  if (!bestTarget) {
    const nonIdCols = columns.filter((c) => !c.isIdentifier && !c.isConstant);
    bestTarget = nonIdCols[nonIdCols.length - 1]?.name || columns[columns.length - 1]?.name || '';
  }

  // 4. Determine ML Task Type for the chosen target
  const targetColMeta = columns.find((c) => c.name === bestTarget);
  let suggestedTaskType: MLTaskType = 'unsupervised';

  if (targetColMeta) {
    if (targetColMeta.uniqueCount === 2) {
      suggestedTaskType = 'binary_classification';
    } else if (targetColMeta.type === 'numeric' && targetColMeta.uniqueCount > 12) {
      suggestedTaskType = 'regression';
    } else if (targetColMeta.uniqueCount >= 3 && targetColMeta.uniqueCount <= 15) {
      suggestedTaskType = 'multiclass_classification';
    } else if (targetColMeta.type === 'categorical') {
      suggestedTaskType = targetColMeta.uniqueCount <= 20 ? 'multiclass_classification' : 'unsupervised';
    } else {
      suggestedTaskType = 'binary_classification';
    }
  }

  return {
    columns,
    duplicateCount,
    constantColumnsCount,
    autoDetectedTarget: bestTarget,
    suggestedTaskType,
  };
}

/**
 * Auto-detects delimiter among ',', ';', '\t', '|'
 */
function detectDelimiter(sampleLines: string[]): string {
  const candidateDelimiters = [',', ';', '\t', '|'];
  let bestDelimiter = ',';
  let bestScore = -1;

  for (const delim of candidateDelimiters) {
    const counts = sampleLines.map((line) => {
      let count = 0;
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        if (line[i] === '"') inQuotes = !inQuotes;
        else if (line[i] === delim && !inQuotes) count++;
      }
      return count;
    });

    // Check if count > 0 and consistent across lines
    if (counts.length > 0 && counts[0] > 0) {
      const allSame = counts.every((c) => c === counts[0]);
      const score = (allSame ? 100 : 0) + counts[0];
      if (score > bestScore) {
        bestScore = score;
        bestDelimiter = delim;
      }
    }
  }

  return bestDelimiter;
}

/**
 * Parses raw CSV text string into a clean Dataset object with universal delimiter detection.
 */
export function parseCsvContent(content: string, fileName: string): Dataset {
  const lines = content.trim().split(/\r\n|\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    throw new Error('CSV must contain a header row and at least one record.');
  }

  const delimiter = detectDelimiter(lines.slice(0, Math.min(10, lines.length)));

  // Robust RFC 4180 CSV parser supporting dynamic delimiter
  const parseLine = (text: string, delim: string): string[] => {
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (c === '"') {
        if (inQuotes && text[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === delim && !inQuotes) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += c;
      }
    }
    result.push(cur.trim());
    return result;
  };

  const rawHeaders = parseLine(lines[0], delimiter);
  const headers = rawHeaders.map((h, i) => h.replace(/^["']|["']$/g, '').trim() || `feature_${i + 1}`);

  const rows: DataRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = parseLine(lines[i], delimiter);
    const row: DataRow = {};

    headers.forEach((h, idx) => {
      let rawVal: any = vals[idx] !== undefined ? vals[idx].replace(/^["']|["']$/g, '').trim() : null;
      if (
        rawVal === '' ||
        rawVal === 'null' ||
        rawVal === 'NULL' ||
        rawVal === 'undefined' ||
        rawVal === 'NA' ||
        rawVal === 'N/A' ||
        rawVal === 'NaN' ||
        rawVal === '?' ||
        rawVal === '-'
      ) {
        row[h] = null;
      } else {
        const parsedNum = parsePotentialNumber(rawVal);
        row[h] = parsedNum !== null ? parsedNum : rawVal;
      }
    });

    rows.push(row);
  }

  const { columns, autoDetectedTarget, suggestedTaskType } = analyzeUniversalSchema(rows);

  return {
    id: `uploaded_${Date.now()}`,
    name: fileName.replace(/\.[^/.]+$/, ''),
    domain: 'User Uploaded Tabular Dataset',
    description: `Parsed ${rows.length} rows and ${columns.length} features from ${fileName} (delimiter: '${delimiter === '\t' ? '\\t' : delimiter}').`,
    rows,
    originalRows: JSON.parse(JSON.stringify(rows)),
    columns,
    targetColumn: autoDetectedTarget,
    taskType: suggestedTaskType,
    autoSuggestedTarget: autoDetectedTarget,
    inputFormat: 'csv',
  };
}

/**
 * Parses XLSX or XLS binary ArrayBuffer using SheetJS (xlsx).
 */
export function parseExcelContent(buffer: ArrayBuffer, fileName: string): Dataset {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('Excel workbook contains no valid sheets.');
  }

  const sheet = workbook.Sheets[sheetName];
  const rawJson: any[] = XLSX.utils.sheet_to_json(sheet, { defval: null });

  if (rawJson.length === 0) {
    throw new Error('Excel worksheet contains no data rows.');
  }

  const rows: DataRow[] = (rawJson as Record<string, any>[]).map((r) => {
    const cleanRow: DataRow = {};
    for (const [k, v] of Object.entries(r)) {
      let val: string | number | null = null;
      if (v === '' || v === null || v === undefined || v === 'null' || v === 'NA' || v === 'N/A' || v === '?') {
        val = null;
      } else if (typeof v === 'number') {
        val = v;
      } else {
        const parsedNum = parsePotentialNumber(v);
        val = parsedNum !== null ? parsedNum : (typeof v === 'string' ? v.trim() : String(v));
      }
      cleanRow[k.trim()] = val;
    }
    return cleanRow;
  });

  const { columns, autoDetectedTarget, suggestedTaskType } = analyzeUniversalSchema(rows);

  return {
    id: `uploaded_excel_${Date.now()}`,
    name: fileName.replace(/\.[^/.]+$/, ''),
    domain: 'Excel Workbook Ingestion',
    description: `Parsed sheet '${sheetName}' with ${rows.length} rows and ${columns.length} columns from ${fileName}.`,
    rows,
    originalRows: JSON.parse(JSON.stringify(rows)),
    columns,
    targetColumn: autoDetectedTarget,
    taskType: suggestedTaskType,
    autoSuggestedTarget: autoDetectedTarget,
    inputFormat: 'xlsx',
  };
}
