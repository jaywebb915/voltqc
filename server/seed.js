import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '../voltqc.db');
const db = new Database(DB_PATH);

// Create tables if they don't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS QC_Checklist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    Section TEXT,
    Question TEXT,
    Point_Value REAL,
    Status TEXT DEFAULT 'Pending',
    Comments TEXT DEFAULT '',
    Inspection_Type_Tag TEXT
  );

  CREATE TABLE IF NOT EXISTS Documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT,
    filepath TEXT,
    classification TEXT,
    confidence_score REAL,
    metadata TEXT,
    status TEXT DEFAULT 'Queued',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Clear existing checklist data and re-seed
db.exec('DELETE FROM QC_Checklist');

// Items match the exact section order and question text from the VDC QC Distribution Template.
// Format: [Section, Question, Point_Value, Inspection_Type_Tag]
const items = [

  // ── PROCESS COMPLIANCE (2 pts) ────────────────────────────────────────────
  ['PROCESS COMPLIANCE', 'Has the VDC Self-QC checklist been provided with the drawings?', 1, 'TEXT_MATCH'],
  ['PROCESS COMPLIANCE', 'Is the self QC checklist accurate to what the VDC PM has stated?', 1, 'TEXT_MATCH'],

  // ── AVAILABLE DESIGN INFORMATION — Non-Scored (0 pts) ────────────────────
  ['AVAILABLE DESIGN INFORMATION', 'Identify the date/version of the contract drawings used by designer.', 0, 'TEXT_MATCH'],
  ['AVAILABLE DESIGN INFORMATION', 'Were approved gear submittals available at the time of this evaluation?', 0, 'TEXT_MATCH'],
  ['AVAILABLE DESIGN INFORMATION', 'Were approved generator submittals available at the time of this evaluation?', 0, 'TEXT_MATCH'],
  // Which of the following sleeving needs to be accounted for in the drawings?
  ['AVAILABLE DESIGN INFORMATION', 'Sleeving to account for in drawings: DAS', 0, 'TEXT_MATCH'],
  ['AVAILABLE DESIGN INFORMATION', 'Sleeving to account for in drawings: Fire Alarm', 0, 'TEXT_MATCH'],
  ['AVAILABLE DESIGN INFORMATION', 'Sleeving to account for in drawings: Temp Power', 0, 'TEXT_MATCH'],
  ['AVAILABLE DESIGN INFORMATION', 'Sleeving to account for in drawings: Cell Booster', 0, 'TEXT_MATCH'],
  ['AVAILABLE DESIGN INFORMATION', 'Sleeving to account for in drawings: BMS', 0, 'TEXT_MATCH'],
  ['AVAILABLE DESIGN INFORMATION', 'Sleeving to account for in drawings: Tele/Cable/Data', 0, 'TEXT_MATCH'],
  ['AVAILABLE DESIGN INFORMATION', 'Is this review being done prior to installation start?', 0, 'TEXT_MATCH'],
  ['AVAILABLE DESIGN INFORMATION', 'Does this project have approved VE?', 0, 'TEXT_MATCH'],
  ['AVAILABLE DESIGN INFORMATION', 'Identify the utility provider.', 0, 'TEXT_MATCH'],
  ['AVAILABLE DESIGN INFORMATION', 'Are there any jurisdictional code amendments that need to be applied?', 0, 'TEXT_MATCH'],

  // ── GENERAL DRAFTING (19 pts) ─────────────────────────────────────────────
  // Are all the following sheets included per Best Practices?
  ['GENERAL DRAFTING', 'Title sheet.', 0.5, 'SPATIAL_VISION'],
  ['GENERAL DRAFTING', 'Legends and symbols sheet.', 0.5, 'SPATIAL_VISION'],
  ['GENERAL DRAFTING', 'Riser diagram.', 0.5, 'SCHEMATIC_TRACE'],
  ['GENERAL DRAFTING', 'Main electric room isometric.', 0.5, 'SPATIAL_VISION'],
  ['GENERAL DRAFTING', 'Main electric room dimensioned floor plan.', 0.5, 'SPATIAL_VISION'],
  ['GENERAL DRAFTING', 'Main electric room elevations.', 0.5, 'SPATIAL_VISION'],
  ['GENERAL DRAFTING', 'Satellite rooms, sleeving.', 0.5, 'SPATIAL_VISION'],
  ['GENERAL DRAFTING', 'Satellite rooms, floor plans with dimensions.', 0.5, 'SPATIAL_VISION'],
  ['GENERAL DRAFTING', 'Elevation views of risers from model.', 0.5, 'SPATIAL_VISION'],
  ['GENERAL DRAFTING', 'Equipment legend showing equipment dimensions.', 0.5, 'SPATIAL_VISION'],
  ['GENERAL DRAFTING', 'Utility vault layout.', 0.5, 'SPATIAL_VISION'],
  ['GENERAL DRAFTING', 'Has the utility standards been added to the drawing (meter glass heights, etc.)?', 2, 'TEXT_MATCH'],
  ['GENERAL DRAFTING', 'Is all Title Block information filled out?', 0.5, 'TEXT_MATCH'],
  ['GENERAL DRAFTING', 'Are General Notes included on all sheets? (3) or more missing sets of notes loses the point.', 1, 'TEXT_MATCH'],
  ['GENERAL DRAFTING', 'Are the correct symbols used for each item? (3) or more symbols wrong loses the point.', 1, 'SPATIAL_VISION'],
  ['GENERAL DRAFTING', 'Are room names identified? (3) or more missing loses the point.', 1, 'SPATIAL_VISION'],
  ['GENERAL DRAFTING', 'Are all equipment names identified? (3) or more missing loses the point.', 1, 'SPATIAL_VISION'],
  ['GENERAL DRAFTING', 'Are all Revit tags filled out and correct? (3) or more wrong loses the point.', 1, 'TEXT_MATCH'],
  ['GENERAL DRAFTING', 'Are all required dimensions present? (3) or more missing loses the point.', 1, 'SPATIAL_VISION'],
  ['GENERAL DRAFTING', 'Are tags and dimensions placed to be clear of other objects and legible? (3) or more issues loses the point.', 1, 'SPATIAL_VISION'],
  ['GENERAL DRAFTING', 'Are disclaimers added for missing or unapproved submittals?', 0.5, 'TEXT_MATCH'],
  ['GENERAL DRAFTING', 'Is the feeder schedule included on the riser diagram?', 1, 'SCHEMATIC_TRACE'], // default N/A — not currently a requirement
  ['GENERAL DRAFTING', 'Are all conduits and feeders tagged? (3) or more loses the point.', 1, 'SCHEMATIC_TRACE'],
  ['GENERAL DRAFTING', 'Are all sleeves identified? (3) or more loses the point.', 1, 'SCHEMATIC_TRACE'],
  ['GENERAL DRAFTING', 'Are the Viewports properly labeled to show room numbers, etc. (3) or more loses the point.', 1, 'TEXT_MATCH'],
  ['GENERAL DRAFTING', 'Are the sleeves evenly placed off of the wall so the future conduits can be properly supported?', 1, 'SPATIAL_VISION'], // default N/A — NA until verified as best practice
  ['GENERAL DRAFTING', 'Has the proper scale and north arrow been added to the drawings?', 0.5, 'SPATIAL_VISION'],

  // ── GENERAL DESIGN (35 pts) ───────────────────────────────────────────────
  ['GENERAL DESIGN', 'If there is approved VE, has it been incorporated into this drawing set?', 3, 'TEXT_MATCH'],
  ['GENERAL DESIGN', 'Has any un-approved VE been incorporated into this drawing set?', 3, 'TEXT_MATCH'],
  ['GENERAL DESIGN', 'Have any utility company specific requirements been applied in the PDI drawings?', 2, 'TEXT_MATCH'],
  ['GENERAL DESIGN', 'Have any necessary local code amendments been applied?', 2, 'TEXT_MATCH'],
  ['GENERAL DESIGN', 'Do all feeder and busway ampacities match the contract drawings?', 1, 'SCHEMATIC_TRACE'],
  ['GENERAL DESIGN', 'Does the method of overcurrent protection match the contract drawings?', 1, 'SCHEMATIC_TRACE'],
  ['GENERAL DESIGN', 'Are all feeder and conduit sizes correct for the design?', 1, 'SCHEMATIC_TRACE'],
  ['GENERAL DESIGN', 'Is all the required equipment on the contract riser indicated in the PDI drawing?', 3, 'TEXT_MATCH'],
  ['GENERAL DESIGN', 'Do all equipment windows shown match the equipment submittals?', 3, 'TEXT_MATCH'],
  ['GENERAL DESIGN', 'Do all equipment enclosure dimensions match the submittals?', 3, 'TEXT_MATCH'],
  ['GENERAL DESIGN', 'Are all transformers sized correctly? Match contract design, or corrected via RFI.', 1, 'SCHEMATIC_TRACE'],
  ['GENERAL DESIGN', 'Have any feeders been upsized for voltage drop independently of the Engineer of Record?', 3, 'SCHEMATIC_TRACE'],
  ['GENERAL DESIGN', 'Are required pull boxes and vertical cable supports properly sized and located?', 1, 'SPATIAL_VISION'],
  ['GENERAL DESIGN', 'Are the number of service disconnecting means code compliant?', 1, 'SCHEMATIC_TRACE'],
  ['GENERAL DESIGN', 'For NEC 2014 and later, do all emergency (NEC 700) panels have surge protection per 700.8?', 2, 'SCHEMATIC_TRACE'],
  ['GENERAL DESIGN', 'For NEC 2020 and later, do all dwelling units have surge protection per NEC 230.67A?', 2, 'SCHEMATIC_TRACE'],
  ['GENERAL DESIGN', 'Do the characteristics of the equipment listed on EES match the current submittals?', 2, 'TEXT_MATCH'],
  ['GENERAL DESIGN', 'Are the troughs properly sized to be under 20% cross sectional fill?', 1, 'SCHEMATIC_TRACE'],

  // ── ELECTRICAL ROOMS (18 pts) ─────────────────────────────────────────────
  ['ELECTRICAL ROOMS', 'Does the number of switchboard sections match the submittals?', 2, 'TEXT_MATCH'],
  ['ELECTRICAL ROOMS', 'Does the number of meter sockets match the unit counts per the PDI Unit Matrix?', 2, 'SCHEMATIC_TRACE'],
  ['ELECTRICAL ROOMS', 'Do meter center configurations match the submittals?', 2, 'TEXT_MATCH'],
  ['ELECTRICAL ROOMS', 'Does all equipment placement provide proper working clearances?', 2, 'SPATIAL_VISION'],
  ['ELECTRICAL ROOMS', 'Is dedicated space about equipment clear as required?', 2, 'SPATIAL_VISION'],
  ['ELECTRICAL ROOMS', 'Does any equipment that shares dedicated space extend more than 6" in front of the shared space?', 2, 'SPATIAL_VISION'],
  ['ELECTRICAL ROOMS', 'If a room is shared with any low voltage systems, is that equipment\'s required space represented?', 2, 'SPATIAL_VISION'],
  ['ELECTRICAL ROOMS', 'Do the doors swing outwards where required? (800A Equipment or larger.)', 2, 'SPATIAL_VISION'],
  ['ELECTRICAL ROOMS', 'Are housekeeping pads properly placed and sized?', 2, 'SPATIAL_VISION'],

  // ── SLEEVING (16 pts) ─────────────────────────────────────────────────────
  // Has the following sleeving been correctly indicated in regards to quantity and location?
  ['SLEEVING', 'DAS sleeving correctly indicated in regards to quantity and location?', 2, 'SPATIAL_VISION'],
  ['SLEEVING', 'Fire Alarm sleeving correctly indicated in regards to quantity and location?', 2, 'SPATIAL_VISION'],
  ['SLEEVING', 'Grounding sleeving correctly indicated in regards to quantity and location?', 2, 'SPATIAL_VISION'],
  ['SLEEVING', 'Temp Power sleeving correctly indicated in regards to quantity and location?', 2, 'SPATIAL_VISION'],
  ['SLEEVING', 'Cell booster sleeving correctly indicated in regards to quantity and location?', 2, 'SPATIAL_VISION'],
  ['SLEEVING', 'BMS sleeving correctly indicated in regards to quantity and location?', 2, 'SPATIAL_VISION'],
  ['SLEEVING', 'Tele/Cable/Data sleeving correctly indicated in regards to quantity and location?', 2, 'SPATIAL_VISION'],
  ['SLEEVING', 'Normal/EM power sleeving correctly indicated in regards to quantity and location?', 2, 'SPATIAL_VISION'],
  ['SLEEVING', 'Are the back edges of sleeves lined up appropriately?', 2, 'SPATIAL_VISION'], // default N/A — best practice not yet determined

  // ── EMERGENCY (8 pts) ─────────────────────────────────────────────────────
  ['EMERGENCY', 'Does the generator have proper clearances?', 2, 'SPATIAL_VISION'],
  ['EMERGENCY', 'Is there proper separation between emergency and normal power equipment where required?', 2, 'SPATIAL_VISION'],
  ['EMERGENCY', 'For NEC 2017 and later, is a remote docking station included in the design?', 2, 'SCHEMATIC_TRACE'],
  ['EMERGENCY', 'Are the NEC 700 EM loads properly separated from the other circuits? (NEC 700 loads cannot be mixed with any other circuit types.)', 2, 'SCHEMATIC_TRACE'],
];

const stmt = db.prepare('INSERT INTO QC_Checklist (Section, Question, Point_Value, Status, Inspection_Type_Tag) VALUES (?, ?, ?, ?, ?)');

for (const [section, question, points, tag] of items) {
  stmt.run(section, question, points, 'Pending', tag);
}

// Set items that are permanently N/A per the QC sheet instructions
db.exec("UPDATE QC_Checklist SET Status = 'N/A' WHERE Question LIKE '%feeder schedule%'");
db.exec("UPDATE QC_Checklist SET Status = 'N/A' WHERE Question LIKE '%sleeves evenly placed%'");
db.exec("UPDATE QC_Checklist SET Status = 'N/A' WHERE Question LIKE '%back edges of sleeves%'");

const count = db.prepare('SELECT COUNT(*) as count FROM QC_Checklist').get();
const bySection = db.prepare("SELECT Section, COUNT(*) as n, SUM(Point_Value) as pts FROM QC_Checklist GROUP BY Section ORDER BY MIN(id)").all();

console.log(`\nSeeded ${count.count} checklist items successfully.\n`);
console.log('Section breakdown:');
for (const row of bySection) {
  console.log(`  ${row.Section.padEnd(36)} ${String(row.n).padStart(3)} items  ${String(row.pts).padStart(5)} pts`);
}
const total = bySection.reduce((s, r) => s + r.pts, 0);
console.log(`\n  ${'TOTAL'.padEnd(36)}       ${String(total).padStart(5)} pts`);

db.close();
