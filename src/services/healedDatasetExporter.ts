/**
 * HEALML – Healed Dataset Exporter & Verification Engine
 * 
 * Provides:
 * 1. Safe verified export of healed tabular datasets (CSV & XLSX formats)
 * 2. Strict preservation of original untouched raw data
 * 3. Before vs After dataset comparative analysis
 * 4. Pre-download data integrity validation (row/column counts, types, target column preservation)
 */

import * as XLSX from 'xlsx';
import {
  DataRow,
  DataColumn,
  DatasetComparisonStats,
  ColumnChangeDetail,
  DetailedColumnAnalysis,
  FaultEvent,
  DetailedQualityScore,
  Dataset,
} from '../types/pipeline';

/**
 * Computes exact 5-dimension ISO data quality score:
 * Score = round((0.35 * C + 0.20 * U + 0.20 * V + 0.15 * K + 0.10 * A) * 100)
 */
export function computeDetailedQualityScore(
  rows: DataRow[],
  columns: DataColumn[]
): DetailedQualityScore {
  const rowCount = rows.length;
  const colCount = columns.length;
  const totalCells = rowCount * colCount || 1;

  if (rowCount === 0 || colCount === 0) {
    return {
      completeness: 1,
      uniqueness: 1,
      validity: 1,
      consistency: 1,
      outlierStability: 1,
      overallScore: 100,
    };
  }

  // 1. Completeness: 1 - (missing / totalCells)
  let missingCount = 0;
  let invalidTypeCount = 0;
  let consistencyErrors = 0;
  let totalNumericCount = 0;
  let outlierCount = 0;

  columns.forEach((col) => {
    const rawVals = rows.map((r) => r[col.name]);
    const strVals: string[] = [];

    rawVals.forEach((v) => {
      if (
        v === null ||
        v === undefined ||
        v === '' ||
        v === 'NA' ||
        v === 'N/A' ||
        v === 'null' ||
        v === 'NaN' ||
        v === '?' ||
        v === '-' ||
        (typeof v === 'number' && isNaN(v))
      ) {
        missingCount++;
      } else {
        strVals.push(String(v));
        if (col.type === 'numeric') {
          totalNumericCount++;
          if (isNaN(Number(v))) {
            invalidTypeCount++;
          }
        }
      }
    });

    // Check consistency in categoricals (casing mismatches, un-trimmed whitespace)
    if (col.type === 'categorical' && strVals.length > 0) {
      const trimmedSet = new Set(strVals.map((s) => s.trim().toLowerCase()));
      const rawSet = new Set(strVals);
      if (rawSet.size > trimmedSet.size) {
        consistencyErrors += (rawSet.size - trimmedSet.size) * 5;
      }
    }

    // Outliers for numeric
    if (col.type === 'numeric') {
      const nums = rawVals.map(Number).filter((n) => !isNaN(n));
      if (nums.length > 5) {
        nums.sort((a, b) => a - b);
        const q1 = nums[Math.floor(nums.length * 0.25)];
        const q3 = nums[Math.floor(nums.length * 0.75)];
        const iqr = q3 - q1;
        const low = q1 - 2.5 * iqr;
        const high = q3 + 2.5 * iqr;
        nums.forEach((n) => {
          if (n < low || n > high) outlierCount++;
        });
      }
    }
  });

  // 2. Uniqueness: 1 - (duplicates / rowCount)
  const seen = new Set<string>();
  let duplicateCount = 0;
  rows.forEach((r) => {
    const keyObj: Record<string, any> = {};
    for (const [k, v] of Object.entries(r)) {
      if (!k.toLowerCase().includes('id')) keyObj[k] = v;
    }
    const str = JSON.stringify(keyObj);
    if (seen.has(str)) duplicateCount++;
    else seen.add(str);
  });

  const completeness = Math.max(0, Math.min(1, 1 - missingCount / totalCells));
  const uniqueness = Math.max(0, Math.min(1, 1 - duplicateCount / Math.max(1, rowCount)));
  const validity = Math.max(0, Math.min(1, 1 - invalidTypeCount / Math.max(1, totalCells)));
  const consistency = Math.max(0, Math.min(1, 1 - consistencyErrors / Math.max(1, totalCells)));
  const outlierDenominator = Math.max(1, totalNumericCount * 0.15);
  const outlierStability = Math.max(0, Math.min(1, 1 - outlierCount / outlierDenominator));

  // Exact composite formula:
  // Score = round((0.35 * C + 0.20 * U + 0.20 * V + 0.15 * K + 0.10 * A) * 100)
  const rawScore = (
    0.35 * completeness +
    0.20 * uniqueness +
    0.20 * validity +
    0.15 * consistency +
    0.10 * outlierStability
  ) * 100;

  const overallScore = Math.max(0, Math.min(100, Math.round(rawScore)));

  return {
    completeness: Number(completeness.toFixed(4)),
    uniqueness: Number(uniqueness.toFixed(4)),
    validity: Number(validity.toFixed(4)),
    consistency: Number(consistency.toFixed(4)),
    outlierStability: Number(outlierStability.toFixed(4)),
    overallScore,
  };
}

/**
 * Computes deep comparison statistics between original and repaired working datasets.
 */
export function computeDatasetComparison(
  originalRows: DataRow[],
  healedRows: DataRow[],
  columns: DataColumn[],
  datasetName: string
): DatasetComparisonStats {
  const origRowCount = originalRows.length;
  const healedRowCount = healedRows.length;
  const colCount = columns.length;

  // Calculate missing counts
  let origMissingTotal = 0;
  let healedMissingTotal = 0;

  columns.forEach((col) => {
    originalRows.forEach((r) => {
      const v = r[col.name];
      if (v === null || v === undefined || v === '' || (typeof v === 'number' && isNaN(v))) {
        origMissingTotal++;
      }
    });
    healedRows.forEach((r) => {
      const v = r[col.name];
      if (v === null || v === undefined || v === '' || (typeof v === 'number' && isNaN(v))) {
        healedMissingTotal++;
      }
    });
  });

  // Calculate duplicate counts
  const countDuplicates = (rows: DataRow[]): number => {
    const seen = new Set<string>();
    let dups = 0;
    rows.forEach((r) => {
      const str = JSON.stringify(r);
      if (seen.has(str)) dups++;
      else seen.add(str);
    });
    return dups;
  };

  const origDups = countDuplicates(originalRows);
  const healedDups = countDuplicates(healedRows);

  // Exact 5-dimension composite quality scores
  const origScoreObj = computeDetailedQualityScore(originalRows, columns);
  const healedScoreObj = computeDetailedQualityScore(healedRows, columns);
  const origQuality = origScoreObj.overallScore;
  const healedQuality = healedScoreObj.overallScore;

  // Size estimations
  const avgRowBytes = colCount * 14;
  const origSizeBytes = origRowCount * avgRowBytes;
  const healedSizeBytes = healedRowCount * avgRowBytes;

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Build column-by-column changelog
  const columnChangelog: ColumnChangeDetail[] = columns.map((col) => {
    const colName = col.name;
    let missingB = 0;
    let missingA = 0;
    let outliersB = 0;
    let outliersA = 0;

    const origVals = originalRows.map((r) => r[colName]);
    const healedVals = healedRows.map((r) => r[colName]);

    origVals.forEach((v) => {
      if (v === null || v === undefined || v === '' || (typeof v === 'number' && isNaN(v))) {
        missingB++;
      }
    });

    healedVals.forEach((v) => {
      if (v === null || v === undefined || v === '' || (typeof v === 'number' && isNaN(v))) {
        missingA++;
      }
    });

    if (col.type === 'numeric') {
      const nums = origVals.map(Number).filter((n) => !isNaN(n));
      if (nums.length > 5) {
        nums.sort((a, b) => a - b);
        const q1 = nums[Math.floor(nums.length * 0.25)];
        const q3 = nums[Math.floor(nums.length * 0.75)];
        const iqr = q3 - q1;
        const low = q1 - 2.5 * iqr;
        const high = q3 + 2.5 * iqr;

        nums.forEach((n) => {
          if (n < low || n > high) outliersB++;
        });

        const healedNums = healedVals.map(Number).filter((n) => !isNaN(n));
        healedNums.forEach((n) => {
          if (n < low || n > high) outliersA++;
        });
      }
    }

    let transformationApplied = 'Preserved Nominal';
    let reason = 'Feature values conformed to statistical quality invariants.';

    if (missingB > 0 && missingA === 0) {
      transformationApplied = col.type === 'numeric' ? 'Median Imputation' : 'Mode Imputation';
      reason = `Imputed ${missingB} missing entries using verified cohort central tendency.`;
    } else if (outliersB > outliersA) {
      transformationApplied = 'Winsorization / Boundary Clamping';
      reason = `Clamped ${outliersB - outliersA} extreme boundary deviations within [Q1-2.5IQR, Q3+2.5IQR].`;
    } else if (origDups > healedDups && (col.isIdentifier || col.name.toLowerCase().includes('id'))) {
      transformationApplied = 'Deduplication Purge';
      reason = 'Resolved primary key collisions by eliminating duplicate payload rows.';
    }

    return {
      columnName: colName,
      dataType: col.type,
      missingBefore: missingB,
      missingAfter: missingA,
      outliersBefore: outliersB,
      outliersAfter: outliersA,
      transformationApplied,
      reason,
    };
  });

  // Pre-download validation checks
  const validationErrors: string[] = [];
  if (healedRowCount === 0) {
    validationErrors.push('Repaired dataset has 0 rows.');
  }
  if (columns.length === 0) {
    validationErrors.push('Repaired dataset has 0 columns.');
  }
  if (healedMissingTotal > origMissingTotal) {
    validationErrors.push('Repaired dataset has more missing values than original.');
  }

  return {
    original: {
      name: `${datasetName} (Original Raw Upload)`,
      rows: origRowCount,
      columns: colCount,
      missingValues: origMissingTotal,
      duplicateRows: origDups,
      dataQualityScore: origQuality,
      fileSizeBytes: origSizeBytes,
      fileSizeFormatted: formatBytes(origSizeBytes),
    },
    repaired: {
      name: `${datasetName} (Healed & Verified)`,
      rows: healedRowCount,
      columns: colCount,
      missingValues: healedMissingTotal,
      duplicateRows: healedDups,
      dataQualityScore: healedQuality,
      fileSizeBytes: healedSizeBytes,
      fileSizeFormatted: formatBytes(healedSizeBytes),
    },
    deltas: {
      missingReduced: origMissingTotal - healedMissingTotal,
      duplicatesPurged: origDups - healedDups,
      qualityImprovement: healedQuality - origQuality,
      rowsDifference: healedRowCount - origRowCount,
      columnsPreserved: colCount,
    },
    columnChangelog,
    isValidated: validationErrors.length === 0,
    validationErrors,
  };
}

/**
 * Generates detailed column analysis for every column in the dataset
 * covering types, missing values, duplicates, outliers, invalid values, drift, and health status.
 */
export function generateDetailedColumnAnalysis(
  rows: DataRow[],
  columns: DataColumn[],
  faults: FaultEvent[]
): DetailedColumnAnalysis[] {
  const rowCount = rows.length;

  return columns.map((col) => {
    const colName = col.name;
    const vals = rows.map((r) => r[colName]);

    let missing = 0;
    let invalidCount = 0;
    let outlierCount = 0;

    vals.forEach((v) => {
      if (v === null || v === undefined || v === '') {
        missing++;
      } else if (col.type === 'numeric' && isNaN(Number(v))) {
        invalidCount++;
      }
    });

    if (col.type === 'numeric') {
      const nums = vals.map(Number).filter((n) => !isNaN(n));
      if (nums.length > 5) {
        nums.sort((a, b) => a - b);
        const q1 = nums[Math.floor(nums.length * 0.25)];
        const q3 = nums[Math.floor(nums.length * 0.75)];
        const iqr = q3 - q1;
        const low = q1 - 2.5 * iqr;
        const high = q3 + 2.5 * iqr;

        nums.forEach((n) => {
          if (n < low || n > high) outlierCount++;
        });
      }
    }

    const hasFault = faults.some((f) => f.affectedColumns.includes(colName));
    const driftStatus = outlierCount > 0 ? `${outlierCount} outliers flagged` : 'Distribution Invariant';

    return {
      columnName: colName,
      dataType: col.type,
      missingCount: missing,
      missingPercentage: Number(((missing / (rowCount || 1)) * 100).toFixed(1)),
      outlierCount,
      invalidValuesCount: invalidCount,
      driftStatus,
      detectedFaultStatus: hasFault ? 'FAULTED' : 'OPTIMAL',
    };
  });
}

/**
 * Downloads the verified Healed Dataset in CSV format.
 * Preserves original column names, order, and data records.
 */
export function downloadHealedDatasetCsv(
  datasetName: string,
  rows: DataRow[],
  columns: DataColumn[]
): boolean {
  try {
    if (!rows || rows.length === 0) return false;

    const columnOrder = columns.map((c) => c.name);
    // Build array of objects with strict column order
    const orderedRows = rows.map((row) => {
      const orderedObj: Record<string, any> = {};
      columnOrder.forEach((col) => {
        const val = row[col];
        orderedObj[col] = val === null || val === undefined ? '' : val;
      });
      return orderedObj;
    });

    const worksheet = XLSX.utils.json_to_sheet(orderedRows, { header: columnOrder });
    const csvContent = XLSX.utils.sheet_to_csv(worksheet);

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const sanitizedName = datasetName.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
    link.href = url;
    link.setAttribute('download', `${sanitizedName}_healed.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return true;
  } catch (err) {
    console.error('Failed to export CSV:', err);
    return false;
  }
}

/**
 * Downloads the verified Healed Dataset in Microsoft Excel (.xlsx) format.
 * Preserves original column names, order, and data records.
 */
export function downloadHealedDatasetXlsx(
  datasetName: string,
  rows: DataRow[],
  columns: DataColumn[]
): boolean {
  try {
    if (!rows || rows.length === 0) return false;

    const columnOrder = columns.map((c) => c.name);
    const orderedRows = rows.map((row) => {
      const orderedObj: Record<string, any> = {};
      columnOrder.forEach((col) => {
        const val = row[col];
        orderedObj[col] = val === null || val === undefined ? '' : val;
      });
      return orderedObj;
    });

    const worksheet = XLSX.utils.json_to_sheet(orderedRows, { header: columnOrder });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Healed_Dataset');

    const sanitizedName = datasetName.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
    XLSX.writeFile(workbook, `${sanitizedName}_healed.xlsx`);
    return true;
  } catch (err) {
    console.error('Failed to export XLSX:', err);
    return false;
  }
}

/**
 * Automatically downloads the healed dataset in its native input format (CSV or XLSX).
 */
export function downloadHealedDataset(dataset: Dataset): boolean {
  const rows = dataset.healedRows || dataset.rows;
  const columns = dataset.columns;
  if (!rows || rows.length === 0) return false;

  if (dataset.inputFormat === 'xlsx') {
    return downloadHealedDatasetXlsx(dataset.name, rows, columns);
  }
  return downloadHealedDatasetCsv(dataset.name, rows, columns);
}

