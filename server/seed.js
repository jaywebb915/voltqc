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

// Clear existing data
db.exec('DELETE FROM QC_Checklist');

const items = [
  // PROCESS COMPLIANCE
  ['PROCESS COMPLIANCE', 'Has the VDC Dept QC check tables been filled with the scoring?', 1, 'TEXT_MATCH'],
  ['PROCESS COMPLIANCE', 'Is the self QC checklist accurate to what the VDC PM has scored?', 1, 'TEXT_MATCH'],

  // AVAILABLE DESIGN INFORMATION
  ['AVAILABLE DESIGN INFORMATION', 'Identify the date of the contract drawings used by designer.', 0, 'TEXT_MATCH'],
  ['AVAILABLE DESIGN INFORMATION', 'Were approved gear submittals available at the time of this evaluation?', 1, 'TEXT_MATCH'],
  ['AVAILABLE DESIGN INFORMATION', 'Were approved generator submittals available at the time of this evaluation?', 1, 'TEXT_MATCH'],
  ['AVAILABLE DESIGN INFORMATION', 'Which of the following sleevings needs to be accounted for in the drawings? (DAS, Fire Alarm, Temp Power, Cell Booster, BMS, Tele/Cable/Data)', 0, 'TEXT_MATCH'],
  ['AVAILABLE DESIGN INFORMATION', 'Is this review being driven prior to construction start?', 0, 'TEXT_MATCH'],
  ['AVAILABLE DESIGN INFORMATION', 'Does this project have approved VET?', 0, 'TEXT_MATCH'],
  ['AVAILABLE DESIGN INFORMATION', 'Identify the utility provider.', 0, 'TEXT_MATCH'],
  ['AVAILABLE DESIGN INFORMATION', 'Are there any local/regional code amendments that need to be applied?', 0, 'TEXT_MATCH'],

  // GENERAL DRAFTING
  ['GENERAL DRAFTING', 'Are all the following sheets included per Dept Profiles: Title sheet (0.5), Legends and symbols sheet (0.5), Riser diagram (1.5), Main electrical room floorplan (1.5), Main electric room Dimensioned floorplan (1.5), Main electric room elevations (1.5), Satellite rooms sleeving (1.5), Satellite rooms floor plans with dimensions (1.5), Elevation views of risers from model (1.5), Equipment legend showing equipment dimensions (0.5), Utility vault layout (0.5), Utility vault details (0.5)', 13.5, 'SPATIAL_VISION'],
  ['GENERAL DRAFTING', 'Has the utility standard been added to the drawing (meter center heights, etc.)?', 1, 'TEXT_MATCH'],
  ['GENERAL DRAFTING', 'Is all Title Block information filled out?', 1, 'TEXT_MATCH'],
  ['GENERAL DRAFTING', 'Are General Notes included on all sheets? (3 or more missing results loses the point)', 1, 'TEXT_MATCH'],
  ['GENERAL DRAFTING', 'Are the correct continuous count for each sheet? (3 or more missing layout spots loses the point)', 1, 'TEXT_MATCH'],
  ['GENERAL DRAFTING', 'Are room names identified? (3 or more missing loses the point)', 1, 'SPATIAL_VISION'],
  ['GENERAL DRAFTING', 'Are all equipment names identified? (3 or more missing loses the point)', 1, 'SPATIAL_VISION'],
  ['GENERAL DRAFTING', 'Are all circuit tags text size correct? (3 or more missing loses the point)', 1, 'SPATIAL_VISION'],
  ['GENERAL DRAFTING', 'Are all dimensioned power elements present? (3 or more missing loses the point)', 1, 'SPATIAL_VISION'],
  ['GENERAL DRAFTING', 'Are tags and dimensions placed to be clear of other objects and legible? (3 or more issues loses the point)', 1, 'SPATIAL_VISION'],
  ['GENERAL DRAFTING', 'Are disclosures added for sleeving on unapproved submittals?', 1, 'TEXT_MATCH'],
  ['GENERAL DRAFTING', 'Is the feeder schedule included on the riser diagram? (Leave N/A - Currently not a requirement.)', 1, 'SCHEMATIC_TRACE'],
  ['GENERAL DRAFTING', 'Are all conduits and feeders tagged? (3 or more loses the point)', 1, 'SCHEMATIC_TRACE'],
  ['GENERAL DRAFTING', 'Are all sleeves identified? (3 or more loses the point)', 1, 'SCHEMATIC_TRACE'],
  ['GENERAL DRAFTING', 'Are the Viewports properly locked to show room numbers, etc.? (3 or more loses the point)', 1, 'TEXT_MATCH'],
  ['GENERAL DRAFTING', 'Are the sleeves evenly placed off of the wall so the future conduits can be properly supported?', 1, 'SPATIAL_VISION'],
  ['GENERAL DRAFTING', 'Has the proper scale and north arrow been added to the drawings?', 1, 'SPATIAL_VISION'],

  // GENERAL DESIGN
  ['GENERAL DESIGN', 'If there is approved VE, has it been incorporated into this drawing set?', 3, 'TEXT_MATCH'],
  ['GENERAL DESIGN', 'Have any unapproved VE been incorporated into the drawing set?', 2, 'TEXT_MATCH'],
  ['GENERAL DESIGN', 'Have any utility company specific requirements been applied to the PDF drawings?', 1, 'TEXT_MATCH'],
  ['GENERAL DESIGN', 'Have any necessary local code amendments been applied?', 2, 'TEXT_MATCH'],
  ['GENERAL DESIGN', 'Do all feeder wireway ampacities match the contract drawings?', 1, 'SCHEMATIC_TRACE'],
  ['GENERAL DESIGN', 'Does the method of overcurrent protection match the contract drawings?', 1, 'SCHEMATIC_TRACE'],
  ['GENERAL DESIGN', 'Are all feeder and conduit sizes correct for the design?', 1, 'SCHEMATIC_TRACE'],
  ['GENERAL DESIGN', 'Is all the required equipment on the contract drawings included in the PDF drawing?', 3, 'TEXT_MATCH'],
  ['GENERAL DESIGN', 'Do all equipment window dimensions match the equipment submittals?', 3, 'TEXT_MATCH'],
  ['GENERAL DESIGN', 'Do all equipment enclosure dimensions match the submittal?', 3, 'TEXT_MATCH'],
  ['GENERAL DESIGN', 'Are all manufacturers sized correctly? Match contract design, or corrected per RFI', 3, 'TEXT_MATCH'],
  ['GENERAL DESIGN', 'Have any feeders been upsized for voltage drop independently of the Engineer of Record?', 2, 'SCHEMATIC_TRACE'],
  ['GENERAL DESIGN', 'Are required pull boxes and vertical cable supports properly sized and outlined?', 2, 'SPATIAL_VISION'],
  ['GENERAL DESIGN', 'Are the number of service disconnecting means code compliant?', 1, 'SCHEMATIC_TRACE'],
  ['GENERAL DESIGN', 'Per NEC 2014 and later, do all emergency (NEC 700) panels have surge protection per 700.8?', 1, 'SCHEMATIC_TRACE'],
  ['GENERAL DESIGN', 'Per NEC 2020 and later, do all dwelling units have surge protection per NEC 230.67A?', 1, 'SCHEMATIC_TRACE'],
  ['GENERAL DESIGN', 'Do the characteristics of the equipment listed in EEs match the current submittals?', 2, 'TEXT_MATCH'],
  ['GENERAL DESIGN', 'Are the troughs properly sized to be under 20% cross sectional fill?', 1, 'SCHEMATIC_TRACE'],

  // ELECTRICAL ROOM
  ['ELECTRICAL ROOM', 'Does the number of switchboard/panel sections match the submittals?', 2, 'TEXT_MATCH'],
  ['ELECTRICAL ROOM', 'Does the number of meter sockets match the unit counts per the PDI Unit Matrix?', 2, 'SCHEMATIC_TRACE'],
  ['ELECTRICAL ROOM', 'Do meter center configurations match the submittals?', 2, 'TEXT_MATCH'],
  ['ELECTRICAL ROOM', 'Does all equipment placement provide proper working clearance? (NEC 110.26)', 5, 'SPATIAL_VISION'],
  ['ELECTRICAL ROOM', 'Is dedicated space above equipment clear as required?', 2, 'SPATIAL_VISION'],
  ['ELECTRICAL ROOM', 'Does any equipment that shares a dedicated space extend more than 6 inches in front of the switchboard space?', 2, 'SPATIAL_VISION'],
  ['ELECTRICAL ROOM', 'If a room is shared with any low voltage systems, is PDI equipment\'s required space maintained?', 2, 'SPATIAL_VISION'],
  ['ELECTRICAL ROOM', 'Do the doors swing outwards where required? (90-deg Equipment of 1200A or larger)', 1, 'SPATIAL_VISION'],
  ['ELECTRICAL ROOM', 'Are housekeeping pads properly placed and sized?', 1, 'SPATIAL_VISION'],

  // SLEEVING
  ['SLEEVING', 'Has the following sleeving been correctly indicated in regards to quantity and location? (DAS, Fire Alarm, Grounding, Utility and Main, Temp Power, Cell Booster, BMS, Tele/Cable/Data, Main/E-Room runs)', 14, 'SPATIAL_VISION'],
  ['SLEEVING', 'Are the back edges of sleeves standard or customized?', 1, 'SPATIAL_VISION'],
  ['SLEEVING', 'Stud wall layout', 1, 'SPATIAL_VISION'],

  // EMERGENCY
  ['EMERGENCY', 'Does the generator have proper clearance?', 2, 'SPATIAL_VISION'],
  ['EMERGENCY', 'Is there proper separation between emergency and normal power equipment rooms/wiring where required per NEC 700?', 2, 'SPATIAL_VISION'],
  ['EMERGENCY', 'Per NEC 2017 and later, is a remote shutting station included in the design?', 2, 'SCHEMATIC_TRACE'],
  ['EMERGENCY', 'Are the NEC 700 EM system properly segregated from the other circuits? (NEC 700 wiring cannot be mixed with any other circuit types.)', 2, 'SCHEMATIC_TRACE'],
];

const stmt = db.prepare('INSERT INTO QC_Checklist (Section, Question, Point_Value, Status, Inspection_Type_Tag) VALUES (?, ?, ?, ?, ?)');

for (const [section, question, points, tag] of items) {
  stmt.run(section, question, points, 'Pending', tag);
}

// Set the feeder schedule item to N/A by default
db.exec("UPDATE QC_Checklist SET Status = 'N/A' WHERE Question LIKE '%feeder schedule%'");

const count = db.prepare('SELECT COUNT(*) as count FROM QC_Checklist').get();
console.log(`Seeded ${count.count} checklist items successfully.`);
db.close();