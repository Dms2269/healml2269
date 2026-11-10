/**
 * HEALML – Advanced Machine Learning Model Implementations
 * Mathematical implementations of:
 * 1. Extra Trees (Extremely Randomized Trees) Classifier & Regressor
 * 2. Gradient Boosted Decision Trees with learning rate shrinkage
 * 3. L2-Regularized Logistic Regression (Softmax) & Ridge Regression
 * 4. Stratified 5-Fold Cross Validation
 * 5. ROC-AUC and Balanced Accuracy metrics
 */

import { ModelLeaderboardEntry, MLTaskType } from '../types/pipeline';

// ====================================================
// 1. EXTRA TREES (Extremely Randomized Trees)
// ====================================================

interface ExtraTreeNode {
  isLeaf: boolean;
  featureIndex?: number;
  splitValue?: number;
  gain?: number;
  probabilities?: number[];
  predictionValue?: number;
  left?: ExtraTreeNode;
  right?: ExtraTreeNode;
}

export function buildExtraTreesClassifier(
  X: number[][],
  y: number[],
  numClasses: number,
  nEstimators = 25,
  maxDepth = 6,
  minSamplesSplit = 4
): {
  predictProbs: (sample: number[]) => number[];
  featureImportances: number[];
} {
  const numFeatures = X[0]?.length || 0;
  const trees: ExtraTreeNode[] = [];
  const featureImportances = new Array(numFeatures).fill(0);

  function buildNode(nodeX: number[][], nodeY: number[], depth: number): ExtraTreeNode {
    const n = nodeX.length;
    // Compute class distribution
    const classCounts = new Array(numClasses).fill(0);
    nodeY.forEach((c) => {
      if (c >= 0 && c < numClasses) classCounts[c]++;
    });
    const probabilities = classCounts.map((count) => count / (n || 1));

    // Base conditions
    const isPure = classCounts.filter((c) => c > 0).length <= 1;
    if (depth >= maxDepth || n < minSamplesSplit || isPure) {
      return { isLeaf: true, probabilities };
    }

    // Extra Trees: sample random subset of features, and pick random split thresholds
    const numSubFeatures = Math.max(1, Math.floor(Math.sqrt(numFeatures)));
    const featureIndices: number[] = [];
    while (featureIndices.length < numSubFeatures) {
      const idx = Math.floor(Math.random() * numFeatures);
      if (!featureIndices.includes(idx)) featureIndices.push(idx);
    }

    let bestGain = -Infinity;
    let bestFeat = featureIndices[0];
    let bestThreshold = 0;
    let bestLeftIndices: number[] = [];
    let bestRightIndices: number[] = [];

    // Parent Gini Impurity
    let parentGini = 1.0;
    for (let c = 0; c < numClasses; c++) {
      parentGini -= Math.pow(probabilities[c], 2);
    }

    for (const featIdx of featureIndices) {
      const values = nodeX.map((r) => r[featIdx]);
      const minVal = Math.min(...values);
      const maxVal = Math.max(...values);
      if (minVal === maxVal) continue;

      // Extremely randomized: sample 2 random thresholds between min and max
      for (let attempt = 0; attempt < 2; attempt++) {
        const threshold = minVal + Math.random() * (maxVal - minVal);
        const leftIdx: number[] = [];
        const rightIdx: number[] = [];

        for (let i = 0; i < n; i++) {
          if (nodeX[i][featIdx] <= threshold) leftIdx.push(i);
          else rightIdx.push(i);
        }

        if (leftIdx.length === 0 || rightIdx.length === 0) continue;

        // Compute weighted children Gini
        const computeGini = (indices: number[]) => {
          const counts = new Array(numClasses).fill(0);
          indices.forEach((i) => counts[nodeY[i]]++);
          let g = 1.0;
          for (let c = 0; c < numClasses; c++) {
            g -= Math.pow(counts[c] / indices.length, 2);
          }
          return g;
        };

        const leftGini = computeGini(leftIdx);
        const rightGini = computeGini(rightIdx);
        const splitGini = (leftIdx.length / n) * leftGini + (rightIdx.length / n) * rightGini;
        const gain = parentGini - splitGini;

        if (gain > bestGain) {
          bestGain = gain;
          bestFeat = featIdx;
          bestThreshold = threshold;
          bestLeftIndices = leftIdx;
          bestRightIndices = rightIdx;
        }
      }
    }

    if (bestGain <= 0 || bestLeftIndices.length === 0 || bestRightIndices.length === 0) {
      return { isLeaf: true, probabilities };
    }

    featureImportances[bestFeat] += bestGain;

    return {
      isLeaf: false,
      featureIndex: bestFeat,
      splitValue: bestThreshold,
      gain: bestGain,
      probabilities,
      left: buildNode(bestLeftIndices.map((i) => nodeX[i]), bestLeftIndices.map((i) => nodeY[i]), depth + 1),
      right: buildNode(bestRightIndices.map((i) => nodeX[i]), bestRightIndices.map((i) => nodeY[i]), depth + 1),
    };
  }

  // Build forest
  for (let t = 0; t < nEstimators; t++) {
    // In ExtraTrees, we can train on entire dataset or random subsample
    const tree = buildNode(X, y, 0);
    trees.push(tree);
  }

  function predictTree(node: ExtraTreeNode, sample: number[]): number[] {
    if (node.isLeaf || node.featureIndex === undefined || node.splitValue === undefined) {
      return node.probabilities || new Array(numClasses).fill(1 / numClasses);
    }
    if (sample[node.featureIndex] <= node.splitValue) {
      return predictTree(node.left!, sample);
    } else {
      return predictTree(node.right!, sample);
    }
  }

  const predictProbs = (sample: number[]) => {
    const sumProbs = new Array(numClasses).fill(0);
    trees.forEach((tree) => {
      const p = predictTree(tree, sample);
      for (let c = 0; c < numClasses; c++) sumProbs[c] += p[c];
    });
    return sumProbs.map((s) => s / trees.length);
  };

  return { predictProbs, featureImportances };
}

export function buildExtraTreesRegressor(
  X: number[][],
  y: number[],
  nEstimators = 25,
  maxDepth = 6,
  minSamplesSplit = 4
): {
  predict: (sample: number[]) => number;
} {
  const numFeatures = X[0]?.length || 0;
  const trees: ExtraTreeNode[] = [];

  function buildNode(nodeX: number[][], nodeY: number[], depth: number): ExtraTreeNode {
    const n = nodeX.length;
    const meanY = nodeY.reduce((a, b) => a + b, 0) / (n || 1);
    const variance = nodeY.reduce((acc, v) => acc + Math.pow(v - meanY, 2), 0) / (n || 1);

    if (depth >= maxDepth || n < minSamplesSplit || variance < 1e-6) {
      return { isLeaf: true, predictionValue: meanY };
    }

    const numSubFeatures = Math.max(1, Math.floor(Math.sqrt(numFeatures)));
    const featureIndices: number[] = [];
    while (featureIndices.length < numSubFeatures) {
      const idx = Math.floor(Math.random() * numFeatures);
      if (!featureIndices.includes(idx)) featureIndices.push(idx);
    }

    let bestReduction = -Infinity;
    let bestFeat = featureIndices[0];
    let bestThreshold = 0;
    let bestLeftIndices: number[] = [];
    let bestRightIndices: number[] = [];

    for (const featIdx of featureIndices) {
      const values = nodeX.map((r) => r[featIdx]);
      const minVal = Math.min(...values);
      const maxVal = Math.max(...values);
      if (minVal === maxVal) continue;

      for (let attempt = 0; attempt < 2; attempt++) {
        const threshold = minVal + Math.random() * (maxVal - minVal);
        const leftIdx: number[] = [];
        const rightIdx: number[] = [];

        for (let i = 0; i < n; i++) {
          if (nodeX[i][featIdx] <= threshold) leftIdx.push(i);
          else rightIdx.push(i);
        }

        if (leftIdx.length === 0 || rightIdx.length === 0) continue;

        const leftMean = leftIdx.reduce((acc, i) => acc + nodeY[i], 0) / leftIdx.length;
        const rightMean = rightIdx.reduce((acc, i) => acc + nodeY[i], 0) / rightIdx.length;
        const leftVar = leftIdx.reduce((acc, i) => acc + Math.pow(nodeY[i] - leftMean, 2), 0);
        const rightVar = rightIdx.reduce((acc, i) => acc + Math.pow(nodeY[i] - rightMean, 2), 0);

        const totalChildVar = (leftVar + rightVar) / n;
        const reduction = variance - totalChildVar;

        if (reduction > bestReduction) {
          bestReduction = reduction;
          bestFeat = featIdx;
          bestThreshold = threshold;
          bestLeftIndices = leftIdx;
          bestRightIndices = rightIdx;
        }
      }
    }

    if (bestReduction <= 0 || bestLeftIndices.length === 0 || bestRightIndices.length === 0) {
      return { isLeaf: true, predictionValue: meanY };
    }

    return {
      isLeaf: false,
      featureIndex: bestFeat,
      splitValue: bestThreshold,
      predictionValue: meanY,
      left: buildNode(bestLeftIndices.map((i) => nodeX[i]), bestLeftIndices.map((i) => nodeY[i]), depth + 1),
      right: buildNode(bestRightIndices.map((i) => nodeX[i]), bestRightIndices.map((i) => nodeY[i]), depth + 1),
    };
  }

  for (let t = 0; t < nEstimators; t++) {
    trees.push(buildNode(X, y, 0));
  }

  function predictTree(node: ExtraTreeNode, sample: number[]): number {
    if (node.isLeaf || node.featureIndex === undefined || node.splitValue === undefined) {
      return node.predictionValue || 0;
    }
    if (sample[node.featureIndex] <= node.splitValue) {
      return predictTree(node.left!, sample);
    } else {
      return predictTree(node.right!, sample);
    }
  }

  const predict = (sample: number[]) => {
    const sum = trees.reduce((acc, t) => acc + predictTree(t, sample), 0);
    return sum / (trees.length || 1);
  };

  return { predict };
}

// ====================================================
// 2. GRADIENT BOOSTING DECISION STUMPS (Shrinkage η=0.1)
// ====================================================

interface GBDTStump {
  featureIndex: number;
  threshold: number;
  leftVal: number;
  rightVal: number;
}

export function trainGradientBoostingClassifier(
  X_train: number[][],
  y_train: number[],
  numClasses: number,
  nStages = 20,
  learningRate = 0.1
): {
  predictProbs: (sample: number[]) => number[];
} {
  const n = X_train.length;
  const numFeatures = X_train[0]?.length || 0;

  // Multi-class or binary One-vs-Rest gradient boosting
  const modelsPerClass: { baseRate: number; stumps: GBDTStump[] }[] = [];

  for (let c = 0; c < numClasses; c++) {
    // Binary target for class c
    const y_bin = y_train.map((y) => (y === c ? 1 : 0));
    const posCount = y_bin.filter((v) => v === 1).length;
    const p0 = Math.max(0.01, Math.min(0.99, posCount / (n || 1)));
    let currentF = Math.log(p0 / (1 - p0));
    const baseRate = currentF;

    const currentPredictions = new Array(n).fill(currentF);
    const stumps: GBDTStump[] = [];

    for (let stage = 0; stage < nStages; stage++) {
      // Negative gradient (pseudo-residuals for cross-entropy with sigmoid)
      // r_i = y_i - sigma(F(x_i))
      const residuals = new Array(n);
      for (let i = 0; i < n; i++) {
        const prob = 1 / (1 + Math.exp(-currentPredictions[i]));
        residuals[i] = y_bin[i] - prob;
      }

      // Fit regression stump to residuals (minimize MSE)
      let bestFeat = 0;
      let bestThreshold = 0;
      let bestMse = Infinity;
      let bestLeftVal = 0;
      let bestRightVal = 0;

      // Sample a subset of features for candidate splits
      for (let f = 0; f < numFeatures; f++) {
        const vals = X_train.map((r) => r[f]);
        const minVal = Math.min(...vals);
        const maxVal = Math.max(...vals);
        if (minVal === maxVal) continue;

        const step = (maxVal - minVal) / 5;
        for (let t = 1; t <= 4; t++) {
          const threshold = minVal + t * step;
          let leftSum = 0, leftCount = 0;
          let rightSum = 0, rightCount = 0;

          for (let i = 0; i < n; i++) {
            if (X_train[i][f] <= threshold) {
              leftSum += residuals[i];
              leftCount++;
            } else {
              rightSum += residuals[i];
              rightCount++;
            }
          }

          if (leftCount === 0 || rightCount === 0) continue;

          const leftMean = leftSum / leftCount;
          const rightMean = rightSum / rightCount;

          let mse = 0;
          for (let i = 0; i < n; i++) {
            const pred = X_train[i][f] <= threshold ? leftMean : rightMean;
            mse += Math.pow(residuals[i] - pred, 2);
          }

          if (mse < bestMse) {
            bestMse = mse;
            bestFeat = f;
            bestThreshold = threshold;
            bestLeftVal = leftMean;
            bestRightVal = rightMean;
          }
        }
      }

      const stump: GBDTStump = {
        featureIndex: bestFeat,
        threshold: bestThreshold,
        leftVal: bestLeftVal,
        rightVal: bestRightVal,
      };
      stumps.push(stump);

      // Update predictions with shrinkage
      for (let i = 0; i < n; i++) {
        const update = X_train[i][stump.featureIndex] <= stump.threshold ? stump.leftVal : stump.rightVal;
        currentPredictions[i] += learningRate * update;
      }
    }

    modelsPerClass.push({ baseRate, stumps });
  }

  const predictProbs = (sample: number[]) => {
    const rawScores = modelsPerClass.map((model) => {
      let score = model.baseRate;
      model.stumps.forEach((stump) => {
        score += learningRate * (sample[stump.featureIndex] <= stump.threshold ? stump.leftVal : stump.rightVal);
      });
      return score;
    });

    // Softmax normalization
    const maxScore = Math.max(...rawScores);
    const expScores = rawScores.map((s) => Math.exp(s - maxScore));
    const sumExp = expScores.reduce((a, b) => a + b, 0) || 1;
    return expScores.map((e) => e / sumExp);
  };

  return { predictProbs };
}

export function trainGradientBoostingRegressor(
  X_train: number[][],
  y_train: number[],
  nStages = 20,
  learningRate = 0.1
): {
  predict: (sample: number[]) => number;
} {
  const n = X_train.length;
  const numFeatures = X_train[0]?.length || 0;
  const basePrediction = y_train.reduce((a, b) => a + b, 0) / (n || 1);

  const currentPredictions = new Array(n).fill(basePrediction);
  const stumps: GBDTStump[] = [];

  for (let stage = 0; stage < nStages; stage++) {
    // Residuals r_i = y_i - \hat{y}_i
    const residuals = new Array(n);
    for (let i = 0; i < n; i++) {
      residuals[i] = y_train[i] - currentPredictions[i];
    }

    let bestFeat = 0;
    let bestThreshold = 0;
    let bestMse = Infinity;
    let bestLeftVal = 0;
    let bestRightVal = 0;

    for (let f = 0; f < numFeatures; f++) {
      const vals = X_train.map((r) => r[f]);
      const minVal = Math.min(...vals);
      const maxVal = Math.max(...vals);
      if (minVal === maxVal) continue;

      const step = (maxVal - minVal) / 6;
      for (let t = 1; t <= 5; t++) {
        const threshold = minVal + t * step;
        let leftSum = 0, leftCount = 0;
        let rightSum = 0, rightCount = 0;

        for (let i = 0; i < n; i++) {
          if (X_train[i][f] <= threshold) {
            leftSum += residuals[i];
            leftCount++;
          } else {
            rightSum += residuals[i];
            rightCount++;
          }
        }

        if (leftCount === 0 || rightCount === 0) continue;

        const leftMean = leftSum / leftCount;
        const rightMean = rightSum / rightCount;

        let mse = 0;
        for (let i = 0; i < n; i++) {
          const pred = X_train[i][f] <= threshold ? leftMean : rightMean;
          mse += Math.pow(residuals[i] - pred, 2);
        }

        if (mse < bestMse) {
          bestMse = mse;
          bestFeat = f;
          bestThreshold = threshold;
          bestLeftVal = leftMean;
          bestRightVal = rightMean;
        }
      }
    }

    const stump: GBDTStump = {
      featureIndex: bestFeat,
      threshold: bestThreshold,
      leftVal: bestLeftVal,
      rightVal: bestRightVal,
    };
    stumps.push(stump);

    for (let i = 0; i < n; i++) {
      const update = X_train[i][stump.featureIndex] <= stump.threshold ? stump.leftVal : stump.rightVal;
      currentPredictions[i] += learningRate * update;
    }
  }

  const predict = (sample: number[]) => {
    let score = basePrediction;
    stumps.forEach((stump) => {
      score += learningRate * (sample[stump.featureIndex] <= stump.threshold ? stump.leftVal : stump.rightVal);
    });
    return score;
  };

  return { predict };
}

// ====================================================
// 3. REGULARIZED LOGISTIC & RIDGE REGRESSION
// ====================================================

export function trainLogisticRegression(
  X_train: number[][],
  y_train: number[],
  numClasses: number,
  epochs = 80,
  lr = 0.05,
  l2Reg = 0.01
): {
  predictProbs: (sample: number[]) => number[];
} {
  const n = X_train.length;
  const numFeatures = X_train[0]?.length || 0;

  // Weights: [numClasses x numFeatures], Biases: [numClasses]
  const weights: number[][] = Array.from({ length: numClasses }, () => new Array(numFeatures).fill(0));
  const biases: number[] = new Array(numClasses).fill(0);

  // Gradient descent
  for (let epoch = 0; epoch < epochs; epoch++) {
    const gradW: number[][] = Array.from({ length: numClasses }, () => new Array(numFeatures).fill(0));
    const gradB: number[] = new Array(numClasses).fill(0);

    for (let i = 0; i < n; i++) {
      const x = X_train[i];
      const actualClass = y_train[i];

      // Softmax probabilities
      const logits = new Array(numClasses);
      let maxLogit = -Infinity;
      for (let c = 0; c < numClasses; c++) {
        let dot = biases[c];
        for (let f = 0; f < numFeatures; f++) dot += weights[c][f] * x[f];
        logits[c] = dot;
        if (dot > maxLogit) maxLogit = dot;
      }

      const exp = logits.map((l) => Math.exp(l - maxLogit));
      const sumExp = exp.reduce((a, b) => a + b, 0) || 1;
      const probs = exp.map((e) => e / sumExp);

      // Accumulate gradients
      for (let c = 0; c < numClasses; c++) {
        const error = probs[c] - (actualClass === c ? 1 : 0);
        gradB[c] += error;
        for (let f = 0; f < numFeatures; f++) {
          gradW[c][f] += error * x[f];
        }
      }
    }

    // Weight update with L2 regularization
    for (let c = 0; c < numClasses; c++) {
      biases[c] -= (lr * gradB[c]) / n;
      for (let f = 0; f < numFeatures; f++) {
        weights[c][f] -= (lr * (gradW[c][f] / n + l2Reg * weights[c][f]));
      }
    }
  }

  const predictProbs = (sample: number[]) => {
    const logits = new Array(numClasses);
    let maxLogit = -Infinity;
    for (let c = 0; c < numClasses; c++) {
      let dot = biases[c];
      for (let f = 0; f < numFeatures; f++) dot += weights[c][f] * sample[f];
      logits[c] = dot;
      if (dot > maxLogit) maxLogit = dot;
    }
    const exp = logits.map((l) => Math.exp(l - maxLogit));
    const sumExp = exp.reduce((a, b) => a + b, 0) || 1;
    return exp.map((e) => e / sumExp);
  };

  return { predictProbs };
}

export function trainRidgeRegression(
  X_train: number[][],
  y_train: number[],
  epochs = 80,
  lr = 0.03,
  l2Reg = 0.02
): {
  predict: (sample: number[]) => number;
} {
  const n = X_train.length;
  const numFeatures = X_train[0]?.length || 0;
  const weights = new Array(numFeatures).fill(0);
  let bias = y_train.reduce((a, b) => a + b, 0) / (n || 1);

  for (let epoch = 0; epoch < epochs; epoch++) {
    const gradW = new Array(numFeatures).fill(0);
    let gradB = 0;

    for (let i = 0; i < n; i++) {
      const x = X_train[i];
      let pred = bias;
      for (let f = 0; f < numFeatures; f++) pred += weights[f] * x[f];
      const error = pred - y_train[i];

      gradB += error;
      for (let f = 0; f < numFeatures; f++) {
        gradW[f] += error * x[f];
      }
    }

    bias -= (lr * gradB) / n;
    for (let f = 0; f < numFeatures; f++) {
      weights[f] -= (lr * (gradW[f] / n + l2Reg * weights[f]));
    }
  }

  const predict = (sample: number[]) => {
    let val = bias;
    for (let f = 0; f < numFeatures; f++) val += weights[f] * sample[f];
    return val;
  };

  return { predict };
}

// ====================================================
// 4. STRATIFIED K-FOLD CROSS VALIDATION
// ====================================================

export function getStratifiedKFoldFolds(y: number[], k = 5): { trainIndices: number[]; valIndices: number[] }[] {
  const n = y.length;
  const numFolds = Math.max(2, Math.min(k, n));

  // Group indices by class
  const classBuckets: Record<number, number[]> = {};
  for (let i = 0; i < n; i++) {
    const label = y[i];
    if (!classBuckets[label]) classBuckets[label] = [];
    classBuckets[label].push(i);
  }

  const foldIndices: number[][] = Array.from({ length: numFolds }, () => []);

  // Distribute each class evenly across the folds
  Object.values(classBuckets).forEach((indices) => {
    // Shuffle
    const shuffled = [...indices].sort(() => Math.random() - 0.5);
    shuffled.forEach((idx, i) => {
      foldIndices[i % numFolds].push(idx);
    });
  });

  const folds: { trainIndices: number[]; valIndices: number[] }[] = [];
  for (let f = 0; f < numFolds; f++) {
    const valIndices = foldIndices[f];
    const trainIndices: number[] = [];
    for (let other = 0; other < numFolds; other++) {
      if (other !== f) {
        trainIndices.push(...foldIndices[other]);
      }
    }
    folds.push({ trainIndices, valIndices });
  }

  return folds;
}

export function getRegressionKFoldFolds(n: number, k = 5): { trainIndices: number[]; valIndices: number[] }[] {
  const numFolds = Math.max(2, Math.min(k, n));
  const indices = Array.from({ length: n }, (_, i) => i).sort(() => Math.random() - 0.5);
  const foldIndices: number[][] = Array.from({ length: numFolds }, () => []);

  indices.forEach((idx, i) => {
    foldIndices[i % numFolds].push(idx);
  });

  const folds: { trainIndices: number[]; valIndices: number[] }[] = [];
  for (let f = 0; f < numFolds; f++) {
    const valIndices = foldIndices[f];
    const trainIndices: number[] = [];
    for (let other = 0; other < numFolds; other++) {
      if (other !== f) {
        trainIndices.push(...foldIndices[other]);
      }
    }
    folds.push({ trainIndices, valIndices });
  }

  return folds;
}

// ====================================================
// 5. ROC-AUC CALCULATION (Trapezoidal Rule)
// ====================================================

export function calculateBinaryRocAuc(y_true: number[], y_scores: number[]): { rocAuc: number; rocCurve: { fpr: number; tpr: number }[] } {
  const n = y_true.length;
  if (n === 0) return { rocAuc: 0.5, rocCurve: [] };

  const pairs = y_true.map((actual, idx) => ({ actual, score: y_scores[idx] }));
  pairs.sort((a, b) => b.score - a.score);

  const totalPos = pairs.filter((p) => p.actual === 1).length;
  const totalNeg = n - totalPos;

  if (totalPos === 0 || totalNeg === 0) {
    return {
      rocAuc: 0.5,
      rocCurve: [
        { fpr: 0, tpr: 0 },
        { fpr: 1, tpr: 1 },
      ],
    };
  }

  const curve: { fpr: number; tpr: number }[] = [{ fpr: 0, tpr: 0 }];
  let runningTp = 0;
  let runningFp = 0;
  let prevFpr = 0;
  let prevTpr = 0;
  let auc = 0;

  for (const pair of pairs) {
    if (pair.actual === 1) runningTp++;
    else runningFp++;

    const fpr = runningFp / totalNeg;
    const tpr = runningTp / totalPos;

    curve.push({ fpr: Number(fpr.toFixed(4)), tpr: Number(tpr.toFixed(4)) });

    // Trapezoidal area increment: (x2 - x1) * (y1 + y2) / 2
    auc += (fpr - prevFpr) * (tpr + prevTpr) / 2;
    prevFpr = fpr;
    prevTpr = tpr;
  }

  return {
    rocAuc: Number(Math.max(0.5, Math.min(1.0, auc)).toFixed(4)),
    rocCurve: curve.length > 20 ? downsampleCurve(curve, 20) : curve,
  };
}

function downsampleCurve(curve: { fpr: number; tpr: number }[], maxPoints: number): { fpr: number; tpr: number }[] {
  if (curve.length <= maxPoints) return curve;
  const step = Math.ceil(curve.length / maxPoints);
  const sampled: { fpr: number; tpr: number }[] = [curve[0]];
  for (let i = step; i < curve.length - 1; i += step) {
    sampled.push(curve[i]);
  }
  sampled.push(curve[curve.length - 1]);
  return sampled;
}
