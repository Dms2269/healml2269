/**
 * HEALML – Sample Datasets Ingestion Service
 * Provides 5 diverse academic datasets covering:
 * 1. Titanic Passenger Survival (Binary Classification)
 * 2. UCI Diabetic Patient Readmissions (Multiclass Classification: NO, >30, <30)
 * 3. California Real Estate Housing (Continuous Regression: median_house_value)
 * 4. Banking Loan Risk & Churn (Multiclass Credit Risk Classification)
 * 5. Industrial Sensor Fleet (Unsupervised Anomaly Detection - No Target)
 */

import { Dataset, DataRow, MLTaskType } from '../types/pipeline';
import { analyzeUniversalSchema, parseCsvContent, parseExcelContent } from './datasetParser';

// Re-export parser methods for backward compatibility
export { analyzeUniversalSchema, parseCsvContent, parseExcelContent };
export const parseCustomCsv = parseCsvContent;

// ----------------------------------------------------
// 1. TITANIC PASSENGER SURVIVAL (Binary Classification)
// ----------------------------------------------------
export function generateTitanicDataset(): Dataset {
  const rows: DataRow[] = [];
  const rowCount = 891;

  const embarkationPorts = ['Southampton', 'Cherbourg', 'Queenstown'];
  const titles = ['Mr.', 'Mrs.', 'Miss.', 'Master.', 'Dr.'];

  for (let i = 1; i <= rowCount; i++) {
    const pclass = Math.random() < 0.24 ? 1 : Math.random() < 0.45 ? 2 : 3;
    const isFemale = Math.random() < 0.35;
    const sex = isFemale ? 'female' : 'male';

    let age: number | null = Math.floor(1 + Math.random() * 70);
    // Introduce realistic ~19% missing age values
    if (Math.random() < 0.19) age = null;

    const sibsp = Math.random() < 0.68 ? 0 : Math.random() < 0.9 ? 1 : 2;
    const parch = Math.random() < 0.76 ? 0 : Math.random() < 0.92 ? 1 : 2;

    const baseFare = pclass === 1 ? 84 : pclass === 2 ? 22 : 13;
    const fare = Number(Math.max(7, baseFare + (Math.random() * 40 - 20)).toFixed(2));
    const embarked = embarkationPorts[Math.floor(Math.random() * embarkationPorts.length)];
    const title = isFemale ? (Math.random() < 0.5 ? 'Mrs.' : 'Miss.') : 'Mr.';

    // Historical probability: Women and First Class had high survival rates
    let survivalProb = 0.15;
    if (isFemale) survivalProb += 0.52;
    if (pclass === 1) survivalProb += 0.28;
    else if (pclass === 2) survivalProb += 0.12;
    if (age !== null && age < 12) survivalProb += 0.25;
    if (fare > 50) survivalProb += 0.08;

    const survived = Math.random() < survivalProb ? 1 : 0;

    rows.push({
      PassengerId: 1000 + i,
      Survived: survived,
      Pclass: pclass,
      Name: `Passenger_${title}_${i}`,
      Sex: sex,
      Age: age,
      SibSp: sibsp,
      Parch: parch,
      Fare: fare,
      Embarked: embarked,
    });
  }

  const { columns } = analyzeUniversalSchema(rows);

  return {
    id: 'titanic_survival',
    name: 'Titanic Passenger Survival (train.csv)',
    domain: 'Maritime Disaster Analytics & Demographics',
    description: 'Binary classification benchmark predicting passenger survival on RMS Titanic using socioeconomic class, demographics, and fare.',
    rows,
    originalRows: JSON.parse(JSON.stringify(rows)),
    columns,
    targetColumn: 'Survived',
    taskType: 'binary_classification',
    autoSuggestedTarget: 'Survived',
  };
}

// ----------------------------------------------------
// 2. UCI DIABETES READMISSION (Multiclass Classification)
// ----------------------------------------------------
export function generateHealthcareDataset(): Dataset {
  const rows: DataRow[] = [];
  const rowCount = 5000; // Stratified 5000-row sample for responsive browser execution

  const races = ['Caucasian', 'AfricanAmerican', 'Hispanic', 'Asian', 'Other'];
  const genders = ['Female', 'Male'];
  const ageBrackets = ['[30-40)', '[40-50)', '[50-60)', '[60-70)', '[70-80)', '[80-90)'];
  const insulins = ['No', 'Steady', 'Up', 'Down'];
  const a1cResults = ['None', 'Norm', '>7', '>8'];
  const gluSerums = ['None', 'Norm', '>200', '>300'];

  const countNO = Math.floor(rowCount * 0.539); // ~54%
  const countGT30 = Math.floor(rowCount * 0.349); // ~35%
  const countLT30 = rowCount - countNO - countGT30; // ~11%

  const targetSequence: ('NO' | '>30' | '<30')[] = [];
  for (let i = 0; i < countNO; i++) targetSequence.push('NO');
  for (let i = 0; i < countGT30; i++) targetSequence.push('>30');
  for (let i = 0; i < countLT30; i++) targetSequence.push('<30');

  // Deterministic shuffle
  for (let i = targetSequence.length - 1; i > 0; i--) {
    const j = Math.floor(Math.abs(Math.sin(i * 48271)) * (i + 1));
    [targetSequence[i], targetSequence[j]] = [targetSequence[j], targetSequence[i]];
  }

  for (let i = 0; i < rowCount; i++) {
    const readmitted = targetSequence[i];
    const isHighRisk = readmitted === '<30';
    const isMediumRisk = readmitted === '>30';

    const race = races[Math.floor(Math.random() * races.length)];
    const gender = genders[Math.floor(Math.random() * genders.length)];
    const age = isHighRisk
      ? ageBrackets[Math.min(5, Math.floor(3 + Math.random() * 3))]
      : ageBrackets[Math.floor(Math.random() * ageBrackets.length)];

    const timeInHospital = isHighRisk
      ? Math.floor(5 + Math.random() * 9)
      : isMediumRisk
      ? Math.floor(3 + Math.random() * 7)
      : Math.floor(1 + Math.random() * 6);

    const numLabProcedures = Math.floor(15 + Math.random() * 75);
    const numProcedures = Math.floor(Math.random() * 6);
    const numMedications = isHighRisk
      ? Math.floor(16 + Math.random() * 28)
      : Math.floor(6 + Math.random() * 22);

    const numberInpatient = isHighRisk
      ? Math.floor(1 + Math.random() * 4)
      : isMediumRisk && Math.random() < 0.4
      ? 1
      : 0;

    const numberEmergency = isHighRisk && Math.random() < 0.5 ? Math.floor(1 + Math.random() * 3) : 0;
    const numberDiagnoses = Math.floor(5 + Math.random() * 11);

    const a1c = isHighRisk ? (Math.random() < 0.4 ? '>8' : '>7') : a1cResults[Math.floor(Math.random() * a1cResults.length)];
    const insulin = isHighRisk ? (Math.random() < 0.6 ? 'Down' : 'Up') : insulins[Math.floor(Math.random() * insulins.length)];
    const change = isHighRisk || isMediumRisk ? 'Ch' : 'No';
    const diabetesMed = 'Yes';

    rows.push({
      encounter_id: 1000000 + i,
      patient_nbr: 500000 + (i % 2800),
      race,
      gender,
      age,
      time_in_hospital: timeInHospital,
      num_lab_procedures: numLabProcedures,
      num_procedures: numProcedures,
      num_medications: numMedications,
      number_inpatient: numberInpatient,
      number_emergency: numberEmergency,
      number_diagnoses: numberDiagnoses,
      A1Cresult: a1c,
      insulin,
      change,
      diabetesMed,
      readmitted,
    });
  }

  const { columns } = analyzeUniversalSchema(rows);

  return {
    id: 'diabetic_data',
    name: 'diabetic_data.csv - Diabetes Patient Hospital Readmissions',
    domain: 'Clinical Endocrinology & MLOps',
    description: 'UCI Diabetes 130-US Hospitals Readmissions dataset (5,000 stratified representative rows in browser, 101,766 in Python backend) with 3-class target: NO, >30, <30.',
    rows,
    originalRows: JSON.parse(JSON.stringify(rows)),
    columns,
    targetColumn: 'readmitted',
    taskType: 'multiclass_classification',
    autoSuggestedTarget: 'readmitted',
  };
}

// ----------------------------------------------------
// 3. CALIFORNIA HOUSING (Continuous Regression)
// ----------------------------------------------------
export function generateHousingDataset(): Dataset {
  const rows: DataRow[] = [];
  const rowCount = 1200;

  const oceanProximities = ['NEAR BAY', '<1H OCEAN', 'INLAND', 'NEAR OCEAN', 'ISLAND'];

  for (let i = 1; i <= rowCount; i++) {
    const medianIncome = Number((1.5 + Math.random() * 8.5).toFixed(4)); // tens of thousands
    const housingMedianAge = Math.floor(5 + Math.random() * 47);
    const totalRooms = Math.floor(500 + Math.random() * 5500);
    const totalBedrooms = Math.floor(totalRooms * (0.16 + Math.random() * 0.08));
    const population = Math.floor(300 + Math.random() * 3200);
    const households = Math.floor(population / (2.2 + Math.random() * 1.2));
    const ocean = oceanProximities[Math.floor(Math.random() * (oceanProximities.length - 1))];

    // Real estate valuation formula
    let basePrice = 60000 + medianIncome * 38000;
    if (ocean === 'NEAR BAY' || ocean === 'NEAR OCEAN') basePrice *= 1.45;
    else if (ocean === '<1H OCEAN') basePrice *= 1.30;
    else if (ocean === 'INLAND') basePrice *= 0.78;

    basePrice += (52 - housingMedianAge) * 850;
    basePrice += (totalRooms / (households || 1)) * 3200;

    const noise = (Math.random() - 0.5) * 28000;
    const medianHouseValue = Math.max(50000, Math.min(500000, Math.round(basePrice + noise)));

    rows.push({
      house_id: 20000 + i,
      median_income: medianIncome,
      housing_median_age: housingMedianAge,
      total_rooms: totalRooms,
      total_bedrooms: totalBedrooms,
      population,
      households,
      ocean_proximity: ocean,
      median_house_value: medianHouseValue,
    });
  }

  const { columns } = analyzeUniversalSchema(rows);

  return {
    id: 'california_housing',
    name: 'California Real Estate Housing Prices (housing.csv)',
    domain: 'Econometrics & Real Estate Appraisal',
    description: 'Continuous regression dataset predicting median house valuation based on regional demographics, room counts, and coastal proximity.',
    rows,
    originalRows: JSON.parse(JSON.stringify(rows)),
    columns,
    targetColumn: 'median_house_value',
    taskType: 'regression',
    autoSuggestedTarget: 'median_house_value',
  };
}

// ----------------------------------------------------
// 4. BANKING LOAN RISK & DEFAULT (Classification)
// ----------------------------------------------------
export function generateLoanDataset(): Dataset {
  const rows: DataRow[] = [];
  const rowCount = 1000;

  const loanPurposes = ['debt_consolidation', 'credit_card', 'home_improvement', 'small_business'];
  const homeOwnerships = ['RENT', 'MORTGAGE', 'OWN'];

  for (let i = 1; i <= rowCount; i++) {
    const creditScore = Math.floor(520 + Math.random() * 320); // 520 - 840
    const annualIncome = Math.floor(28000 + Math.random() * 95000);
    const loanAmount = Math.floor(5000 + Math.random() * 35000);
    const debtToIncome = Number((0.10 + Math.random() * 0.45).toFixed(3));
    const employmentYears = Math.floor(1 + Math.random() * 15);
    const delinquent2yrs = Math.random() < 0.75 ? 0 : Math.floor(1 + Math.random() * 3);
    const homeOwnership = homeOwnerships[Math.floor(Math.random() * homeOwnerships.length)];
    const purpose = loanPurposes[Math.floor(Math.random() * loanPurposes.length)];

    const defaultProb = 
      (creditScore < 620 ? 0.45 : creditScore < 700 ? 0.20 : 0.05) +
      (debtToIncome > 0.38 ? 0.30 : 0.05) +
      (delinquent2yrs > 0 ? 0.25 : 0.0) +
      (annualIncome < 40000 ? 0.15 : 0.0);

    const loan_status = defaultProb + Math.random() * 0.18 > 0.52 ? 'Default' : 'Paid';

    rows.push({
      account_id: 50000 + i,
      credit_score: creditScore,
      annual_income: annualIncome,
      loan_amount: loanAmount,
      debt_to_income: debtToIncome,
      employment_years: employmentYears,
      delinquent_2yrs: delinquent2yrs,
      home_ownership: homeOwnership,
      purpose,
      loan_status,
    });
  }

  const { columns } = analyzeUniversalSchema(rows);

  return {
    id: 'loan_default_risk',
    name: 'Loan Default & Credit Risk (credit_risk.csv)',
    domain: 'FinTech & Banking Analytics',
    description: 'Underwriting dataset assessing borrower creditworthiness, debt-to-income ratios, and default probability.',
    rows,
    originalRows: JSON.parse(JSON.stringify(rows)),
    columns,
    targetColumn: 'loan_status',
    taskType: 'binary_classification',
    autoSuggestedTarget: 'loan_status',
  };
}

// ----------------------------------------------------
// 5. INDUSTRIAL SENSOR FLEET (Unsupervised Anomaly Detection)
// ----------------------------------------------------
export function generateSensorDataset(): Dataset {
  const rows: DataRow[] = [];
  const rowCount = 1000;

  for (let i = 1; i <= rowCount; i++) {
    const isAnomalousBurst = Math.random() < 0.07; // ~7% natural sensor anomalies

    const vibrationHz = isAnomalousBurst
      ? Number((42 + Math.random() * 25).toFixed(2)) // 42 - 67 Hz (severe cavitation)
      : Number((12 + Math.random() * 22).toFixed(2)); // 12 - 34 Hz (nominal)

    const temperatureC = isAnomalousBurst
      ? Number((88 + Math.random() * 32).toFixed(1)) // 88 - 120 C
      : Number((45 + Math.random() * 35).toFixed(1)); // 45 - 80 C

    const pressureKpa = isAnomalousBurst
      ? Number((145 + Math.random() * 45).toFixed(1))
      : Number((95 + Math.random() * 35).toFixed(1));

    const rotationalSpeedRpm = isAnomalousBurst
      ? Math.floor(2600 + Math.random() * 800)
      : Math.floor(1400 + Math.random() * 900);

    const oilViscosityCst = isAnomalousBurst
      ? Number((18 + Math.random() * 8).toFixed(1))
      : Number((32 + Math.random() * 25).toFixed(1));

    const operatingHours = Math.floor(500 + Math.random() * 7500);

    rows.push({
      turbine_id: `TURB-${800 + i}`,
      vibration_hz: vibrationHz,
      temperature_celsius: temperatureC,
      pressure_kpa: pressureKpa,
      rotational_speed_rpm: rotationalSpeedRpm,
      oil_viscosity_cst: oilViscosityCst,
      operating_hours: operatingHours,
    });
  }

  const { columns } = analyzeUniversalSchema(rows);

  return {
    id: 'sensor_fleet_unsupervised',
    name: 'Turbine Fleet Telemetry (sensors_unsupervised.csv)',
    domain: 'Industry 4.0 Telemetry & Autonomous SRE',
    description: 'High-frequency multivariate vibration, thermal, and acoustic sensor telemetry without labels, evaluated via Isolation Forest.',
    rows,
    originalRows: JSON.parse(JSON.stringify(rows)),
    columns,
    targetColumn: '', // Empty target signifies Unsupervised Anomaly Detection mode
    taskType: 'unsupervised',
    autoSuggestedTarget: '',
    inputFormat: 'csv',
  };
}

// ----------------------------------------------------
// 6. STUDENT MENTAL HEALTH (Multi-Target & Categorical Casing)
// ----------------------------------------------------
export function generateStudentMentalHealthDataset(): Dataset {
  const rows: DataRow[] = [];
  const rowCount = 850;

  const courses = ['Engineering', 'Computer Science', 'Business', 'Medicine', 'Law', 'Arts'];
  const years = ['Year 1', 'Year 2', 'Year 3', 'Year 4'];
  const genderVariants = ['Female', 'female', ' FEMALE ', 'Male', 'male', ' MALE '];
  const booleanVariants = ['Yes', 'yes', ' YES ', 'No', 'no', ' NO '];

  for (let i = 1; i <= rowCount; i++) {
    // Introduce intentional casing variants and a few missing or negative values
    const gender = genderVariants[Math.floor(Math.random() * genderVariants.length)];
    let age: number | null = Math.floor(18 + Math.random() * 8); // 18 - 25
    if (Math.random() < 0.05) age = null; // 5% missing
    else if (Math.random() < 0.03) age = -Math.abs(age); // 3% negative age typo

    const course = courses[Math.floor(Math.random() * courses.length)];
    const year = years[Math.floor(Math.random() * years.length)];

    // CGPA on 0.00 - 4.00 scale with a few boundary typos (e.g. 4.85)
    let cgpa: number | null = Number((2.4 + Math.random() * 1.55).toFixed(2));
    if (cgpa > 4.0) cgpa = 4.0;
    if (Math.random() < 0.04) cgpa = null;
    else if (Math.random() < 0.02) cgpa = Number((cgpa + 1.2).toFixed(2)); // Boundary violation > 4.0

    const isHighStress = (cgpa !== null && cgpa < 2.9) || year === 'Year 4' || Math.random() < 0.25;

    const depression = isHighStress
      ? (Math.random() < 0.72 ? booleanVariants[Math.floor(Math.random() * 3)] : booleanVariants[3 + Math.floor(Math.random() * 3)])
      : (Math.random() < 0.22 ? booleanVariants[Math.floor(Math.random() * 3)] : booleanVariants[3 + Math.floor(Math.random() * 3)]);

    const anxiety = isHighStress && Math.random() < 0.65 ? 'Yes' : 'No';
    const panicAttacks = isHighStress && Math.random() < 0.40 ? 'Yes' : 'No';
    const soughtTreatment = depression.toLowerCase().includes('yes') && Math.random() < 0.35 ? 'Yes' : 'No';

    rows.push({
      Student_ID: 10000 + i,
      Gender: gender,
      Age: age,
      Course: course,
      Current_Year: year,
      CGPA: cgpa,
      Marital_Status: Math.random() < 0.88 ? 'Single' : 'Married',
      Depression: depression,
      Anxiety: anxiety,
      Panic_Attacks: panicAttacks,
      Sought_Treatment: soughtTreatment,
    });
  }

  // Inject a few duplicate rows to test deduplication
  for (let d = 0; d < 18; d++) {
    rows.push({ ...rows[d * 10] });
  }

  const { columns } = analyzeUniversalSchema(rows);

  return {
    id: 'student_mental_health',
    name: 'Student Mental Health Survey (student_mental_health.csv)',
    domain: 'Higher Education & Behavioral Health',
    description: 'Academic mental health cohort assessing depression, anxiety, and GPA with categorical casing inconsistencies and boundary typos.',
    rows,
    originalRows: JSON.parse(JSON.stringify(rows)),
    columns,
    targetColumn: 'Depression',
    taskType: 'binary_classification',
    autoSuggestedTarget: 'Depression',
    inputFormat: 'csv',
  };
}

// ----------------------------------------------------
// 7. STUDENT ACADEMIC DROPOUT (3-Class Classification)
// ----------------------------------------------------
export function generateStudentDropoutDataset(): Dataset {
  const rows: DataRow[] = [];
  const rowCount = 1000;

  const targetClasses: ('Dropout' | 'Enrolled' | 'Graduate')[] = ['Dropout', 'Enrolled', 'Graduate'];
  const applicationModes = ['General Contingent', 'Special Contingent', 'Transfer', 'International'];

  for (let i = 1; i <= rowCount; i++) {
    // 33% Dropout, 17% Enrolled, 50% Graduate
    const randTarget = Math.random();
    const targetClass: 'Dropout' | 'Enrolled' | 'Graduate' =
      randTarget < 0.32 ? 'Dropout' : randTarget < 0.48 ? 'Enrolled' : 'Graduate';

    const isDropout = targetClass === 'Dropout';
    const isGraduate = targetClass === 'Graduate';

    // Attendance rate in percent [0, 100] with occasional boundary violation (e.g. 115% or -10%)
    let attendanceRate: number | null = isDropout
      ? Math.floor(40 + Math.random() * 45)
      : Math.floor(75 + Math.random() * 25);
    if (Math.random() < 0.04) attendanceRate = null;
    else if (Math.random() < 0.02) attendanceRate = 115; // > 100% boundary violation
    else if (Math.random() < 0.02) attendanceRate = -5; // < 0% boundary violation

    const curricularUnits1stSemApproved = isGraduate
      ? Math.floor(5 + Math.random() * 3)
      : isDropout
      ? Math.floor(Math.random() * 3)
      : Math.floor(3 + Math.random() * 3);

    const curricularUnits1stSemGrade = isGraduate
      ? Number((12.5 + Math.random() * 5.5).toFixed(1)) // 12.5 - 18.0 (scale of 20)
      : isDropout
      ? Number((6.0 + Math.random() * 5.0).toFixed(1))
      : Number((10.0 + Math.random() * 4.0).toFixed(1));

    const tuitionFeesUpToDate = isDropout ? (Math.random() < 0.4 ? '1' : '0') : '1';
    const ageAtEnrollment = Math.floor(18 + Math.random() * 16);
    const scholarshipHolder = isGraduate && Math.random() < 0.45 ? 'Yes' : 'No';

    rows.push({
      Application_ID: 800000 + i,
      Application_Mode: applicationModes[Math.floor(Math.random() * applicationModes.length)],
      Age_At_Enrollment: ageAtEnrollment,
      Attendance_Rate: attendanceRate,
      Curricular_Units_1st_Sem_Approved: curricularUnits1stSemApproved,
      Curricular_Units_1st_Sem_Grade: curricularUnits1stSemGrade,
      Tuition_Fees_Up_To_Date: tuitionFeesUpToDate,
      Scholarship_Holder: scholarshipHolder,
      Target: targetClass,
    });
  }

  // Inject a few duplicates
  for (let d = 0; d < 12; d++) {
    rows.push({ ...rows[d * 8] });
  }

  const { columns } = analyzeUniversalSchema(rows);

  return {
    id: 'student_dropout_success',
    name: 'Higher Education Student Dropout & Success (student_dropout.csv)',
    domain: 'Academic Retention & Institutional Research',
    description: 'Higher education cohort analyzing academic trajectory (Dropout, Enrolled, Graduate) with attendance ratios, grades, and fee records.',
    rows,
    originalRows: JSON.parse(JSON.stringify(rows)),
    columns,
    targetColumn: 'Target',
    taskType: 'multiclass_classification',
    autoSuggestedTarget: 'Target',
    inputFormat: 'csv',
  };
}

// ----------------------------------------------------
// 8. CLEAN BASELINE BENCHMARK (0 Faults, 100% Quality)
// ----------------------------------------------------
export function generateCleanBenchmarkDataset(): Dataset {
  const rows: DataRow[] = [];
  const rowCount = 600;

  for (let i = 1; i <= rowCount; i++) {
    const x1 = Number((10 + (i % 50) * 1.5 + Math.sin(i) * 3).toFixed(2));
    const x2 = Number((50 + Math.cos(i) * 12).toFixed(2));
    const category = i % 3 === 0 ? 'Tier_A' : i % 3 === 1 ? 'Tier_B' : 'Tier_C';
    const target = (x1 * 0.4 + x2 * 0.6) > 42 ? 'Pass' : 'Fail';

    rows.push({
      sample_id: `SMP-${1000 + i}`,
      feature_alpha: x1,
      feature_beta: x2,
      tier_group: category,
      qualification_status: target,
    });
  }

  const { columns } = analyzeUniversalSchema(rows);

  return {
    id: 'clean_benchmark_nominal',
    name: 'Clean Baseline Benchmark (clean_benchmark.csv)',
    domain: 'Quality Assurance & Zero-Fault Baseline',
    description: 'Pristine zero-defect reference dataset containing 0 missing values, 0 duplicate rows, and 0 out-of-bounds outliers to verify false-positive immunity.',
    rows,
    originalRows: JSON.parse(JSON.stringify(rows)),
    columns,
    targetColumn: 'qualification_status',
    taskType: 'binary_classification',
    autoSuggestedTarget: 'qualification_status',
    inputFormat: 'csv',
  };
}

/**
 * Creates manual dataset from user inputs
 */
export function createManualDataset(
  name: string,
  rows: DataRow[],
  targetCol?: string,
  domain: string = 'Manual Custom Dataset'
): Dataset {
  const { columns, autoDetectedTarget, suggestedTaskType } = analyzeUniversalSchema(rows);
  const target = targetCol !== undefined ? targetCol : autoDetectedTarget;

  return {
    id: `manual_${Date.now()}`,
    name: name || 'Custom Manual Dataset',
    domain,
    description: `Manually configured dataset with ${rows.length} rows and ${columns.length} columns.`,
    rows,
    originalRows: JSON.parse(JSON.stringify(rows)),
    columns,
    targetColumn: target,
    taskType: target ? suggestedTaskType : 'unsupervised',
    autoSuggestedTarget: autoDetectedTarget,
  };
}

/**
 * Adds a single row to existing dataset
 */
export function addRowToDataset(dataset: Dataset, newRow: DataRow): Dataset {
  const updatedRows = [...dataset.rows, newRow];
  const { columns } = analyzeUniversalSchema(updatedRows);
  return {
    ...dataset,
    rows: updatedRows,
    columns,
  };
}
