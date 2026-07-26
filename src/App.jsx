import { useState, useMemo, useRef, useEffect } from "react";
import qrcode from "qrcode-generator";
import jsQR from "jsqr";

/* ============================================================
   ISLAND COMPONENTS — DIGITAL TRAVELER MES DEMO
   Data model built from actual documents:
   - Job Travelers (GH-2000, LAM-3110, ROT-3120, MOT-3000, BRK-4000, ACT-1000)
   - ESP procedures (condensed op instructions)
   - ACT-1000 Family Tree (subassembly flow)
   - Facility floor plan (department zones)
   ============================================================ */

const MONO = "ui-monospace, 'JetBrains Mono', 'SF Mono', Menlo, monospace";
const SANS = "'Segoe UI', system-ui, -apple-system, sans-serif";

const C = {
  bg: "#EEF0F3",
  panel: "#FFFFFF",
  panel2: "#F5F6F8",
  line: "#D7DBE2",
  text: "#252A31",
  dim: "#68707C",
  navy: "#1F3A5F",
  navyLt: "#2A4A73",
  gold: "#E3B341",
  amber: "#B4831B",
  green: "#2F8F5B",
  red: "#C0402E",
  blue: "#2C6DB4",
  paper: "#F8F6F0",
  ink: "#22262B",
};

/* ---------- Routing data (from the Job Traveler PDFs) ---------- */
const PARTS = {
  "GH-2000": {
    desc: "Planetary Gearhead Assembly", rev: "A", color: "#8E6CB8",
    ops: [
      { op: 10, qa: true,  dept: "QA",   wc: "KIT",      zone: "STOCK",  title: "Kitting",
        steps: ["Kit GH-2100 housing, SHA-2101 sun gear, PLN-2102 planet gears (3), CAR-2104 carrier, RNG-2105 ring gear, BRG-6203 bearings (2) per BOM.", "Complete kitting form and attach material certs."],
        accept: "BOM/kitting compliant.", record: "Kitting form, lots." },
      { op: 20, qa: false, dept: "QA",   wc: "INSPECT",  zone: "QC",     title: "Gear & Bearing Inspection",
        steps: ["Inspect gear teeth for nicks, burrs, heat-treat stamp.", "Verify bearing lots and housing bores per drawing."],
        accept: "No disqualifying damage; dims per drawing.", record: "Results, inspector stamp." },
      { op: 30, qa: false, dept: "MFG",  wc: "MFG",      zone: "MACH",   title: "Press Bearings",
        steps: ["Press bearings into housing/carrier with approved tooling.", "Force on fitted ring only — never through rolling elements."],
        accept: "Fully seated; no brinelling.", record: "Bearing lots, method." },
      { op: 40, qa: false, dept: "MFG",  wc: "ASSEMBLE", zone: "SUB",    title: "Assemble Gear Train",
        steps: ["Verify planet gear set is matched where required.", "Assemble with released lubricant type and quantity.", "Verify free rotation through full revolution — no tight spots."],
        accept: "Free rotation; phasing correct; lube per spec.", record: "Lube type/lot/qty, operator." },
      { op: 50, qa: true,  dept: "TEST", wc: "MFG",      zone: "TEST",   title: "Backlash & Running Torque",
        steps: ["Measure backlash/lost motion per released method.", "Measure running torque; record equipment ID."],
        accept: "Values per drawing/ATP.", record: "Measured values, equipment ID." },
      { op: 60, qa: false, dept: "QA",   wc: "INSPECT",  zone: "QC",     title: "Final Inspect & Stock",
        steps: ["Final inspection; preserve, identify.", "Stock transaction to next higher assembly."],
        accept: "Final QA acceptance.", record: "Qty, location, QA stamp." },
    ],
  },
  "LAM-3110": {
    desc: "Stator Lamination Stack Assembly", rev: "B", color: "#4C8FD6",
    ops: [
      { op: 10, qa: true,  dept: "QA",  wc: "KIT",      zone: "STOCK",  title: "Kitting",
        steps: ["Kit LAM-3111 laminations (120 EA) and ADH-3112 bonding epoxy per BOM.", "Verify lamination lot, coating condition, adhesive shelf life."],
        accept: "BOM and kitting form compliant; lots recorded.", record: "Kitting form, lots, certs, QA stamp." },
      { op: 20, qa: false, dept: "QA",  wc: "INSPECT",  zone: "QC",     title: "Lamination Inspection",
        steps: ["Sample-inspect laminations per released plan: burrs, coating damage, flatness, dimensional conformance."],
        accept: "Sample accepted per plan.", record: "Sample results, inspector stamp." },
      { op: 30, qa: false, dept: "MFG", wc: "ASSEMBLE", zone: "STACK",  title: "Stack & Bond",
        steps: ["Verify fixture ID and condition.", "Stack LAM-3111 to released count; apply rotation/interleave pattern per drawing.", "Apply ADH-3112 per released method; maintain slot/bore alignment.", "Clamp to released pressure; verify stack height and squareness before cure."],
        accept: "Count/height and alignment per drawing before cure.", record: "Count, height, adhesive lot/mix, fixture ID." },
      { op: 40, qa: true,  dept: "QA",  wc: "INSPECT",  zone: "IMPREG", title: "Cure & Post-Cure Inspection",
        steps: ["Cure per released schedule; record start/stop and oven ID.", "Inspect for delamination, resin voids, slot obstruction, dimensional conformance."],
        accept: "Cure within schedule; stack conforms; slots clear.", record: "Cure start/stop, oven ID, results, QA stamp." },
      { op: 50, qa: false, dept: "MFG", wc: "MFG",      zone: "MACH",   title: "Finish Machining",
        steps: ["Machine/grind bore, OD, faces to drawing as applicable.", "Light passes — no thermal damage. Deburr, protect insulation, clean."],
        accept: "Dimensions per drawing; no insulation damage.", record: "Dimensions, equipment ID." },
      { op: 60, qa: true,  dept: "QA",  wc: "INSPECT",  zone: "QC",     title: "Final Inspection",
        steps: ["Final dimensional/visual inspection.", "Interlaminar insulation check per released test."],
        accept: "All characteristics accepted.", record: "Inspection report, final QA stamp." },
      { op: 70, qa: false, dept: "MFG", wc: "MOVE",     zone: "STOCK",  title: "Preserve & Stock",
        steps: ["Clean, preserve, identify.", "Stock for winding / next higher assembly."],
        accept: "Preservation and ID per requirements.", record: "Qty, location, lot ID." },
    ],
  },
  "ROT-3120": {
    desc: "Rotor Assembly", rev: "A", color: "#D06A3C",
    ops: [
      { op: 10,  qa: true,  dept: "QA",  wc: "KIT",      zone: "STOCK",  title: "Kitting",
        steps: ["Pull all items against released BOM; verify PN, rev, qty.", "Verify MAG-3122 matched-set ID and polarity labels.", "Verify ADH-3124/-3125 lots and expiration — reject expired material.", "Complete kitting form; attach certs."],
        accept: "BOM and kitting form compliant; lots recorded.", record: "Kitting form, lots, certs, QA stamp." },
      { op: 20,  qa: true,  dept: "QA",  wc: "INSPECT",  zone: "QC",     title: "Receiving / Pre-Assembly Inspection",
        steps: ["Dimensionally verify shaft journals and datums per drawing.", "Inspect each magnet for chips, cracks, coating damage under magnification.", "Verify sleeve ID/OD and condition."],
        accept: "Conforms to drawing; no chips, cracks, corrosion.", record: "Inspection results, inspector stamp/date." },
      { op: 30,  qa: false, dept: "MFG", wc: "ASSEMBLE", zone: "ROTOR",  title: "Bond Surface Preparation",
        steps: ["Install shaft in soft-jaw fixture; mask journals and datum faces.", "Clean magnet seat with approved solvent; single-direction wipes, one use per face.", "Clean bond face of each magnet; keep magnets segregated, labels visible.", "Record solvent lot and completion time — bond within surface-active window."],
        accept: "Surfaces clean, dry, damage-free; masking complete.", record: "Solvent lot, method, completion time, operator." },
      { op: 40,  qa: true,  dept: "QA",  wc: "MFG",      zone: "ROTOR",  title: "Magnet Dry-Fit & Polarity Verification",
        steps: ["Install polarity fixture; verify fixture ID.", "Dry-fit all magnets in build sequence; verify full seating, no rock.", "Gauss-check alternating N-S pattern; complete polarity map on traveler.", "Do not mix adhesive until dry-fit and polarity map are QA accepted."],
        accept: "Polarity map correct; full seating; axial location per drawing.", record: "Polarity map, fixture ID, QA stamp/date." },
      { op: 50,  qa: false, dept: "MFG", wc: "ASSEMBLE", zone: "ROTOR",  title: "Magnet Bonding",
        steps: ["Verify ADH-3124 lot/expiration; mix per released ratio; record mix start and pot life.", "Bond one magnet at a time to its mapped position; released adhesive pattern — no starved or flooded joints.", "Seat fully; confirm orientation unchanged from dry-fit.", "Complete all magnets within pot life; remove excess before gel — keep poles, journals, datums adhesive-free."],
        accept: "All magnets in mapped positions; bondlines continuous.", record: "Adhesive P/N, lot, mix ratio/time, operator." },
      { op: 60,  qa: true,  dept: "QA",  wc: "INSPECT",  zone: "IMPREG", title: "Magnet Adhesive Cure & Bond Inspection",
        steps: ["Install cure fixture; cure per released schedule; record start/stop, oven ID.", "Post-cure: inspect each bondline under magnification.", "Re-verify polarity map with gauss meter.", "QA accepts before grinding."],
        accept: "Cure within schedule; bondlines conform; polarity re-verified.", record: "Cure data, oven ID, results, QA stamp." },
      { op: 70,  qa: false, dept: "MFG", wc: "MACHINE",  zone: "MACH",   title: "Grind Magnet OD",
        steps: ["Set up between released datums; verify setup runout.", "Confirm extraction and coolant before wheel contact.", "Rough grind leaving finish stock; finish to drawing size, runout, finish.", "Light passes only — stop on discoloration or chatter. Remove all magnetic fines."],
        accept: "OD size, runout, taper, finish per drawing; no thermal damage.", record: "Final OD, runout, taper, finish, equipment ID." },
      { op: 80,  qa: true,  dept: "QA",  wc: "INSPECT",  zone: "QC",     title: "Post-Grind Inspection",
        steps: ["Inspect ground OD and rotor geometry.", "Verify no magnet cracking, chipping, bond separation, overheating, or datum damage."],
        accept: "Dimensions and visual accepted before sleeve installation.", record: "Inspection results, inspector stamp/date." },
      { op: 90,  qa: false, dept: "MFG", wc: "ASSEMBLE", zone: "ROTOR",  title: "Retention Sleeve Installation",
        steps: ["Clean magnet OD and SLV-3123 sleeve ID; verify dry.", "Verify ADH-3125 lot/expiration; mix and record.", "Apply adhesive per released pattern — avoid starvation and trapped air.", "Install sleeve with approved fixture; verify axial position and uniform squeeze-out."],
        accept: "Sleeve fully seated at drawing position; uniform bond evidence.", record: "Adhesive lot/mix, method, sleeve position, operator." },
      { op: 100, qa: true,  dept: "QA",  wc: "CURE",     zone: "IMPREG", title: "Sleeve Adhesive Cure",
        steps: ["Fixture and cure per released schedule.", "Verify sleeve seated and concentric during cure; inspect bond edges after cure."],
        accept: "Cure within schedule; sleeve position conforms.", record: "Cure data, oven ID, results, QA stamp." },
      { op: 110, qa: false, dept: "MFG", wc: "MACHINE",  zone: "MACH",   title: "Finish Grind Sleeve OD",
        steps: ["Finish grind sleeve OD to drawing on rotor datums.", "Control temperature and force — thin-wall sleeve over bonded magnets. Protect journals; clean after."],
        accept: "Sleeve OD, runout, taper, finish per drawing.", record: "Sleeve OD, runout, taper, finish, equipment ID." },
      { op: 120, qa: true,  dept: "QA",  wc: "INSPECT",  zone: "QC",     title: "Final Inspection",
        steps: ["Final dimensional/visual: journals, length, magnet/sleeve axial position, sleeve OD, runout, concentricity, finish.", "Verify traveler complete."],
        accept: "All drawing characteristics accepted.", record: "Inspection report; final QA stamp/date." },
      { op: 130, qa: false, dept: "QA",  wc: "MOVE",     zone: "STOCK",  title: "Preserve, Identify & Stock",
        steps: ["Clean, preserve, identify, package.", "Protect journals and sleeve OD; package for magnetic handling."],
        accept: "Preservation, ID, packaging per requirements.", record: "Qty accepted, stock location, lot/serial." },
    ],
  },
  "MOT-3000": {
    desc: "BLDC Motor Assembly", rev: "C", color: "#3FA26A",
    ops: [
      { op: 10, qa: true,  dept: "MFG",  wc: "KIT",      zone: "STOCK", title: "Kitting",
        steps: ["Verify LAM-3110 and ROT-3120 travelers complete and QA-accepted.", "Record serialized subassembly identities and matched-set refs.", "Verify BRG-6002 matched-set lot and approved source."],
        accept: "QA kitting verification complete; serials recorded.", record: "Kitting form, subassembly serials, bearing lots." },
      { op: 20, qa: false, dept: "MFG",  wc: "INSPECT",  zone: "SUB",   title: "Inspect & Clean Interfaces",
        steps: ["Inspect housing bore, stator OD, bearing seats, endbell pilots, shaft journals.", "Clean with approved solvent; protect windings, leads, insulation."],
        accept: "Surfaces clean, dry, damage-free, within drawing.", record: "Cleaning method; solvent lot if required." },
      { op: 30, qa: false, dept: "MFG",  wc: "WIND",     zone: "WIND",  title: "Install Stator Winding Assembly into Housing",
        steps: ["Verify bore and LAM-3110 OD fit class per drawing.", "Heat housing / press / bond strictly per released process.", "Orient stator so lead exit matches drawing clocking.", "Verify full axial seating against released datum; controlled cooldown before next op."],
        accept: "Stator fully seated; lead orientation correct; no winding damage.", record: "Fit method, temps/forces, operator." },
      { op: 40, qa: true,  dept: "TEST", wc: "TEST",     zone: "TEST",  title: "Post-Installation Electrical Verification",
        steps: ["Verify phase resistance and insulation resistance vs. stator final-test record.", "Detects installation damage before rotor goes in."],
        accept: "Values within released delta of stator record.", record: "Measured values vs. record, equipment ID, QA stamp." },
      { op: 50, qa: false, dept: "MFG",  wc: "ASSEMBLE", zone: "SUB",   title: "Install Rotor & Bearings",
        steps: ["Verify BRG-6002 lot and matched-set ID.", "Press/heat-fit bearings per released method; force on fitted ring only.", "Use guided insertion tooling for ROT-3120 — magnets pull toward stator. Never insert by hand.", "Verify rotor turns freely with no scraping."],
        accept: "Bearings seated; rotor free; no brinelling or impact damage.", record: "Bearing lots, method, operator." },
      { op: 60, qa: false, dept: "MFG",  wc: "MFG",      zone: "SUB",   title: "Close & Set Endplay",
        steps: ["Install endbells, wave spring/shims, retainers, fasteners.", "Set axial endplay/preload per drawing.", "Torque in sequence with calibrated wrench; witness-mark."],
        accept: "Endplay/preload, runout, torque per drawing.", record: "Endplay, shim stack, torques, wrench ID." },
      { op: 70, qa: true,  dept: "TEST", wc: "TEST",     zone: "TEST",  title: "Motor Acceptance Test",
        steps: ["Full ATP: resistance/balance, IR, dielectric, back-EMF/Ke, commutation phasing, no-load current/speed/direction, vibration/noise, sensor verification."],
        accept: "All values meet released ATP; electronic record retained.", record: "ATP data file, equipment IDs, tester stamp." },
      { op: 80, qa: true,  dept: "QA",   wc: "INSPECT",  zone: "QC",    title: "Final Inspection",
        steps: ["Configuration, lead/connector ID, pinout, shaft condition, witness marks, cleanliness, nameplate, serialization.", "Verify all subassembly and motor travelers complete."],
        accept: "Final QA acceptance.", record: "Final QA stamp/date." },
      { op: 90, qa: false, dept: "MFG",  wc: "MOVE",     zone: "STOCK", title: "Preserve & Stock",
        steps: ["Cap connector/shaft; package with corrosion and ESD protection.", "Stock for next higher assembly or shipment."],
        accept: "Stock transaction complete.", record: "Location, qty, serial." },
    ],
  },
  "BRK-4000": {
    desc: "Brake Assembly", rev: "B", color: "#B85C7A",
    ops: [
      { op: 10, qa: true,  dept: "QA",   wc: "KIT",      zone: "STOCK", title: "Kitting",
        steps: ["Kit COI-4101 coil, BAC-4103 back iron, ARM-4102 armature, SPR-4104 springs (3), FRI-4105 friction disc per BOM.", "Verify plating condition and traceability."],
        accept: "BOM/kitting compliant.", record: "Kitting form, lots." },
      { op: 20, qa: false, dept: "MFG",  wc: "ASSEMBLE", zone: "SUB",   title: "Coil Installation",
        steps: ["Install/pot brake coil in back iron per released process.", "Verify lead routing and strain relief."],
        accept: "Coil seated; leads per drawing.", record: "Coil lot, potting lot if applicable." },
      { op: 30, qa: false, dept: "TEST", wc: "TEST",     zone: "TEST",  title: "Coil Electrical Check",
        steps: ["Verify coil resistance and insulation resistance per released values."],
        accept: "Values per drawing/ATP.", record: "Measured values, equipment ID." },
      { op: 40, qa: false, dept: "MFG",  wc: "MFG",      zone: "SUB",   title: "Armature, Springs & Friction Disc",
        steps: ["Verify spring free length (sample) per drawing.", "Install springs in released pattern.", "Install armature — verify flatness/orientation.", "Install friction disc; no contamination on friction surfaces."],
        accept: "Stack-up per drawing; friction surfaces clean/dry.", record: "Spring lot, disc lot." },
      { op: 50, qa: true,  dept: "MFG",  wc: "MFG",      zone: "SUB",   title: "Set Air Gap",
        steps: ["Set working air gap per released shim/setting procedure.", "Torque fasteners in sequence; apply witness marks."],
        accept: "Air gap within drawing limit.", record: "Air gap, shim stack, torques." },
      { op: 60, qa: true,  dept: "TEST", wc: "TEST",     zone: "TEST",  title: "Functional Test",
        steps: ["Verify release/dropout at released values.", "Verify holding function per ATP."],
        accept: "All ATP values met.", record: "Test values, equipment ID." },
      { op: 70, qa: false, dept: "QA",   wc: "INSPECT",  zone: "QC",    title: "Final Inspect & Stock",
        steps: ["Final visual/config inspection; preserve, identify, stock."],
        accept: "Final QA acceptance.", record: "Qty, location, QA stamp." },
    ],
  },
  "ACT-1000": {
    desc: "Electromechanical Actuator Assembly", rev: "1", color: "#E5A33B",
    ops: [
      { op: 10,  qa: true,  dept: "MFG",  wc: "KIT",      zone: "STOCK", title: "Kitting",
        steps: ["Kit all released components and completed lower-level assemblies per BOM: GH-2000, MOT-3000, BRK-4000, ENC-5000.", "Verify PN, rev, qty, shelf life, lot traceability, cert status, preservation."],
        accept: "QA verifies BOM compliance; serialized subassemblies recorded.", record: "Kitting form, serial IDs." },
      { op: 20,  qa: false, dept: "MFG",  wc: "INSPECT",  zone: "FINAL", title: "Clean & Inspect Interfaces",
        steps: ["Clean and inspect mating faces, pilots, dowels, threads, electrical interfaces, seals, connector surfaces.", "No burrs, corrosion, damage, FOD."],
        accept: "Visual inspection acceptable.", record: "Cleaning method; solvent lot if required." },
      { op: 30,  qa: false, dept: "MFG",  wc: "ASSEMBLE", zone: "FINAL", title: "Install Gearhead",
        steps: ["Install GH-2000 to HSG-6000 main housing. Engage pilot/dowels without forcing.", "Approved threadlocker where specified; torque cross-pattern per released table."],
        accept: "Full seating, no visible gap; torque recorded.", record: "Torque wrench ID, final torque." },
      { op: 40,  qa: false, dept: "MFG",  wc: "ASSEMBLE", zone: "FINAL", title: "Install Motor Assembly",
        steps: ["Install MOT-3000; verify shaft/coupling engagement.", "Do not transmit assembly force through motor bearings.", "Verify axial seating and free rotation before tightening."],
        accept: "Shaft rotates smoothly by hand; no binding.", record: "Operator, torque data." },
      { op: 50,  qa: false, dept: "MFG",  wc: "ASSEMBLE", zone: "FINAL", title: "Install Brake & Set Gap",
        steps: ["Install BRK-4000 and hub/coupling.", "Set working air gap per released shim procedure. Torque and witness-mark."],
        accept: "Air gap within drawing limit.", record: "Air gap, shim stack, torques." },
      { op: 60,  qa: false, dept: "MFG",  wc: "ASSEMBLE", zone: "FINAL", title: "Install Encoder / Feedback",
        steps: ["Install ENC-5000; align zero/index per drawing or electrical setup.", "Route harness with released bend radius, clearance, strain relief, chafe protection."],
        accept: "Alignment recorded; harness retained; continuity verified.", record: "Alignment value, continuity results." },
      { op: 70,  qa: false, dept: "MFG",  wc: "ASSEMBLE", zone: "FINAL", title: "Install Harness / Cable",
        steps: ["Install and route CON-8000 per drawing: bend radius, strain relief, clocking, connector torque.", "Verify pinout continuity."],
        accept: "Routing and continuity per drawing.", record: "Continuity results, connector torque." },
      { op: 80,  qa: true,  dept: "TEST", wc: "TEST",     zone: "TEST",  title: "Low-Speed Functional Test",
        steps: ["Energize with current-limited source.", "Verify rotation direction, commutation, brake release/re-engagement, absence of abnormal noise/vibration."],
        accept: "Direction correct; values within released ATP.", record: "Current, speed, brake values." },
      { op: 90,  qa: true,  dept: "TEST", wc: "TEST",     zone: "TEST",  title: "Acceptance Test (ATP)",
        steps: ["Full ATP under representative load where fixture available: currents, speed, backlash, running torque, brake holding torque."],
        accept: "All ATP results acceptable.", record: "ATP data file, equipment IDs." },
      { op: 100, qa: true,  dept: "QA",   wc: "INSPECT",  zone: "QC",    title: "Final Inspection",
        steps: ["Final visual/dimensional: nameplate/serialization, witness marks, connector ID, workmanship, cleanliness, configuration vs. released BOM.", "Closure of all prior ops."],
        accept: "Final inspection accepted; configuration matches BOM.", record: "Final QA stamp/date." },
      { op: 110, qa: false, dept: "MFG",  wc: "MOVE",     zone: "STOCK", title: "Preserve, Package & Ship/Stock",
        steps: ["Protective caps and preservation; package per approved instruction.", "Transfer to controlled stock or shipment."],
        accept: "Stock transaction complete.", record: "Location, qty." },
    ],
  },
  "STA-3100": {
    desc: "Stator Assembly (Wound)", rev: "A", color: "#2C8AA0",
    ops: [
      { op: 10, qa: true,  dept: "QA",   wc: "KIT",    zone: "STOCK",  title: "Kitting",
        steps: ["Verify LAM-3110 stack traveler complete and QA-accepted; record serial.", "Kit WND-3112 magnet wire, INS-3113 slot liners, VAR-3114 varnish per BOM.", "Verify wire lot certs and varnish shelf life — reject expired material."],
        accept: "BOM and kitting form compliant; lots recorded.", record: "Kitting form, stack serial, lots, QA stamp." },
      { op: 20, qa: false, dept: "MFG",  wc: "WIND",   zone: "WIND",   title: "Wind Stator",
        steps: ["Install slot liners per drawing.", "Wind three-phase coils per released pattern; verify turns count per coil.", "Protect laminations and insulation throughout — no scraped wire."],
        accept: "Turns count and pattern per released winding spec.", record: "Turns count, wire lot, operator." },
      { op: 30, qa: false, dept: "MFG",  wc: "WIND",   zone: "WIND",   title: "Connect & Lace",
        steps: ["Terminate and solder phase leads per drawing; verify lead clocking.", "Lace end turns; verify clearances to bore and frame."],
        accept: "Terminations per drawing; end turns secured; clearances met.", record: "Solder lot, operator." },
      { op: 40, qa: true,  dept: "TEST", wc: "TEST",   zone: "TEST",   title: "Pre-Impregnation Electrical Test",
        steps: ["Measure phase resistance and balance, insulation resistance, and surge compare per released ATP.", "QA accepts before impregnation."],
        accept: "All values within released pre-VPI limits.", record: "Measured values, equipment ID, QA stamp." },
      { op: 50, qa: true,  dept: "QA",   wc: "CURE",   zone: "IMPREG", title: "VPI Impregnation & Cure",
        steps: ["Impregnate per released VPI schedule; verify vacuum/pressure profile.", "Cure per released bake schedule; record start/stop, oven ID; retain chart.", "Post-cure: verify no drips in bore, slots clear, workmanship acceptable."],
        accept: "VPI and cure within released schedule; bore and slots clear.", record: "VPI cycle data, cure chart, oven ID, QA stamp." },
      { op: 60, qa: false, dept: "TEST", wc: "TEST",   zone: "TEST",   title: "Post-Cure Electrical Verification",
        steps: ["Repeat resistance and IR; verify within released delta of pre-VPI record."],
        accept: "Values within released post-cure limits.", record: "Measured values vs. record, equipment ID." },
      { op: 70, qa: true,  dept: "QA",   wc: "INSPECT", zone: "QC",    title: "Final Inspection",
        steps: ["Final dimensional/visual: OD, lead length and ID, workmanship, cleanliness.", "Verify traveler complete."],
        accept: "All characteristics accepted.", record: "Inspection report, final QA stamp." },
      { op: 80, qa: false, dept: "MFG",  wc: "MOVE",   zone: "STOCK",  title: "Preserve & Stock",
        steps: ["Preserve, identify, and stock for motor assembly or shipment."],
        accept: "Preservation and ID per requirements.", record: "Qty, location, serial." },
    ],
  },
};

/* ---------- Product structure (from ACT-1000 Family Tree doc) ---------- */
const ITEMS = {
  "ACT-1000": [["ENC-5000","ENCODER ASSEMBLY","1","▲"],["HSG-6000","MAIN HOUSING","1"],["OUT-7000","OUTPUT SHAFT","1"],["CON-8000","HARNESS","1"]],
  "GH-2000":  [["GH-2100","GEAR HOUSING","1"],["SHA-2101","SUN GEAR","1"],["PLN-2102","PLANET GEAR","3"],["CAR-2104","PLANET CARRIER","1"],["RNG-2105","RING GEAR","1"],["BRG-6203","BEARING","2"]],
  "MOT-3000": [["WND-3112","THREE-PHASE WINDING","1"],["BRG-6002","ROTOR BEARING","2"]],
  "LAM-3110": [["LAM-3111","ELECTRICAL STEEL LAMINATION","120"],["ADH-3112","BONDING EPOXY","1"]],
  "ROT-3120": [["SHA-3121","ROTOR SHAFT","1"],["MAG-3122","PERMANENT MAGNET","8"],["SLV-3123","MAGNET RETENTION SLEEVE","1"],["ADH-3124","MAGNET BONDING EPOXY","AR"],["ADH-3125","SLEEVE BONDING EPOXY","AR"]],
  "BRK-4000": [["COI-4101","BRAKE COIL","1"],["BAC-4103","BRAKE BACK IRON","1"],["ARM-4102","ARMATURE PLATE","1"],["SPR-4104","COMPRESSION SPRING","3"],["FRI-4105","FRICTION DISC","1"]],
  "STA-3100": [["WND-3112","THREE-PHASE WINDING","1"],["INS-3113","SLOT LINER","AR"],["VAR-3114","IMPREGNATION VARNISH","AR"]],
};
const CHILDREN = {
  "ACT-1000": ["GH-2000", "MOT-3000", "BRK-4000"],
  "MOT-3000": ["LAM-3110", "ROT-3120"],
  "STA-3100": ["LAM-3110"],
};
const buildTree = (p) => ({ part: p, children: (CHILDREN[p] || []).map(buildTree) });
const treeParts = (p) => { const out = []; (function w(n){ out.push(n.part); n.children.forEach(w); })(buildTree(p)); return out; };

/* ---------- Sales orders ---------- */
const SOS = [
  { so: "4103", part: "ACT-1000", config: "Full Actuator Assembly",      qty: 6,  due: "Aug 14" },
  { so: "4104", part: "MOT-3000", config: "Housed Motor Assembly",       qty: 4,  due: "Aug 05" },
  { so: "4105", part: "ROT-3120", config: "Rotor Assembly — spares",     qty: 8,  due: "Aug 10" },
  { so: "4106", part: "STA-3100", config: "Stator Assembly",             qty: 10, due: "Aug 12" },
  { so: "4107", part: "GH-2000",  config: "Planetary Gearhead — spares", qty: 6,  due: "Aug 10" },
  { so: "4108", part: "ACT-1000", config: "Full Actuator Assembly",      qty: 2,  due: "Sep 04" },
  { so: "4109", part: "LAM-3110", config: "Stator Lamination Stack",     qty: 20, due: "Aug 08" },
  { so: "4110", part: "BRK-4000", config: "Brake Assembly — spares",     qty: 12, due: "Aug 21" },
  { so: "4111", part: "MOT-3000", config: "Housed Motor Assembly",       qty: 2,  due: "Sep 11" },
  { so: "4112", part: "STA-3100", config: "Stator Assembly",             qty: 4,  due: "Aug 28" },
];
const soSummary = (so, jobs) => {
  const js = jobs.filter(j => j.so === so);
  const active = js.filter(j => j.status === "active").length;
  const holds = js.filter(j => j.status === "hold").length;
  const done = js.filter(j => j.status === "complete").length;
  const pct = js.length ? Math.round(js.reduce((a, j) => a + j.cur / PARTS[j.part].ops.length, 0) / js.length * 100) : 0;
  return { js, active, holds, done, pct, released: js.length > 0 };
};

/* ---------- QR: generation + camera decode (bundled npm libs) ---------- */
function QRCodeSVG({ value, size = 148 }) {
  const [mods, setMods] = useState(null); // { n, grid }
  const [err, setErr] = useState(false);
  useEffect(() => {
    try {
      const q = qrcode(0, "M");
      q.addData(value); q.make();
      const n = q.getModuleCount();
      const grid = [];
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) grid.push([r, c]);
      setMods({ n, grid }); setErr(false);
    } catch (e) { setErr(true); }
  }, [value]);
  if (err) return (
    <div style={{ width: size, height: size, border: "2px dashed #B8C0CC", borderRadius: 6, display: "flex",
                  alignItems: "center", justifyContent: "center", fontSize: 10, color: "#8A93A0", textAlign: "center", padding: 8 }}>
      QR unavailable (offline / CDN blocked)
    </div>
  );
  if (!mods) return <div style={{ width: size, height: size, background: "#F1F2F4", borderRadius: 6 }} />;
  const Q = 2; // quiet zone modules
  const vb = mods.n + Q * 2;
  return (
    <svg viewBox={`0 0 ${vb} ${vb}`} width={size} height={size} style={{ display: "block", background: "#fff", borderRadius: 4 }}
         shapeRendering="crispEdges" aria-label={value}>
      {mods.grid.map(([r, c], i) => <rect key={i} x={c + Q} y={r + Q} width={1} height={1} fill="#14181D" />)}
    </svg>
  );
}

function KittingCardModal({ job, onClose }) {
  const p = PARTS[job.part];
  const op = p.ops[Math.min(job.cur, p.ops.length - 1)];
  const payload = `SW:${job.id}`;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(16,26,40,.58)",
                                    display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={e => e.stopPropagation()}
           style={{ width: "min(460px, 96vw)", background: "#FFFFFF", borderRadius: 10, overflow: "hidden",
                    boxShadow: "0 24px 70px rgba(0,0,0,.45)" }}>
        <div style={{ background: C.navy, color: "#fff", padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontWeight: 800, fontSize: 13.5, letterSpacing: 0.5 }}>KITTING CARD · JOB TRAVELER</span>
          <span style={{ fontSize: 11, opacity: 0.8 }}>shop<span style={{ color: C.gold, fontWeight: 800 }}>WORKS</span></span>
        </div>
        <div style={{ display: "flex", gap: 14, padding: "14px 16px", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 170 }}>
            <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 22, color: C.navy }}>SO {job.so}</div>
            <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 15, color: p.color, marginTop: 2 }}>{job.part} <span style={{ color: "#8A93A0" }}>Rev {p.rev}</span></div>
            <div style={{ fontSize: 12, color: "#3C424A", marginTop: 2 }}>{p.desc}</div>
            <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "auto 1fr", rowGap: 4, columnGap: 10, fontSize: 12 }}>
              {[["JOB", job.id], ["QTY", String(job.qty)], ["DUE", job.due],
                ["STATUS", job.status === "complete" ? "COMPLETE" : `OP ${op.op} · ${op.title}`]].map(([k, v]) => (
                [<span key={k + "k"} style={{ color: "#8A93A0", fontWeight: 800, fontSize: 10, letterSpacing: 1, alignSelf: "baseline" }}>{k}</span>,
                 <span key={k + "v"} style={{ fontFamily: MONO, fontWeight: 700 }}>{v}</span>]
              ))}
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <QRCodeSVG value={payload} size={150} />
            <div style={{ fontFamily: MONO, fontSize: 10, color: "#59636F", marginTop: 4 }}>{payload}</div>
          </div>
        </div>
        <div style={{ padding: "0 16px 12px 16px", fontSize: 11, color: "#59636F", lineHeight: 1.5 }}>
          Travels with the hardware from kitting. Scan at any station tablet to open this traveler at its current step —
          the QR encodes only the job ID; the tablet fetches live state on scan.
        </div>
        <div style={{ display: "flex", gap: 8, padding: "0 16px 14px 16px" }}>
          <button onClick={() => window.print()} style={{ ...btnGhost, flex: 1 }}>🖨 Print</button>
          <button onClick={onClose} style={{ ...btnPrimary, flex: 1, background: C.navy }}>Close</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Floor plan zones (faithful trace of facility plan) ----------
   cap: [min, max] = normal WIP band. load < min → under (blue tint),
   load > max → over (red tint), within band → clear. cap:null = untracked.
   dashed = dashed dept boundary (open production hall); container = draw only. */
const ZONES = [
  { id: "DOCK",   label: "LOADING DOCK",        x: 120,  y: 28,  w: 210, h: 240, fill: "#D5D7DA", cap: null, anchor: [225, 190] },
  { id: "QC",     label: "QC / INSPECTION",     label2: "ROOM", x: 333, y: 28, w: 170, h: 240, fill: "#F1DFA5", cap: [2, 3], anchor: [418, 150], center: true, ly: 190 },
  { id: "MA",     label: "MOTOR ASSEMBLY",      x: 505,  y: 28,  w: 355, h: 240, fill: "#C3D7ED", cap: null, anchor: null, container: true, center: true, ly: 58 },
  { id: "SUB",    label: "SUB",                 label2: "ASSEMBLY", x: 515, y: 115, w: 103, h: 130, fill: "#CDDEF0", cap: [1, 2], anchor: [566, 190], dashed: true, center: true, small: true },
  { id: "FINAL",  label: "FINAL",               label2: "ASSEMBLY", x: 622, y: 115, w: 108, h: 130, fill: "#CDDEF0", cap: [1, 2], anchor: [676, 190], dashed: true, center: true, small: true },
  { id: "TEST",   label: "TEST &",              label2: "CHECKOUT", x: 734, y: 115, w: 96,  h: 130, fill: "#CDDEF0", cap: [1, 2], anchor: [782, 190], dashed: true, center: true, small: true },
  { id: "NPI",    label: "NPI ROOM",            label2: "NEW PRODUCT INTRO", x: 862, y: 55, w: 148, h: 215, fill: "#CBDCEF", cap: null, anchor: [936, 170], center: true, small: true },
  { id: "VP",     label: "VP",                  label2: "OFFICE", x: 1014, y: 55, w: 128, h: 195, fill: "#F0CDA5", cap: null, center: true, small: true },
  { id: "PRES",   label: "PRESIDENT",           label2: "OFFICE", x: 1146, y: 55, w: 120, h: 195, fill: "#F0CDA5", cap: null, center: true, small: true },
  { id: "LCONF",  label: "LARGE CONFERENCE",    label2: "ROOM", x: 1270, y: 55, w: 232, h: 212, fill: "#F0CDA5", cap: null, center: true, ly: 210 },
  { id: "CONF",   label: "CONFERENCE",          label2: "ROOM", x: 1305, y: 282, w: 168, h: 168, fill: "#F0CDA5", cap: null, center: true, small: true },
  { id: "HALL",   label: "",                    x: 303,  y: 272, w: 527, h: 528, fill: "#C3D7ED", cap: null, container: true },
  { id: "MACH",   label: "MACHINE",             label2: "SHOP", x: 120, y: 275, w: 178, h: 300, fill: "#CFE0C5", cap: [0, 1], anchor: [209, 468], center: true, ly: 306 },
  { id: "WIND",   label: "WINDING DEPARTMENT",  x: 345,  y: 300, w: 460, h: 205, fill: "#C3D7ED", cap: [2, 4], anchor: [420, 386], dashed: true, center: true, ly: 402 },
  { id: "QUAL",   label: "QUALITY",             label2: "DEPARTMENT", x: 845, y: 318, w: 172, h: 195, fill: "#D4E2CC", cap: null, anchor: [930, 430], center: true, small: true },
  { id: "ENG",    label: "ENGINEERING",         label2: "DEPARTMENT", poly: "1022,335 1252,335 1252,690 845,690 845,518 1022,518", lx: 1136, ly: 560, fill: "#D4E2CC", cap: null, anchor: [1060, 610], center: true },
  { id: "IMPREG", label: "IMPREGNATION",        label2: "ROOM", x: 120, y: 580, w: 178, h: 218, fill: "#D9CBE8", cap: [0, 1], anchor: [209, 704], center: true, ly: 604, small: true },
  { id: "ROTOR",  label: "ROTOR",               label2: "DEPARTMENT", x: 333, y: 518, w: 235, h: 145, fill: "#C3D7ED", cap: [1, 2], anchor: [450, 606], dashed: true, center: true, small: true },
  { id: "STACK",  label: "STACKING",            label2: "DEPARTMENT", x: 590, y: 518, w: 238, h: 145, fill: "#C3D7ED", cap: [1, 2], anchor: [709, 606], dashed: true, center: true, small: true },
  { id: "STOCK",  label: "STOCK ROOM",          x: 345,  y: 668, w: 450, h: 130, fill: "#DFD0AF", cap: [0, 3], anchor: [570, 745], center: true },
  { id: "IT",     label: "IT /",                label2: "SERVER", x: 1045, y: 700, w: 100, h: 96, fill: "#D5D7DA", cap: null, center: true, small: true },
  { id: "COPY",   label: "COPY / FILE",         label2: "ROOM", x: 1150, y: 700, w: 118, h: 96, fill: "#D5D7DA", cap: null, center: true, small: true },
  { id: "LOBBY",  label: "LOBBY /",             label2: "RECEPTION", x: 1288, y: 528, w: 148, h: 268, fill: "#EFE4D2", cap: null, anchor: [1362, 680], center: true, small: true },
];

/* Equipment / furniture glyphs [x,y,w,h] */
const EQUIP = {
  MACH:  [[130,322,44,30],[196,322,52,32],[132,368,58,34],[214,378,40,46],[134,470,64,32],[214,470,48,30],[150,530,54,26]],
  WIND:  [[372,318,52,34],[448,312,40,40],[506,318,46,34],[586,314,58,38],[672,318,56,34],[372,428,44,52],[432,438,40,40],[492,432,56,40],[610,428,50,50],[712,420,44,60]],
  ROTOR: [[352,570,42,50],[432,570,42,50],[512,570,42,50]],
  STACK: [[608,570,46,50],[682,570,46,50],[756,570,46,50]],
  SUB:   [[528,215,70,26]], FINAL: [[636,215,72,26]], TEST: [[748,215,70,26]],
  QC:    [[352,52,52,28],[420,52,56,28],[344,120,30,60],[348,210,64,30]],
  IMPREG:[[140,618,66,64],[140,700,44,34],[196,752,34,24]],
  STOCK: [[370,700,54,44],[438,700,54,44],[540,700,54,44],[608,700,54,44],[672,700,44,44],[724,676,56,34]],
  NPI:   [[880,90,74,40],[880,205,52,28]],
  VP:    [[1040,140,64,40]], PRES: [[1168,140,64,40]],
  LCONF: [[1310,120,150,60]], CONF: [[1340,330,96,54]],
  QUAL:  [[862,350,64,26],[862,455,72,28],[930,392,56,40]],
  ENG:   [[1052,360,64,32],[1140,360,64,32],[880,545,66,32],[975,545,66,32],[1090,590,70,34],[1160,630,70,34],[900,625,66,32]],
  LOBBY: [[1310,560,58,30],[1316,720,48,26]],
};

/* ---------- Seed jobs ---------- */
const SEED_JOBS = [
  /* SO 4103 — Full Actuator (whole tree in works) */
  { id: "J-4521", so: "4103", part: "ROT-3120", qty: 6, cur: 4, status: "active", operator: "R. Maldonado", signoffs: seed(4, "ROT-3120"), due: "Jul 31" },
  { id: "J-4498", so: "4103", part: "LAM-3110", qty: 6, cur: 3, status: "active", operator: "D. Liu", signoffs: seed(3, "LAM-3110"), due: "Jul 29" },
  { id: "J-4502", so: "4103", part: "GH-2000",  qty: 6, cur: 3, status: "active", operator: "M. Reyes", signoffs: seed(3, "GH-2000"),  due: "Aug 03" },
  { id: "J-4515", so: "4103", part: "MOT-3000", qty: 6, cur: 2, status: "active", operator: "J. Santos", signoffs: seed(2, "MOT-3000"), due: "Aug 07" },
  { id: "J-4488", so: "4103", part: "BRK-4000", qty: 6, cur: 5, status: "hold",   operator: null,   signoffs: seed(5, "BRK-4000"), due: "Jul 28", holdReason: "NCR-0231 — release voltage out of tolerance" },
  { id: "J-4530", so: "4103", part: "ACT-1000", qty: 6, cur: 0, status: "active", operator: "K. Osei", signoffs: [],                  due: "Aug 14" },
  /* SO 4104 — Housed Motor (subs in works, motor not released) */
  { id: "J-4536", so: "4104", part: "ROT-3120", qty: 4, cur: 6, status: "active", operator: "T. Kowalski", signoffs: seed(6, "ROT-3120"), due: "Jul 30" },
  { id: "J-4541", so: "4104", part: "LAM-3110", qty: 4, cur: 4, status: "active", operator: null, signoffs: seed(4, "LAM-3110"), due: "Jul 29" },
  /* SO 4105 — Rotor spares */
  { id: "J-4548", so: "4105", part: "ROT-3120", qty: 8, cur: 1, status: "active", operator: "S. Whitfield (QA)", signoffs: seed(1, "ROT-3120"), due: "Aug 10" },
  /* SO 4106 — Stator Assembly (in VPI) */
  { id: "J-4552", so: "4106", part: "STA-3100", qty: 10, cur: 4, status: "active", operator: "A. Price", signoffs: seed(4, "STA-3100"), due: "Aug 12" },
  /* SO 4107 — Gearhead spares */
  { id: "J-4526", so: "4107", part: "GH-2000",  qty: 6, cur: 1, status: "active", operator: null, signoffs: seed(1, "GH-2000"),  due: "Aug 10" },
  /* SO 4109 — Lamination stacks */
  { id: "J-4544", so: "4109", part: "LAM-3110", qty: 20, cur: 2, status: "active", operator: "L. Braun", signoffs: seed(2, "LAM-3110"), due: "Aug 08" },
  /* SO 4108 / 4110 / 4111 / 4112 — scheduled, not released (no travelers) */
];
function seed(n, part) {
  const ops = PARTS[part].ops;
  const ppl = ["R.M.", "T.K.", "J.S.", "A.P.", "D.L."];
  return Array.from({ length: n }, (_, i) => {
    const hr = 8 + (i % 8);
    return {
      op: ops[i].op, operator: ppl[i % ppl.length], qtyA: null, qtyR: 0,
      ts: `Jul ${20 + (i % 5)}, ${hr < 10 ? "0" : ""}${hr}:${15 + (i % 6) * 7} AM`,
      qaStamp: ops[i].qa ? "QA-07" : null,
    };
  });
}

/* ---------------------- KIT CARD (issued kit, QR referenced) ---------------------- */
function KitCardModal({ kit, onClose }) {
  const payload = `SW:KIT:${kit.id}`;
  const partial = kit.id.includes("-");
  const issued = kit.status === "issued";
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(16,26,40,.58)",
                                    display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={e => e.stopPropagation()}
           style={{ width: "min(480px, 96vw)", maxHeight: "90vh", overflowY: "auto", background: "#FFFFFF",
                    borderRadius: 10, boxShadow: "0 24px 70px rgba(0,0,0,.45)" }}>
        <div style={{ background: C.navy, color: "#fff", padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontWeight: 800, fontSize: 13.5, letterSpacing: 0.5 }}>KIT CARD · {issued ? "ISSUED KIT" : "KIT TICKET"}</span>
          <span style={{ fontSize: 11, opacity: 0.85 }}>shop<span style={{ color: C.gold, fontWeight: 800 }}>WORKS</span></span>
        </div>
        <div style={{ display: "flex", gap: 14, padding: "14px 16px", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 190 }}>
            <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 22, color: C.navy }}>
              SO {partial ? <>{kit.so}<span style={{ color: C.amber }}>{kit.id.slice(kit.so.length)}</span></> : kit.id}
            </div>
            {partial && <span style={{ fontSize: 9.5, fontWeight: 800, color: "#8A6A16", background: "#FBF3E2",
                                       border: "1px solid #DDD3B8", borderRadius: 5, padding: "2px 8px" }}>PARTIAL KIT</span>}
            <div style={{ fontSize: 12.5, fontWeight: 700, marginTop: 6 }}>{kit.config}</div>
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 9.5, letterSpacing: 1, fontWeight: 800, color: "#8A93A0", marginBottom: 3 }}>ASSEMBLIES IN THIS KIT</div>
              {kit.parts.map(pt => (
                <div key={pt} style={{ fontSize: 11.5, padding: "1.5px 0" }}>
                  <span style={{ fontFamily: MONO, fontWeight: 800, color: PARTS[pt].color }}>{pt}</span>
                  <span style={{ color: "#3C424A" }}> — {PARTS[pt].desc}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "auto 1fr", rowGap: 4, columnGap: 10, fontSize: 12 }}>
              {[["QTY", issued ? `${kit.issuedQty} issued of ${kit.qty}` : `${kit.qty} planned`],
                ["DUE", kit.due], ["WEEK", `WK ${kit.week + 1} · ${wkLabel(kit.week)}`],
                ...(issued ? [["KITTER", kit.kitter], ["ISSUED", kit.ts]] : [])].map(([k, v]) => (
                [<span key={k + "k"} style={{ color: "#8A93A0", fontWeight: 800, fontSize: 10, letterSpacing: 1 }}>{k}</span>,
                 <span key={k + "v"} style={{ fontFamily: MONO, fontWeight: 700 }}>{v}</span>]
              ))}
            </div>
            {kit.note && <div style={{ fontSize: 11, color: "#59636F", fontStyle: "italic", marginTop: 6 }}>Note: {kit.note}</div>}
          </div>
          <div style={{ textAlign: "center" }}>
            <QRCodeSVG value={payload} size={150} />
            <div style={{ fontFamily: MONO, fontSize: 10, color: "#59636F", marginTop: 4 }}>{payload}</div>
          </div>
        </div>
        <div style={{ padding: "0 16px 12px 16px", fontSize: 11, color: "#59636F", lineHeight: 1.5 }}>
          Travels with the kitted hardware. Scan at any station tablet to reference this kit — SO, contents,
          issued quantity, and kitter sign-off.
        </div>
        <div style={{ display: "flex", gap: 8, padding: "0 16px 14px 16px" }}>
          <button onClick={() => window.print()} style={{ ...btnGhost, flex: 1 }}>🖨 Print</button>
          <button onClick={onClose} style={{ ...btnPrimary, flex: 1, background: C.navy }}>Close</button>
        </div>
      </div>
    </div>
  );
}

/* ============================ APP ============================ */
export default function App() {
  const [jobs, setJobs] = useState(SEED_JOBS);
  const [view, setView] = useState({ name: "map" }); // map | sos | so | traveler | station | scan
  const [selZone, setSelZone] = useState(null);
  const [toast, setToast] = useState(null);
  const [ncrSeq, setNcrSeq] = useState(232);
  const [plan, setPlan] = useState({ orders: [], hopper: [], docs: {}, kits: [] });

  const stats = useMemo(() => {
    const active = jobs.filter(j => j.status !== "complete");
    const holds = jobs.filter(j => j.status === "hold" || (j.status === "active" && PARTS[j.part].ops[j.cur]?.qa));
    const complete = jobs.filter(j => j.status === "complete");
    return { active: active.length, holds: holds.length, complete: complete.length };
  }, [jobs]);

  const jobZone = (j) =>
    j.status === "complete" ? "STOCK" : PARTS[j.part].ops[Math.min(j.cur, PARTS[j.part].ops.length - 1)].zone;

  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3400); };
  const openSO = (so) => setView({ name: "so", so });
  const openTraveler = (id) => setView({ name: "traveler", jobId: id });
  const openStation = (id, from = "traveler") => setView({ name: "station", jobId: id, from });
  const navAfterStation = (from, jobId) =>
    setView(from === "scan" ? { name: "scan" } : { name: "traveler", jobId });

  const signOff = (jobId, payload, from) => {
    setJobs(prev => prev.map(j => {
      if (j.id !== jobId) return j;
      const ops = PARTS[j.part].ops;
      const op = ops[j.cur];
      const rec = { op: op.op, operator: payload.operator, qtyA: payload.qtyA, qtyR: payload.qtyR,
                    note: payload.note || null, photos: payload.photos || 0,
                    ts: "Jul 25, " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                    qaStamp: op.qa ? payload.inspector : null };
      const next = j.cur + 1;
      const done = next >= ops.length;
      return { ...j, cur: next, status: done ? "complete" : "active", operator: null, signoffs: [...j.signoffs, rec] };
    }));
    const j = jobs.find(x => x.id === jobId);
    const ops = PARTS[j.part].ops;
    const done = j.cur + 1 >= ops.length;
    if (done) {
      flash(`${jobId} (SO ${j.so}) complete — traveler PDF archived, moved to Stock`);
      from === "scan" ? setView({ name: "scan" }) : setView({ name: "so", so: j.so });
    } else {
      const nz = ops[j.cur + 1].zone;
      flash(`OP ${ops[j.cur].op} signed off — ${jobId} moves to ${ZONES.find(z => z.id === nz)?.label}`);
      from === "scan" ? setView({ name: "scan" }) : setView({ name: "traveler", jobId });
    }
  };

  const raiseNCR = (jobId, desc, from) => {
    const num = `NCR-2026-0${ncrSeq}`;
    setNcrSeq(n => n + 1);
    setJobs(prev => prev.map(j => j.id === jobId
      ? { ...j, status: "hold", holdReason: `${num} — pending Quality/Engineering disposition — ${desc}` } : j));
    flash(`Non-conformance ${num} reported — routed to Quality & Engineering; ${jobId} held pending disposition`);
    navAfterStation(from, jobId);
  };
  const requestSupport = (jobId, teams, note) => {
    flash(`Support alert for ${jobId} → ${teams.join(" · ")}${note ? " — " + note : ""} (job keeps running)`);
  };
  const releaseHold = (jobId) => {
    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: "active", holdReason: null } : j));
    flash(`${jobId} released from hold (supervisor)`);
  };

  const curJob = view.jobId ? jobs.find(j => j.id === view.jobId) : null;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: SANS }}>
      <Header stats={stats} view={view} setView={setView} />
      {toast && <Toast msg={toast} />}
      {view.name === "map" && (
        <MapView jobs={jobs} jobZone={jobZone} selZone={selZone} setSelZone={setSelZone}
                 openTraveler={openTraveler} openSO={openSO} />
      )}
      {view.name === "sos" && <SOListView jobs={jobs} openSO={openSO} />}
      {view.name === "plan" && <PlanningView jobs={jobs} plan={plan} setPlan={setPlan} />}
      {view.name === "bw" && <BandwidthView jobs={jobs} plan={plan} />}
      {view.name === "kit" && <KittingView plan={plan} setPlan={setPlan} />}
      {view.name === "so" && (
        <SOTreeView so={view.so} jobs={jobs} back={() => setView({ name: "sos" })} openTraveler={openTraveler} />
      )}
      {view.name === "scan" && <ScanView jobs={jobs} kits={plan.kits} openStation={(id) => openStation(id, "scan")} />}
      {view.name === "traveler" && (
        <TravelerView job={curJob} back={() => setView({ name: "map" })}
                      openStation={() => openStation(view.jobId, "traveler")}
                      openSO={() => openSO(curJob?.so)}
                      releaseHold={releaseHold} />
      )}
      {view.name === "station" && (
        <StationView job={curJob} from={view.from}
                     back={() => navAfterStation(view.from, view.jobId)}
                     signOff={signOff} raiseNCR={raiseNCR} requestSupport={requestSupport} />
      )}
    </div>
  );
}

/* ---------------------- HEADER (DocWorks-style banner) ---------------------- */
function Header({ stats, view, setView }) {
  const Tab = ({ id, label }) => {
    const active = view.name === id
      || (id === "map" && (view.name === "traveler" || (view.name === "station" && view.from !== "scan")))
      || (id === "sos" && view.name === "so")
      || (id === "scan" && view.name === "station" && view.from === "scan");
    // bw / plan match by direct equality above
    return (
      <button onClick={() => setView({ name: id })}
        style={{ background: active ? "#2E5182" : "#274468", color: "#FFFFFF",
                 border: `1.5px solid ${active ? C.gold : "#40699C"}`,
                 padding: "9px 6px", borderRadius: 6, fontSize: 12.5, fontWeight: 700,
                 flex: "1 1 148px", minWidth: 136,
                 cursor: "pointer", letterSpacing: 0.3, display: "inline-flex", alignItems: "center",
                 justifyContent: "center", gap: 7, whiteSpace: "nowrap" }}>
        {label}
      </button>
    );
  };
  return (
    <div style={{ background: C.navy, color: "#fff", padding: "16px 20px 14px 20px" }}>
      <div style={{ maxWidth: 1500, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <span style={{ fontWeight: 800, display: "inline-flex", alignItems: "baseline" }}>
            <span style={{ fontSize: 19, letterSpacing: 1, color: "#FFFFFF" }}>shop</span>
            <span style={{ fontSize: 25, letterSpacing: 2.5, color: C.gold }}>WORKS</span>
          </span>
          <div style={{ flex: 1 }} />
          <BannerStat label="Active Jobs" val={stats.active} />
          <BannerStat label="QA Holds" val={stats.holds} />
          <BannerStat label="Completed" val={stats.complete} />
        </div>
        <div style={{ borderLeft: "3px solid rgba(255,255,255,0.25)", paddingLeft: 12, margin: "10px 0 12px 0",
                      fontSize: 12.5, color: "rgba(255,255,255,0.75)", lineHeight: 1.4 }}>
          JobBOSS² routing import → Floor Map · Traveler · Station Sign-off · Family Tree | live WIP demo
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
          <Tab id="plan" label="⇪ Planning" />
          <Tab id="kit" label="▦ Kitting" />
          <Tab id="sos" label="≡ Sales Orders" />
          <Tab id="bw" label="▤ Bandwidth" />
          <Tab id="map" label="⌂ Map View" />
          <Tab id="scan" label="▣ Tablet Mode" />
        </div>
        <div style={{ textAlign: "right", marginTop: 6 }}>
          <span style={{ fontFamily: MONO, fontSize: 11.5, color: "rgba(255,255,255,0.55)" }}>v0.3 demo</span>
        </div>
      </div>
    </div>
  );
}
const BannerStat = ({ label, val }) => (
  <span style={{ display: "inline-flex", alignItems: "baseline", gap: 7, padding: "5px 12px",
                 background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.18)", borderRadius: 6 }}>
    <span style={{ fontFamily: MONO, fontSize: 17, fontWeight: 700, color: C.gold }}>{val}</span>
    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.75)" }}>{label}</span>
  </span>
);
const Toast = ({ msg }) => (
  <div style={{ position: "fixed", top: 14, left: "50%", transform: "translateX(-50%)", zIndex: 50,
                background: C.ink, color: "#fff", border: `1px solid ${C.green}`, borderLeft: `4px solid ${C.green}`,
                padding: "10px 18px", borderRadius: 8, fontSize: 13, boxShadow: "0 8px 30px rgba(0,0,0,.35)" }}>
    {msg}
  </div>
);
const Badge = ({ n, title, right }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 11, margin: "18px 0 10px 0" }}>
    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 27, height: 27,
                   background: C.navy, color: "#fff", borderRadius: 5, fontWeight: 800, fontSize: 14 }}>{n}</span>
    <span style={{ fontWeight: 800, fontSize: 13.5, letterSpacing: 1.8, color: C.navy }}>{title}</span>
    <div style={{ flex: 1 }} />
    {right}
  </div>
);

/* ---------------------- FLOOR MAP ---------------------- */
function MapView({ jobs, jobZone, selZone, setSelZone, openTraveler, openSO }) {
  const byZone = {};
  jobs.forEach(j => { if (j.status !== "complete") (byZone[jobZone(j)] ||= []).push(j); });

  const loadState = (z) => {
    if (!z.cap) return null;
    const load = (byZone[z.id] || []).length;
    if (load < z.cap[0]) return "under";
    if (load <= z.cap[1]) return "normal";
    return load - z.cap[1] >= 2 ? "severe" : "over";
  };

  return (
    <div style={{ maxWidth: 1500, margin: "0 auto", padding: "0 18px 46px 18px" }}>
      <Badge n={1} title="SHOP FLOOR — LIVE WIP"
        right={<span style={{ fontSize: 11.5, color: C.dim }}>Tap a room for its queue · tap a job chip to open its traveler</span>} />

      {/* map */}
      <div style={{ position: "relative", background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, padding: 10,
                    boxShadow: "0 2px 12px rgba(31,58,95,.08)" }}>
        <svg viewBox="50 12 1465 1013" style={{ width: "100%", height: "auto", display: "block" }}>
          {/* site ground */}
          <rect x={50} y={12} width={1465} height={1013} fill="#E9EAEC" />
          {/* parking lot */}
          <rect x={270} y={828} width={1160} height={190} fill="#C9CBCE" />
          {[0,1,2,3,4,5,6,7].map(i => (
            <line key={i} x1={360 + i * 95} y1={836} x2={360 + i * 95} y2={1012} stroke="#F2F2F2" strokeWidth={4} />
          ))}
          {[1082, 1146].map((x, i) => (
            <g key={i}>
              <rect x={x} y={838} width={56} height={172} fill="rgba(44,123,209,0.10)" stroke="#2C7BD1" strokeWidth={3} />
              <text x={x + 28} y={935} fontSize={26} textAnchor="middle" fill="#2C7BD1">♿</text>
            </g>
          ))}
          {/* landscaping */}
          {[[300,806,180,20],[560,806,150,20],[770,806,120,20],[130,806,150,20]].map((b, i) => (
            <rect key={i} x={b[0]} y={b[1]} width={b[2]} height={b[3]} rx={10} fill="#9CB87B" />
          ))}
          <circle cx={1252} cy={848} r={28} fill="#8FAF6C" />
          <circle cx={1448} cy={852} r={18} fill="#8FAF6C" />
          <circle cx={1462} cy={906} r={15} fill="#9CB87B" />
          {/* left chamfer / ramp */}
          <polygon points="62,66 118,30 118,795 62,750" fill="#CFD1D4" stroke="#3A3F45" strokeWidth={2} />
          {/* building shell — gray interior reads as corridors between rooms */}
          <rect x={115} y={22} width={1390} height={780} fill="#E3E4E6" stroke="#26282B" strokeWidth={7} />

          {/* rooms */}
          {ZONES.map(z => {
            const isSel = selZone === z.id;
            const stroke = isSel ? C.amber : "#3A3F45";
            const sw = isSel ? 4 : z.dashed ? 1.8 : 2.6;
            const dash = z.dashed ? "8 5" : "none";
            const clickable = !z.container && z.id !== "HALL";
            return (
              <g key={z.id}
                 onClick={clickable ? () => setSelZone(isSel ? null : z.id) : undefined}
                 style={{ cursor: clickable ? "pointer" : "default" }}
                 pointerEvents={clickable ? "auto" : "none"}>
                {z.poly
                  ? <polygon points={z.poly} fill={z.fill} stroke={stroke} strokeWidth={sw} strokeDasharray={dash} />
                  : <rect x={z.x} y={z.y} width={z.w} height={z.h} rx={2} fill={z.fill}
                          stroke={stroke} strokeWidth={sw} strokeDasharray={dash} />}
              </g>
            );
          })}

          {/* equipment / furniture */}
          {Object.entries(EQUIP).flatMap(([zid, blocks]) =>
            blocks.map((b, i) => (
              <rect key={zid + i} x={b[0]} y={b[1]} width={b[2]} height={b[3]} rx={2.5}
                fill="#B9BDC2" stroke="#7A7F86" strokeWidth={1} pointerEvents="none" />
            ))
          )}
          {/* dock truck */}
          <g pointerEvents="none">
            <rect x={132} y={100} width={112} height={52} rx={5} fill="#FFFFFF" stroke="#7A7F86" strokeWidth={1.6} />
            <rect x={248} y={110} width={30} height={34} rx={4} fill="#DADDE0" stroke="#7A7F86" strokeWidth={1.6} />
          </g>

          {/* capacity overlays: blue under · green nominal · orange over · red severe */}
          {ZONES.map(z => {
            const st = loadState(z);
            if (!st) return null;
            const fill = st === "severe" ? "rgba(192,64,46,0.46)"
              : st === "over" ? "rgba(224,138,49,0.42)"
              : st === "normal" ? "rgba(47,143,91,0.20)"
              : "rgba(44,109,180,0.28)";
            return (
              <rect key={"ov" + z.id} x={z.x + 1.5} y={z.y + 1.5} width={z.w - 3} height={z.h - 3} rx={2}
                fill={fill} pointerEvents="none">
                {st === "severe" && <animate attributeName="opacity" values="1;0.5;1" dur="2s" repeatCount="indefinite" />}
              </rect>
            );
          })}

          {/* room labels — halo keeps them readable over overlays and equipment */}
          {ZONES.map(z => {
            if (!z.label) return null;
            const lx = z.poly ? z.lx : z.center ? z.x + z.w / 2 : z.x + 10;
            const ly = z.ly ?? (z.poly ? z.ly : z.y + 24);
            const fs = z.small ? 11 : 13.5;
            const common = { fontSize: fs, fill: "#33383E", fontFamily: SANS, fontWeight: 800,
                             textAnchor: z.center ? "middle" : "start", letterSpacing: 0.5,
                             stroke: "#FFFFFF", strokeWidth: 4, paintOrder: "stroke", strokeLinejoin: "round" };
            return (
              <g key={"lb" + z.id} pointerEvents="none">
                <text x={lx} y={ly} {...common}>{z.label}</text>
                {z.label2 && <text x={lx} y={ly + (z.small ? 13 : 16)} {...common}>{z.label2}</text>}
              </g>
            );
          })}

          {/* load pills */}
          {ZONES.map(z => {
            if (!z.cap) return null;
            const load = (byZone[z.id] || []).length;
            const st = loadState(z);
            const col = st === "severe" ? C.red : st === "over" ? "#E08A31" : st === "normal" ? C.green : C.blue;
            return (
              <g key={"pill" + z.id} pointerEvents="none">
                <rect x={z.x + 6} y={z.y + z.h - 27} width={load > z.cap[1] ? 96 : 62} height={20} rx={10}
                  fill="#22262B" stroke={col} strokeWidth={1.5} />
                <text x={z.x + 6 + (load > z.cap[1] ? 48 : 31)} y={z.y + z.h - 13} fontSize={11} fontFamily={MONO} fontWeight={700}
                  fill="#FFFFFF" textAnchor="middle">
                  {load} / {z.cap[1]} WIP{load > z.cap[1] ? ` · ${Math.round((load / z.cap[1]) * 100)}%` : ""}
                </text>
              </g>
            );
          })}

          {/* job tokens */}
          {Object.entries(byZone).map(([zid, js]) => {
            const z = ZONES.find(x => x.id === zid);
            if (!z || !z.anchor) return null;
            return js.map((j, i) => {
              const p = PARTS[j.part];
              const y = z.anchor[1] + i * 25 - ((js.length - 1) * 12.5);
              return (
                <g key={j.id} pointerEvents="none">
                  <rect x={z.anchor[0] - 50} y={y - 11} width={100} height={21} rx={10.5}
                    fill={j.status === "hold" ? C.red : "#14243A"} stroke={j.status === "hold" ? "#7E281A" : p.color} strokeWidth={1.8} />
                  <circle cx={z.anchor[0] - 38} cy={y - 0.5} r={3.8} fill={j.status === "hold" ? "#fff" : "#5BD98F"}>
                    {j.status !== "hold" && <animate attributeName="opacity" values="1;0.3;1" dur="1.6s" repeatCount="indefinite" />}
                  </circle>
                  <text x={z.anchor[0] + 7} y={y + 3.5} fontSize={10} fontFamily={MONO} fontWeight={700}
                    fill="#fff" textAnchor="middle">{j.so}·{j.part.split("-")[0]}</text>
                </g>
              );
            });
          })}

          {/* front entrance */}
          <rect x={1305} y={798} width={122} height={36} fill="#F1F1F2" stroke="#3A3F45" strokeWidth={2} />
          <text x={1366} y={874} fontSize={13} fontFamily={SANS} fontWeight={800} fill="#4A4F56" textAnchor="middle">FRONT</text>
          <text x={1366} y={890} fontSize={13} fontFamily={SANS} fontWeight={800} fill="#4A4F56" textAnchor="middle">ENTRANCE</text>
        </svg>

        {/* department preview panel */}
        {selZone && (() => {
          const z = ZONES.find(x => x.id === selZone);
          const zj = byZone[selZone] || [];
          const st = loadState(z);
          const opsIn = zj.filter(j => j.operator);
          return (
            <div style={{ position: "fixed", left: "50%", transform: "translateX(-50%)", bottom: 12, zIndex: 40,
                          width: "min(620px, 94vw)", maxHeight: "62vh", overflowY: "auto",
                          background: C.panel, border: `1px solid ${C.line}`, borderTop: `4px solid ${C.navy}`,
                          borderRadius: 12, padding: "14px 16px", boxShadow: "0 -6px 40px rgba(31,58,95,.3)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                <span style={{ fontWeight: 800, fontSize: 16, color: C.navy, letterSpacing: 0.5 }}>
                  {[z?.label, z?.label2].filter(Boolean).join(" ")}
                </span>
                <button onClick={() => setSelZone(null)} style={{ background: "none", border: "none", color: C.dim, cursor: "pointer", fontSize: 17 }}>✕</button>
              </div>
              {z?.cap && (
                <div style={{ fontSize: 12, marginBottom: 10, fontWeight: 700,
                              color: st === "severe" ? C.red : st === "over" ? "#B4691A" : st === "under" ? C.blue : C.green }}>
                  {zj.length} active traveler{zj.length === 1 ? "" : "s"} / normal band {z.cap[0]}–{z.cap[1]} — {(st === "severe" || st === "over")
                    ? `OVER CAPACITY — ${Math.round((zj.length / z.cap[1]) * 100)}%`
                    : st === "under" ? "capacity available" : "at nominal capacity"}
                </div>
              )}
              <div style={{ fontSize: 10.5, letterSpacing: 1.2, color: C.dim, fontWeight: 800, marginBottom: 6 }}>
                OPERATORS LOGGED IN ({opsIn.length})
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                {opsIn.length === 0 && <span style={{ fontSize: 12, color: C.dim }}>No operators logged in at this work center.</span>}
                {opsIn.map(j => (
                  <span key={j.id} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#EAF1F9",
                                            border: "1px solid #C3D4E8", borderRadius: 14, padding: "4px 11px", fontSize: 11.5 }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: C.green }} />
                    <b>{j.operator}</b><span style={{ color: C.dim, fontFamily: MONO }}>→ {j.id}</span>
                  </span>
                ))}
              </div>
              <div style={{ fontSize: 10.5, letterSpacing: 1.2, color: C.dim, fontWeight: 800, marginBottom: 6 }}>
                TRAVELERS AT THIS STAGE ({zj.length})
              </div>
              {zj.length === 0 && <div style={{ fontSize: 12.5, color: C.dim }}>No active travelers at this work center.</div>}
              {zj.map(j => {
                const p = PARTS[j.part]; const op = p.ops[j.cur];
                return (
                  <button key={j.id} onClick={() => openSO(j.so)}
                    style={{ display: "block", width: "100%", textAlign: "left", background: C.panel2, border: `1px solid ${C.line}`,
                             borderLeft: `4px solid ${j.status === "hold" ? C.red : p.color}`,
                             borderRadius: 8, padding: "9px 11px", marginBottom: 7, color: C.text, cursor: "pointer" }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontFamily: MONO, fontWeight: 800, fontSize: 13.5, color: C.navy }}>SO {j.so}</span>
                      <span style={{ fontFamily: MONO, fontSize: 12.5, color: p.color, fontWeight: 700 }}>{j.part}</span>
                      <span style={{ fontFamily: MONO, fontSize: 11.5, color: C.dim }}>{j.id}</span>
                      {j.status === "hold" && <span style={{ fontSize: 10.5, fontWeight: 800, color: C.red }}>■ ON HOLD</span>}
                      {j.status !== "hold" && op.qa && <span style={{ fontSize: 10.5, fontWeight: 800, color: C.amber }}>★ QA HOLD PT</span>}
                    </div>
                    <div style={{ fontSize: 11.5, color: C.dim, marginTop: 2 }}>
                      OP {op.op} · {op.title} · Qty {j.qty} · Due {j.due} · {j.operator ? <>Operator: <b style={{ color: C.text }}>{j.operator}</b></> : "In queue — unattended"}
                    </div>
                    <div style={{ fontSize: 10.5, color: "#8A93A0", marginTop: 2 }}>Tap to open SO {j.so} family tree →</div>
                  </button>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* legend */}
      <div style={{ display: "flex", gap: 18, alignItems: "center", marginTop: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, color: C.dim, letterSpacing: 1, fontWeight: 700 }}>WORK CENTER LOAD</span>
        <LegendSwatch color="rgba(44,109,180,0.42)" label="Under capacity" />
        <LegendSwatch color="rgba(47,143,91,0.35)" label="At nominal capacity" />
        <LegendSwatch color="rgba(224,138,49,0.55)" label="Over capacity (>100%)" />
        <LegendSwatch color="rgba(192,64,46,0.6)" label="Severely over — will slip" />
        <span style={{ fontSize: 11, color: C.dim, marginLeft: "auto" }}>WIP pill = active jobs / normal max · location inferred from routing</span>
      </div>

      {/* sales order strip */}
      <Badge n={2} title="OPEN SALES ORDERS"
        right={<span style={{ fontFamily: MONO, fontSize: 12, color: C.dim }}>{SOS.length} open · tap for family tree</span>} />
      <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 6 }}>
        {SOS.map(s => {
          const p = PARTS[s.part];
          const sum = soSummary(s.so, jobs);
          return (
            <button key={s.so} onClick={() => openSO(s.so)}
              style={{ flexShrink: 0, width: 244, textAlign: "left", background: C.panel, border: `1px solid ${C.line}`,
                       borderLeft: `4px solid ${sum.holds ? C.red : sum.released ? p.color : "#B8C0CC"}`,
                       borderRadius: 8, padding: "9px 11px", cursor: "pointer", color: C.text,
                       boxShadow: "0 1px 6px rgba(31,58,95,.07)", opacity: sum.released ? 1 : 0.66 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontFamily: MONO, fontWeight: 800, fontSize: 14, color: C.navy }}>SO {s.so}</span>
                <span style={{ fontFamily: MONO, fontSize: 11, color: C.dim }}>{sum.released ? `${sum.pct}%` : "—"}</span>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.config}</div>
              <div style={{ fontFamily: MONO, fontSize: 11.5, color: p.color, marginTop: 1 }}>{s.part} <span style={{ color: C.dim }}>· Qty {s.qty} · Due {s.due}</span></div>
              <div style={{ fontSize: 11, marginTop: 3, color: sum.holds ? C.red : sum.released ? C.dim : "#8A93A0", fontWeight: sum.holds ? 700 : 500 }}>
                {sum.released
                  ? <>{sum.active} traveler{sum.active === 1 ? "" : "s"} on floor{sum.holds ? ` · ${sum.holds} ON HOLD` : ""}{sum.done ? ` · ${sum.done} complete` : ""}</>
                  : "Scheduled — not released"}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
const LegendSwatch = ({ color, border, label }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, color: C.text }}>
    <span style={{ width: 16, height: 12, borderRadius: 3, background: color,
                   border: border ? `1.5px solid ${C.dim}` : "1px solid rgba(0,0,0,.25)" }} />
    {label}
  </span>
);

/* ---------------------- TRAVELER ---------------------- */
function TravelerView({ job, back, openStation, openSO, releaseHold }) {
  const [showCard, setShowCard] = useState(false);
  if (!job) return null;
  const p = PARTS[job.part];
  const pct = Math.round((job.cur / p.ops.length) * 100);
  const curOp = p.ops[job.cur];

  return (
    <div style={{ maxWidth: 1060, margin: "0 auto", padding: "18px 18px 60px 18px" }}>
      {showCard && <KittingCardModal job={job} onClose={() => setShowCard(false)} />}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
        <button onClick={back} style={btnGhost}>← Floor Map</button>
        <button onClick={openSO} style={btnGhost}>SO {job.so} · Family Tree</button>
        <button onClick={() => setShowCard(true)} style={btnGhost}>⌸ Kitting Card (QR)</button>
        <div style={{ flex: 1 }} />
        {job.status === "hold" && (
          <>
            <span style={{ color: C.red, fontSize: 12.5, fontWeight: 700 }}>■ ON HOLD — {job.holdReason}</span>
            <button onClick={() => releaseHold(job.id)} style={{ ...btnGhost, borderColor: C.red, color: C.red }}>Supervisor: Release Hold</button>
          </>
        )}
        {job.status === "active" && (
          <button onClick={openStation} style={btnPrimary}>Open at Station →</button>
        )}
      </div>

      {/* paper traveler */}
      <div style={{ background: C.paper, color: C.ink, borderRadius: 10, overflow: "hidden", boxShadow: "0 6px 30px rgba(0,0,0,.45)" }}>
        <div style={{ background: C.navy, color: "#fff", padding: "12px 18px", display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap" }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>Job Traveler — Digital Copy</span>
          <span style={{ fontSize: 11, opacity: 0.75 }}>Island Components Group Inc. — A G.W. Lisk Company</span>
          <div style={{ flex: 1 }} />
          <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 16 }}>{job.part}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", borderBottom: "2px solid " + C.navy }}>
          {[["PART NO.", job.part], ["DESCRIPTION", p.desc], ["REV", p.rev], ["JOB NUMBER", job.id],
            ["SALES ORDER", `SO ${job.so}`], ["QTY", String(job.qty)], ["DUE", job.due], ["STATUS", job.status === "complete" ? "COMPLETE" : job.status === "hold" ? "ON HOLD" : `IN PROCESS — OP ${curOp?.op}`]]
            .map(([k, v]) => (
            <div key={k} style={{ padding: "7px 12px", borderRight: "1px solid #D8D4C8", borderBottom: "1px solid #D8D4C8" }}>
              <div style={{ fontSize: 9.5, color: "#7A7568", letterSpacing: 1 }}>{k}</div>
              <div style={{ fontFamily: MONO, fontSize: 12.5, fontWeight: 600 }}>{v}</div>
            </div>
          ))}
        </div>

        {/* progress */}
        <div style={{ padding: "10px 18px 0 18px", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1, height: 8, background: "#E2DED2", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ width: pct + "%", height: "100%", background: job.status === "hold" ? C.red : C.green, transition: "width .4s" }} />
          </div>
          <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700 }}>{pct}%</span>
        </div>

        {/* routing table */}
        <div style={{ padding: "12px 18px 18px 18px", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: C.navy, color: "#fff" }}>
                {["Step", "Dept", "Work Cntr", "Operation", "Qty A / R", "Complete By / Date", "QA"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "7px 10px", fontSize: 10.5, letterSpacing: 0.5, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {p.ops.map((op, i) => {
                const done = i < job.cur;
                const isCur = i === job.cur && job.status !== "complete";
                const so = job.signoffs.find(s => s.op === op.op);
                return (
                  <tr key={op.op} style={{
                    background: isCur ? "#FBEED3" : op.qa && !done ? "#FBF6E8" : done ? "#EFF3EC" : "transparent",
                    borderBottom: "1px solid #DDD8CA",
                    outline: isCur ? `2px solid ${C.amber}` : "none", outlineOffset: -2 }}>
                    <td style={{ padding: "8px 10px", fontFamily: MONO, fontWeight: 700, whiteSpace: "nowrap", color: op.qa ? "#8A6A16" : C.ink }}>
                      {op.op}{op.qa ? " ★" : ""}
                    </td>
                    <td style={{ padding: "8px 10px", fontFamily: MONO }}>{op.dept}</td>
                    <td style={{ padding: "8px 10px", fontFamily: MONO }}>{op.wc}</td>
                    <td style={{ padding: "8px 10px" }}>
                      <b>{op.title}.</b> <span style={{ color: "#5A5648" }}>{op.steps[0]}</span>
                      {isCur && <span style={{ marginLeft: 6, fontSize: 10.5, fontWeight: 700, color: "#8A6A16" }}>◄ CURRENT</span>}
                    </td>
                    <td style={{ padding: "8px 10px", fontFamily: MONO, whiteSpace: "nowrap" }}>
                      {so && so.qtyA != null ? `${so.qtyA} / ${so.qtyR}` : done ? "— / —" : ""}
                    </td>
                    <td style={{ padding: "8px 10px", fontFamily: MONO, whiteSpace: "nowrap", fontSize: 11 }}>
                      {so ? <>{so.operator} · {so.ts}</> : ""}
                    </td>
                    <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>
                      {done ? <span style={{ color: C.green, fontWeight: 700 }}>✓{so?.qaStamp ? ` ${so.qaStamp}` : ""}</span>
                            : op.qa ? <span style={{ color: "#8A6A16", fontSize: 10.5, fontWeight: 700 }}>HOLD PT</span> : ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{ fontSize: 10, color: "#8A8578", marginTop: 10 }}>
            ★ QA hold points — do not proceed beyond a hold point without required acceptance and sign-off. Detailed method per ESP-*. UNCONTROLLED WHEN PRINTED · AS9100 CONTROLLED DOCUMENT (DEMO)
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------- STATION TABLET: SCAN ---------------------- */
function ScanView({ jobs, kits, openStation }) {
  const [showList, setShowList] = useState(false);
  const [cam, setCam] = useState("idle"); // idle | starting | live | denied | unsupported | error
  const [scanMsg, setScanMsg] = useState(null);
  const [foundKit, setFoundKit] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const open = jobs.filter(j => j.status !== "complete");

  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
  }, []);

  const stopCamera = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCam("idle"); setScanMsg(null);
  };

  const tick = () => {
    const v = videoRef.current, c = canvasRef.current;
    if (v && c && v.readyState >= 2 && window.jsQR && v.videoWidth) {
      const w = Math.min(v.videoWidth, 640);
      const h = Math.round((v.videoHeight / v.videoWidth) * w);
      c.width = w; c.height = h;
      const ctx = c.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(v, 0, 0, w, h);
      const code = window.jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: "dontInvert" });
      if (code && code.data) {
        const raw = code.data.trim();
        const m = raw.match(/^(?:SW:|IMES:)?(J-\d{3,5})$/i);
        const j = m && jobs.find(x => x.id.toUpperCase() === m[1].toUpperCase());
        if (j && j.status !== "complete") {
          if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
          openStation(j.id);
          return;
        }
        const km = raw.match(/^SW:KIT:(.+)$/i);
        if (km) {
          const kt = (kits || []).find(x => x.id.toUpperCase() === km[1].toUpperCase());
          if (kt) {
            if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            setCam("idle"); setFoundKit(kt);
            return;
          }
          setScanMsg(`Unknown kit: ${km[1]}`);
        } else {
          setScanMsg(j ? `${j.id} is complete — nothing to run` : `Unrecognized code: "${raw.slice(0, 28)}"`);
        }
      }
    }
    rafRef.current = requestAnimationFrame(tick);
  };

  const startCamera = async () => {
    setCam("starting"); setScanMsg(null);
    try {
      await loadScript(JSQR_SRC);
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { setCam("unsupported"); return; }
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      streamRef.current = stream;
      const v = videoRef.current;
      v.srcObject = stream;
      await v.play();
      setCam("live");
      rafRef.current = requestAnimationFrame(tick);
    } catch (e) {
      setCam(e && (e.name === "NotAllowedError" || e.name === "SecurityError" || e.name === "NotFoundError") ? "denied" : "error");
    }
  };

  const bracket = (pos) => ({ position: "absolute", width: 30, height: 30, borderColor: "#FFFFFF",
    borderStyle: "solid", borderWidth: 0, ...pos });

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "16px 14px 60px 14px" }}>
      {/* tablet camera frame */}
      <div style={{ background: "#0B1119", borderRadius: 18, overflow: "hidden", boxShadow: "0 8px 36px rgba(10,20,35,.45)", border: "1px solid #1E2A3A" }}>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 16px 0 16px", color: "#7C8DA3", fontSize: 11, fontFamily: MONO }}>
          <span>ᯤ ▮▮▮▯</span>
          <span>ROTOR DEPARTMENT — STATION 3</span>
        </div>
        <div style={{ textAlign: "center", color: "#fff", padding: "8px 16px 0 16px" }}>
          <div style={{ fontWeight: 800, fontSize: 21 }}>Scan Job Traveler QR</div>
          <div style={{ fontSize: 12, color: "#8FA2B8", marginTop: 2 }}>
            shop<span style={{ color: C.gold, fontWeight: 800 }}>WORKS</span> · {cam === "live" ? "searching for QR…" : "point camera at the kitting card"}
          </div>
        </div>

        {cam === "live" || cam === "starting" ? (
          <div style={{ position: "relative", margin: "10px 12px 0 12px" }}>
            <video ref={videoRef} playsInline muted
                   style={{ width: "100%", display: "block", maxHeight: 340, objectFit: "cover",
                            background: "#000", borderRadius: 10 }} />
            <div style={bracket({ top: 12, left: 12, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 4 })} />
            <div style={bracket({ top: 12, right: 12, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 4 })} />
            <div style={bracket({ bottom: 12, left: 12, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 4 })} />
            <div style={bracket({ bottom: 12, right: 12, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 4 })} />
            {cam === "starting" && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                            color: "#9FB2C8", fontSize: 13, fontWeight: 700 }}>Starting camera…</div>
            )}
            {scanMsg && (
              <div style={{ position: "absolute", left: 12, right: 12, bottom: 12, background: "rgba(11,17,25,.85)",
                            color: "#F0C97A", fontSize: 11.5, fontFamily: MONO, padding: "6px 10px", borderRadius: 7, textAlign: "center" }}>
                {scanMsg}
              </div>
            )}
          </div>
        ) : (
          <svg viewBox="0 0 320 290" style={{ width: "100%", display: "block" }}>
            <rect x={0} y={0} width={320} height={290} fill="#0B1119" />
            <g transform="rotate(-8 160 165)">
              <rect x={62} y={112} width={196} height={118} rx={5} fill="#E9E6DC" />
              <rect x={62} y={112} width={196} height={24} rx={5} fill="#1F3A5F" />
              <text x={74} y={129} fontSize={11} fill="#fff" fontFamily={SANS} fontWeight={800}>KITTING CARD · JOB TRAVELER</text>
              <text x={74} y={156} fontSize={10} fontFamily={MONO} fontWeight={700} fill="#33383E">SO 41__ · ___-____</text>
              {[168, 180, 192].map(y => <rect key={y} x={74} y={y} width={100} height={5} rx={2.5} fill="#B9B4A4" />)}
              <rect x={196} y={148} width={52} height={52} fill="#fff" />
              {[[200,152],[232,152],[200,184]].map(([x,y],i)=>(
                <g key={i}><rect x={x} y={y} width={16} height={16} fill="#14181D"/><rect x={x+4} y={y+4} width={8} height={8} fill="#fff"/><rect x={x+6} y={y+6} width={4} height={4} fill="#14181D"/></g>
              ))}
              {[[222,154],[226,162],[220,170],[230,174],[238,178],[224,182],[234,188],[240,170]].map(([x,y],i)=>(
                <rect key={"m"+i} x={x} y={y} width={4} height={4} fill="#14181D" />
              ))}
            </g>
            {[[30,26,1,1],[290,26,-1,1],[30,264,1,-1],[290,264,-1,-1]].map(([x,y,dx,dy],i)=>(
              <path key={i} d={`M ${x} ${y+dy*26} L ${x} ${y} L ${x+dx*26} ${y}`} stroke="#FFFFFF" strokeWidth={4.5} fill="none" strokeLinecap="round" />
            ))}
            <circle cx={160} cy={145} r={24} stroke="#FFFFFF" strokeWidth={2} fill="none" opacity={0.85} />
            <path d="M160 129 v10 M160 151 v10 M144 145 h10 M166 145 h10" stroke="#FFFFFF" strokeWidth={2} opacity={0.85} />
            <rect x={34} y={40} width={252} height={3} rx={1.5} fill="#4DA3FF" opacity={0.9}>
              <animate attributeName="y" values="40;250;40" dur="3s" repeatCount="indefinite" />
            </rect>
          </svg>
        )}

        <canvas ref={canvasRef} style={{ display: "none" }} />

        <div style={{ padding: "10px 14px 14px 14px", display: "flex", gap: 8 }}>
          {cam === "live" || cam === "starting" ? (
            <button onClick={stopCamera}
              style={{ flex: 1, padding: "12px 0", borderRadius: 10, border: "1px solid #6E3B33",
                       background: "#3A1F1B", color: "#F0A08F", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>
              ■ Stop Camera
            </button>
          ) : (
            <>
              <button onClick={startCamera}
                style={{ flex: 1.4, padding: "12px 0", borderRadius: 10, border: "none",
                         background: "#2C6DB4", color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>
                ▶ Start Camera Scan
              </button>
              <button title="Camera not wired in demo"
                style={{ flex: 1, padding: "12px 0", borderRadius: 10, border: "1px solid #2E4258",
                         background: "#152232", color: "#9FB2C8", fontWeight: 800, fontSize: 14, cursor: "not-allowed" }}>
                Manual Entry
              </button>
            </>
          )}
        </div>
        {(cam === "denied" || cam === "unsupported" || cam === "error") && (
          <div style={{ margin: "0 14px 14px 14px", background: "#2A2314", border: "1px solid #6E5B22",
                        borderRadius: 9, padding: "9px 12px", fontSize: 11.5, color: "#E8C368", lineHeight: 1.55 }}>
            Camera unavailable here — {cam === "denied" ? "permission was blocked (embedded previews sandbox the camera)" :
              cam === "unsupported" ? "this browser context doesn't expose the camera API" : "it failed to start"}.
            Host this app over <b>HTTPS or localhost</b> (e.g. Vite on the shop network) and the live scan works on the
            tablet. Use the demo pull below in the meantime.
          </div>
        )}
      </div>

      <button onClick={() => setShowList(v => !v)}
        style={{ ...btnPrimary, width: "100%", marginTop: 12, padding: "14px 0", fontSize: 14, background: C.navy }}>
        ▣ Demo: Pull an Open Traveler {showList ? "▴" : "▾"}
      </button>

      {showList && (
        <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
          {open.map(j => {
            const p = PARTS[j.part]; const op = p.ops[j.cur];
            return (
              <button key={j.id} onClick={() => openStation(j.id)}
                style={{ display: "flex", alignItems: "center", gap: 12, textAlign: "left", background: C.panel,
                         border: `1px solid ${C.line}`, borderLeft: `4px solid ${j.status === "hold" ? C.red : p.color}`,
                         borderRadius: 9, padding: "8px 12px", cursor: "pointer", color: C.text }}>
                <div style={{ flexShrink: 0 }}><QRCodeSVG value={`SW:${j.id}`} size={44} /></div>
                <div style={{ minWidth: 0 }}>
                  <span style={{ fontFamily: MONO, fontWeight: 800, fontSize: 13.5, color: C.navy }}>SO {j.so}</span>
                  <span style={{ fontFamily: MONO, fontSize: 12.5, color: p.color, fontWeight: 700, marginLeft: 8 }}>{j.part}</span>
                  <span style={{ fontFamily: MONO, fontSize: 11.5, color: C.dim, marginLeft: 8 }}>{j.id}</span>
                  <div style={{ fontSize: 11.5, color: C.dim, marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {j.status === "hold" ? "■ ON HOLD — scan opens read-only" : <>OP {op.op}{op.qa ? " ★" : ""} · {op.title}</>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
      <div style={{ fontSize: 11, color: C.dim, marginTop: 12, lineHeight: 1.55 }}>
        These QR codes are real — traveler cards encode <span style={{ fontFamily: MONO }}>SW:J-####</span> and open
        the station; issued kit cards encode <span style={{ fontFamily: MONO }}>SW:KIT:####-##</span> and open the kit
        reference. Scan a card from another screen or printout with a camera-enabled deployment.
      </div>

      {foundKit && <KitCardModal kit={foundKit} onClose={() => setFoundKit(null)} />}
    </div>
  );
}

/* ---------------------- OP FIGURE (work-instruction placeholder) ---------------------- */
const PPE_BY_CAT = {
  machine: ["🥽 Eye protection", "🧤 Gloves", "🦺 Hi-vis"],
  assemble: ["🥽 Eye protection", "🧤 Gloves"],
  cure: ["🧤 Heat gloves", "🥽 Eye protection"],
  test: ["⚡ ESD strap"],
  inspect: ["🧤 Clean gloves"],
  kit: ["🧤 Clean gloves"],
  wind: ["🥽 Eye protection", "🧤 Gloves"],
  move: ["🦺 Hi-vis", "🥾 Safety shoes"],
};
function opCategory(op) {
  const t = op.title.toLowerCase();
  if (/grind|machin/.test(t) || op.wc === "MACHINE") return "machine";
  if (/cure|impregn|vpi/.test(t) || op.wc === "CURE") return "cure";
  if (op.wc === "KIT") return "kit";
  if (op.wc === "INSPECT") return "inspect";
  if (op.wc === "TEST") return "test";
  if (op.wc === "WIND") return "wind";
  if (op.wc === "MOVE") return "move";
  return "assemble";
}
function OpFigure({ op }) {
  const cat = opCategory(op);
  const S = { stroke: "#59636F", strokeWidth: 3, fill: "none", strokeLinecap: "round", strokeLinejoin: "round" };
  const art = {
    kit: (<g {...S}><rect x={28} y={44} width={72} height={52} rx={3} /><path d="M28 60 h72 M64 44 v52" />
      <rect x={128} y={32} width={62} height={74} rx={4} /><path d="M139 50 h34 M139 64 h34 M139 78 h20" />
      <path d="M158 76 l7 9 l14 -18" stroke="#2F8F5B" /></g>),
    inspect: (<g {...S}><path d="M28 98 h164" /><rect x={44} y={76} width={62} height={22} rx={3} /><path d="M75 76 v-30" />
      <circle cx={75} cy={36} r={16} /><path d="M75 36 l9 -9" />
      <text x={128} y={52} fontSize={16} fontFamily={MONO} fill="#59636F" stroke="none" fontWeight={700}>0.001</text>
      <path d="M120 72 h64" strokeDasharray="4 4" /></g>),
    machine: (<g {...S}><circle cx={80} cy={50} r={28} /><circle cx={80} cy={50} r={6} />
      <rect x={40} y={88} width={124} height={14} rx={3} />
      <path d="M104 66 l14 14 M112 60 l16 12 M96 72 l10 16" stroke="#B4831B" /></g>),
    assemble: (<g {...S}><rect x={32} y={44} width={46} height={46} rx={4} /><rect x={142} y={44} width={46} height={46} rx={4} />
      <path d="M88 67 h36 M114 57 l12 10 l-12 10" /><circle cx={55} cy={67} r={9} /><path d="M49 61 l12 12 M61 61 l-12 12" /></g>),
    test: (<g {...S}><rect x={42} y={28} width={136} height={58} rx={6} />
      <rect x={54} y={38} width={112} height={26} rx={3} fill="#EAF1E8" stroke="#C9D8C4" />
      <text x={110} y={57} fontSize={15} fontFamily={MONO} textAnchor="middle" fill="#2F6B4A" stroke="none" fontWeight={700}>12.48 mΩ</text>
      <path d="M70 86 v16 M150 86 v16" /><circle cx={70} cy={106} r={4.5} fill="#C0402E" stroke="none" /><circle cx={150} cy={106} r={4.5} fill="#22262B" stroke="none" /></g>),
    cure: (<g {...S}><rect x={36} y={28} width={92} height={78} rx={6} /><rect x={48} y={44} width={68} height={48} rx={3} />
      <path d="M64 78 q7 -9 0 -16 M82 78 q7 -9 0 -16 M100 78 q7 -9 0 -16" stroke="#B4831B" />
      <path d="M146 96 l16 -26 l12 12 l20 -32" stroke="#2C6DB4" /><path d="M146 102 h50" /></g>),
    wind: (<g {...S}><circle cx={82} cy={62} r={34} /><circle cx={82} cy={62} r={12} />
      <path d="M82 28 v-8 M82 96 v8 M48 62 h-8 M116 62 h8" />
      <path d="M142 42 q22 9 0 18 q22 9 0 18" stroke="#B4831B" /></g>),
    move: (<g {...S}><path d="M58 55 l52 -23 l52 23 v42 l-52 23 l-52 -23 z" /><path d="M58 55 l52 23 l52 -23 M110 78 v42" />
      <rect x={124} y={58} width={28} height={15} rx={2} /></g>),
  }[cat];
  return (
    <div style={{ flex: 1, minWidth: 0, border: "1px solid #D8D2C2", borderRadius: 8, overflow: "hidden", background: "#FDFCF8" }}>
      <svg viewBox="0 0 220 120" style={{ width: "100%", display: "block", maxHeight: 150 }}>{art}</svg>
      <div style={{ background: "#F1EDE0", borderTop: "1px dashed #C9C0A6", padding: "5px 10px", textAlign: "center" }}>
        <div style={{ fontSize: 9.5, fontWeight: 800, color: "#3C424A", letterSpacing: 0.4 }}>FIGURE {op.op}-1 — {op.title.toUpperCase()}</div>
        <div style={{ fontSize: 8, fontWeight: 700, color: "#B4831B", letterSpacing: 0.5 }}>PLACEHOLDER RENDERING — REPLACE WITH PROCESS PHOTO AT RELEASE</div>
      </div>
    </div>
  );
}

/* ---------------------- OPERATOR STATION (full screen) ---------------------- */
function StationView({ job, from, back, signOff, raiseNCR, requestSupport }) {
  const [disp, setDisp] = useState(null); // 'pass' | 'fail' | 'split'
  const [qtyA, setQtyA] = useState(job ? job.qty : 0);
  const [qtyR, setQtyR] = useState(0);
  const [operator, setOperator] = useState("");
  const [inspector, setInspector] = useState("");
  const [stamped, setStamped] = useState(false);
  const [note, setNote] = useState("");
  const [panel, setPanel] = useState(null); // 'nc' | 'support'
  const [reason, setReason] = useState("");
  const [photos, setPhotos] = useState([]);   // traveler-learning captures
  const [ncPhotos, setNcPhotos] = useState(0);
  const [teams, setTeams] = useState([]);
  const photoRef = useRef(null);
  const photoMode = useRef("learn");
  const onPhotos = (files) => {
    if (!files || !files.length) return;
    if (photoMode.current === "nc") { setNcPhotos(n => n + files.length); return; }
    const add = Array.from(files).slice(0, 6).map(f => ({ url: URL.createObjectURL(f), name: f.name }));
    setPhotos(pv => [...pv, ...add].slice(0, 6));
  };
  const takePhoto = (mode) => { photoMode.current = mode; photoRef.current && photoRef.current.click(); };
  if (!job) return null;
  const p = PARTS[job.part];
  const op = p.ops[job.cur];
  if (!op) return null;
  const pct = Math.round((job.cur / p.ops.length) * 100);
  const zone = ZONES.find(z => z.id === op.zone);
  const ppe = PPE_BY_CAT[opCategory(op)] || [];

  const effA = disp === "pass" ? job.qty : disp === "fail" ? 0 : qtyA;
  const effR = disp === "pass" ? 0 : disp === "fail" ? job.qty : qtyR;
  const splitOk = disp !== "split" || effA + effR === job.qty;
  const noteOk = effR === 0 || note.trim().length >= 4;
  const canSign = !!disp && splitOk && noteOk && operator.trim().length >= 2 &&
    (!op.qa || (inspector.trim().length >= 2 && stamped)) && job.status === "active";

  const segBtn = (key, label, color) => (
    <button key={key} onClick={() => setDisp(key)}
      style={{ flex: 1, padding: "13px 4px", border: `2px solid ${disp === key ? color : "#C9C4B4"}`,
               background: disp === key ? color : "#FFFFFF", color: disp === key ? "#fff" : "#4A4F56",
               fontWeight: 800, fontSize: 13, letterSpacing: 0.4, cursor: "pointer",
               borderRadius: 9 }}>
      {label}
    </button>
  );

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 30, background: C.bg, overflowY: "auto" }}>
      <input type="file" accept="image/*" capture="environment" multiple ref={photoRef}
             style={{ display: "none" }} onChange={e => { onPhotos(e.target.files); e.target.value = ""; }} />
      <div style={{ maxWidth: 780, margin: "0 auto", padding: "12px 12px 90px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
          <button onClick={back} style={btnGhost}>{from === "scan" ? "← Scan Next" : `← Traveler ${job.id}`}</button>
          <div style={{ flex: 1 }} />
          <span style={{ fontFamily: MONO, fontSize: 11.5, color: C.dim, fontWeight: 700 }}>
            {[zone?.label, zone?.label2].filter(Boolean).join(" ")} · STATION TABLET
          </span>
        </div>

        <div style={{ background: C.paper, color: C.ink, borderRadius: 14, overflow: "hidden", boxShadow: "0 8px 36px rgba(31,58,95,.22)" }}>
          {/* header */}
          <div style={{ padding: "14px 18px 10px 18px", borderBottom: "1px solid #DDD8CA" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontFamily: MONO, fontWeight: 800, fontSize: 17, color: C.navy }}>SO {job.so}</span>
              <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 16 }}>{job.part}</span>
              <span style={{ color: "#7A7568" }}>·</span>
              <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 16, color: "#8A6A16" }}>OP {op.op}{op.qa ? " ★" : ""}</span>
              <span style={{ color: "#7A7568" }}>·</span>
              <span style={{ fontWeight: 700, fontSize: 15 }}>{op.title}</span>
            </div>
            <div style={{ fontSize: 11.5, color: "#7A7568", marginTop: 2 }}>
              {job.id} · Qty {job.qty} · {p.desc} Rev {p.rev} · Due {job.due} · Instruction rev current (ESP-*)
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
              <div style={{ flex: 1, height: 8, background: "#E2DED2", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ width: pct + "%", height: "100%", background: C.green }} />
              </div>
              <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700 }}>{pct}% · step {job.cur + 1} of {p.ops.length}</span>
            </div>
          </div>

          {/* figure + PPE */}
          <div style={{ display: "flex", gap: 10, padding: "12px 18px 0 18px", alignItems: "stretch" }}>
            <OpFigure op={op} />
            <div style={{ width: 128, flexShrink: 0 }}>
              <div style={{ fontSize: 9.5, letterSpacing: 1.2, color: "#7A7568", fontWeight: 800, marginBottom: 5 }}>PPE REQUIRED</div>
              {ppe.map(x => (
                <div key={x} style={{ background: "#F1EDE0", border: "1px solid #DDD3B8", borderRadius: 7,
                                      padding: "5px 8px", fontSize: 11, fontWeight: 700, marginBottom: 5 }}>{x}</div>
              ))}
              {op.qa && (
                <div style={{ background: "#FBF3E2", border: "1.5px solid #C9A84C", borderRadius: 7,
                              padding: "5px 8px", fontSize: 10.5, fontWeight: 800, color: "#8A6A16" }}>★ QA HOLD POINT</div>
              )}
            </div>
          </div>

          {/* traveler learning */}
          <div style={{ padding: "10px 18px 0 18px" }}>
            <div style={{ background: "#F1F7F2", border: "1.5px dashed #9CC3A8", borderRadius: 10,
                          padding: "9px 12px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <button onClick={() => takePhoto("learn")}
                style={{ background: "#2F8F5B", color: "#fff", border: "none", borderRadius: 8,
                         padding: "9px 13px", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>
                📷 Capture process photo
              </button>
              <span style={{ fontSize: 10.5, color: "#3E6B4A", lineHeight: 1.45, flex: 1, minWidth: 170 }}>
                <b>TRAVELER LEARNING</b> — snap how this step is really done. Photos route to Engineering
                for review and, once confirmed, become this operation's work-instruction figure.
              </span>
              {photos.map((ph, i) => (
                <img key={i} src={ph.url} alt={ph.name}
                     style={{ width: 46, height: 46, objectFit: "cover", borderRadius: 7, border: "2px solid #9CC3A8" }} />
              ))}
              {photos.length > 0 && (
                <span style={{ fontSize: 9.5, fontWeight: 800, color: "#8A6A16", background: "#FBF3E2",
                               border: "1px solid #DDD3B8", borderRadius: 6, padding: "3px 8px" }}>
                  {photos.length} PENDING ENGINEERING REVIEW
                </span>
              )}
            </div>
          </div>

          {/* instructions */}
          <div style={{ padding: "12px 18px" }}>
            <div style={{ fontSize: 11, letterSpacing: 1.2, color: "#7A7568", fontWeight: 800, marginBottom: 6 }}>OPERATION INSTRUCTIONS — PER ESP</div>
            <ol style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.6 }}>
              {op.steps.map((st, i) => <li key={i} style={{ marginBottom: 5 }}>{st}</li>)}
            </ol>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
              <div style={{ background: "#ECF2EA", border: "1px solid #C9D8C4", borderRadius: 8, padding: "8px 10px" }}>
                <div style={{ fontSize: 10, letterSpacing: 1, color: "#4E6B4A", fontWeight: 800 }}>ACCEPTANCE</div>
                <div style={{ fontSize: 12.5 }}>{op.accept}</div>
              </div>
              <div style={{ background: "#EDEFF4", border: "1px solid #C8CEDC", borderRadius: 8, padding: "8px 10px" }}>
                <div style={{ fontSize: 10, letterSpacing: 1, color: "#44547A", fontWeight: 800 }}>RECORD</div>
                <div style={{ fontSize: 12.5 }}>{op.record}</div>
              </div>
            </div>
          </div>

          {/* disposition */}
          <div style={{ padding: "0 18px 16px 18px" }}>
            <div style={{ fontSize: 11, letterSpacing: 1.2, color: "#7A7568", fontWeight: 800, marginBottom: 7 }}>DISPOSITION — QTY {job.qty}</div>
            <div style={{ display: "flex", gap: 8 }}>
              {segBtn("pass", `✓ ALL PASS (${job.qty})`, C.green)}
              {segBtn("fail", `✗ ALL FAIL (${job.qty})`, C.red)}
              {segBtn("split", "◐ SPLIT QTY", C.navy)}
            </div>
            {disp === "split" && (
              <div style={{ marginTop: 10 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <Field label="Qty Accepted"><NumInput val={qtyA} set={setQtyA} max={job.qty} /></Field>
                  <Field label="Qty Rejected"><NumInput val={qtyR} set={setQtyR} max={job.qty} /></Field>
                </div>
                {!splitOk && (
                  <div style={{ fontSize: 11.5, color: C.red, fontWeight: 700, marginTop: 5 }}>
                    Accepted + rejected must equal lot qty ({job.qty}) — currently {qtyA + qtyR}.
                  </div>
                )}
              </div>
            )}
            {disp && (
              <div style={{ marginTop: 9, fontFamily: MONO, fontSize: 12.5, fontWeight: 700, color: effR > 0 ? C.red : "#2F6B4A" }}>
                Recording: {effA} accepted / {effR} rejected
              </div>
            )}
            <div style={{ marginTop: 10 }}>
              <Field label={effR > 0 ? "Comments / defect description (required for rejects)" : "Comments (optional)"}>
                <input value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. 2 EA chipped magnet at position 5"
                       style={inputStyle} />
              </Field>
              {!noteOk && <div style={{ fontSize: 11, color: C.red, fontWeight: 700, marginTop: 4 }}>Describe the rejects before signing off.</div>}
            </div>

            {/* auth */}
            <div style={{ display: "grid", gridTemplateColumns: op.qa ? "1fr 1fr" : "1fr", gap: 10, marginTop: 10 }}>
              <Field label="Operator initials / badge">
                <input value={operator} onChange={e => setOperator(e.target.value)} placeholder="e.g. R.M." style={inputStyle} maxLength={12} />
              </Field>
              {op.qa && (
                <Field label="QA inspector">
                  <input value={inspector} onChange={e => setInspector(e.target.value)} placeholder="e.g. QA-07" style={inputStyle} maxLength={12} />
                </Field>
              )}
            </div>
            {op.qa && (
              <button onClick={() => setStamped(!stamped)}
                style={{ marginTop: 12, width: "100%", background: stamped ? "#FBF3E2" : "#F1EDE2",
                         border: `2px ${stamped ? "solid" : "dashed"} ${stamped ? "#8A6A16" : "#C4B98F"}`,
                         borderRadius: 10, padding: "10px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 54, height: 54,
                               border: `2.5px solid ${stamped ? "#A33B2E" : "#C4B98F"}`, borderRadius: "50%",
                               color: stamped ? "#A33B2E" : "#B0A987", fontFamily: MONO, fontWeight: 800, fontSize: 10,
                               transform: "rotate(-12deg)", letterSpacing: 0.5, flexShrink: 0 }}>
                  {stamped ? "QA OK" : "STAMP"}
                </span>
                <span style={{ textAlign: "left" }}>
                  <b style={{ fontSize: 13 }}>★ QA HOLD POINT — inspector acceptance required</b>
                  <div style={{ fontSize: 11.5, color: "#7A7568" }}>{stamped ? "Accepted — release to sign off." : "Tap to apply QA acceptance stamp. Sign-off is blocked until QA accepts."}</div>
                </span>
              </button>
            )}

            {job.status === "hold" && (
              <div style={{ marginTop: 12, background: "#F7E4E0", border: `1px solid ${C.red}`, borderRadius: 8, padding: "9px 12px", fontSize: 12.5, color: "#7A2A20" }}>
                Job is on hold ({job.holdReason}). Supervisor must release before sign-off.
              </div>
            )}

            <button disabled={!canSign}
              onClick={() => signOff(job.id, { qtyA: effA, qtyR: effR, operator: operator.trim(), inspector: inspector.trim(), note: note.trim(), photos: photos.length }, from)}
              style={{ marginTop: 14, width: "100%", padding: "16px 0", borderRadius: 10, border: "none",
                       background: canSign ? C.green : "#C9C4B4", color: "#fff", fontWeight: 800, fontSize: 15,
                       letterSpacing: 0.6, cursor: canSign ? "pointer" : "not-allowed" }}>
              {disp ? `SIGN OFF — ${effA} PASS / ${effR} FAIL` : "SELECT DISPOSITION TO SIGN OFF"}
            </button>

            {/* Report NC / Request Support */}
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button onClick={() => { setPanel(panel === "nc" ? null : "nc"); setReason(""); }}
                style={{ flex: 1, padding: "10px 0", borderRadius: 8, background: panel === "nc" ? C.red : "transparent",
                         border: `1.5px solid ${C.red}`, color: panel === "nc" ? "#fff" : C.red, fontWeight: 800, fontSize: 12.5, cursor: "pointer" }}>
                ⚠ Report Non-Conformance
              </button>
              <button onClick={() => { setPanel(panel === "support" ? null : "support"); setReason(""); setTeams([]); }}
                style={{ flex: 1, padding: "10px 0", borderRadius: 8, background: panel === "support" ? C.blue : "transparent",
                         border: `1.5px solid ${C.blue}`, color: panel === "support" ? "#fff" : C.blue, fontWeight: 800, fontSize: 12.5, cursor: "pointer" }}>
                🔔 Request Support
              </button>
            </div>

            {panel === "nc" && (
              <div style={{ marginTop: 8, background: "#FBF1EF", border: `1.5px solid #E3B7AF`, borderRadius: 10, padding: "10px 12px" }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <input value={reason} onChange={e => setReason(e.target.value)}
                         placeholder="Describe the non-conformance… (report no. auto-assigned)"
                         style={{ ...inputStyle, flex: 1 }} />
                  <button onClick={() => takePhoto("nc")}
                    style={{ padding: "0 13px", borderRadius: 8, border: `1.5px solid ${C.red}`, background: "#fff",
                             color: C.red, fontWeight: 800, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}>
                    📷{ncPhotos > 0 ? ` ${ncPhotos}` : ""}
                  </button>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 10.5, color: "#7A2A20", flex: 1, minWidth: 180 }}>
                    Routed to <b>Quality &amp; Engineering</b> for disposition — they decide NCR / use-as-is / rework.
                    Job holds pending review.
                  </span>
                  <button disabled={reason.trim().length < 4}
                    onClick={() => raiseNCR(job.id, reason.trim() + (ncPhotos ? ` · ${ncPhotos} photo${ncPhotos > 1 ? "s" : ""} attached` : ""), from)}
                    style={{ padding: "10px 16px", borderRadius: 8, border: "none",
                             background: reason.trim().length >= 4 ? C.red : "#C9C4B4",
                             color: "#fff", fontWeight: 800, cursor: "pointer" }}>
                    Submit report
                  </button>
                </div>
              </div>
            )}

            {panel === "support" && (
              <div style={{ marginTop: 8, background: "#EFF4FA", border: `1.5px solid #B9CFE6`, borderRadius: 10, padding: "10px 12px" }}>
                <div style={{ fontSize: 10, letterSpacing: 1, fontWeight: 800, color: "#44607F", marginBottom: 6 }}>ALERT — SELECT TEAM(S)</div>
                <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 8 }}>
                  {["ENGINEERING", "QUALITY", "PLANNING", "SUPERVISOR"].map(t => {
                    const on = teams.includes(t);
                    return (
                      <button key={t} onClick={() => setTeams(ts => on ? ts.filter(x => x !== t) : [...ts, t])}
                        style={{ padding: "7px 13px", borderRadius: 16, fontSize: 11, fontWeight: 800, cursor: "pointer",
                                 border: `1.5px solid ${on ? C.blue : "#B9CFE6"}`,
                                 background: on ? C.blue : "#fff", color: on ? "#fff" : "#44607F" }}>
                        {on ? "✓ " : ""}{t}
                      </button>
                    );
                  })}
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <input value={reason} onChange={e => setReason(e.target.value)}
                         placeholder="What do you need? (optional)" style={{ ...inputStyle, flex: 1, minWidth: 160 }} />
                  <button disabled={teams.length === 0}
                    onClick={() => { requestSupport(job.id, teams, reason.trim()); setPanel(null); }}
                    style={{ padding: "10px 16px", borderRadius: 8, border: "none",
                             background: teams.length ? C.blue : "#C9C4B4", color: "#fff", fontWeight: 800, cursor: "pointer" }}>
                    Send alert
                  </button>
                </div>
                <div style={{ fontSize: 10, color: "#44607F", marginTop: 6 }}>
                  Does not stop the job — the alert pops on the selected teams' dashboards with your station and traveler.
                </div>
              </div>
            )}
          </div>
        </div>
        <div style={{ textAlign: "center", fontSize: 10.5, color: C.dim, marginTop: 10 }}>
          Sequence enforced · QA hold points require inspector acceptance · Non-conformance reports auto-number and route to Quality &amp; Engineering for disposition · Support alerts notify the selected teams without stopping the job.
        </div>
      </div>
    </div>
  );
}
const Field = ({ label, children }) => (
  <label style={{ display: "block" }}>
    <div style={{ fontSize: 10.5, letterSpacing: 1, color: "#7A7568", fontWeight: 700, marginBottom: 4 }}>{label.toUpperCase()}</div>
    {children}
  </label>
);
const inputStyle = { width: "100%", boxSizing: "border-box", padding: "11px 12px", borderRadius: 8, border: "1.5px solid #C9C4B4",
                     background: "#fff", fontFamily: MONO, fontSize: 15, fontWeight: 600, color: "#22262B" };
function NumInput({ val, set, max }) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      <button onClick={() => set(Math.max(0, val - 1))} style={stepBtn}>−</button>
      <input value={val} onChange={e => set(Math.max(0, Math.min(max, parseInt(e.target.value) || 0)))}
             style={{ ...inputStyle, textAlign: "center", flex: 1 }} inputMode="numeric" />
      <button onClick={() => set(Math.min(max, val + 1))} style={stepBtn}>+</button>
    </div>
  );
}
const stepBtn = { width: 46, borderRadius: 8, border: "1.5px solid #C9C4B4", background: "#EFEBE0",
                  fontSize: 20, fontWeight: 700, cursor: "pointer", color: "#22262B" };

/* ---------------------- PLANNING: JOB HOPPER + BANDWIDTH ---------------------- */
const WK0 = new Date(2026, 6, 27); // week 1 = Mon Jul 27 2026
const wkLabel = (i) => new Date(WK0.getTime() + i * 7 * 86400000)
  .toLocaleDateString("en-US", { month: "short", day: "numeric" });
const DEPT_ROWS = [["STOCK","Kitting / Stock"],["QC","QC / Inspection"],["MACH","Machine Shop"],
  ["STACK","Stacking"],["ROTOR","Rotor"],["WIND","Winding"],["IMPREG","Impregnation"],
  ["SUB","Sub Assembly"],["FINAL","Final Assembly"],["TEST","Test & Checkout"]];
const DEPT_CAP = { STOCK:50, QC:45, MACH:40, STACK:40, ROTOR:50, WIND:80, IMPREG:35, SUB:55, FINAL:50, TEST:45 };
const CAT_HRS = { kit:2, inspect:2.5, assemble:5, machine:7, test:3.5, cure:7, wind:9, move:1 };
const WEEK_BUDGET = 20; // touch-time a single job progresses per week (queues included)
const opHrs = (op, qty) => CAT_HRS[opCategory(op)] * (0.4 + qty / 12);

function layPart(part, qty, startWk, load, weeks, detail, so) {
  let selfStart = startWk;
  for (const ch of (CHILDREN[part] || []))
    selfStart = Math.max(selfStart, layPart(ch, qty, startWk, load, weeks, detail, so));
  let cum = 0;
  for (const op of PARTS[part].ops) {
    const wk = selfStart + Math.floor(cum / WEEK_BUDGET);
    const h = opHrs(op, qty);
    if (wk < weeks && load[op.zone]) {
      load[op.zone][wk] += h;
      detail.push({ week: wk, zone: op.zone, so, job: null, part, qty, op: op.op, title: op.title, hrs: h, src: "plan" });
    }
    cum += h;
  }
  return selfStart + Math.ceil(cum / WEEK_BUDGET);
}

function computeLoad(jobs, hopper, allOrders, weeks) {
  const load = {}; const detail = [];
  DEPT_ROWS.forEach(([z]) => { load[z] = Array(weeks).fill(0); });
  jobs.filter(j => j.status !== "complete").forEach(j => {
    let cum = 0;
    PARTS[j.part].ops.slice(j.cur).forEach(op => {
      const wk = Math.floor(cum / WEEK_BUDGET);
      const h = opHrs(op, j.qty);
      if (wk < weeks && load[op.zone]) {
        load[op.zone][wk] += h;
        detail.push({ week: wk, zone: op.zone, so: j.so, job: j.id, part: j.part, qty: j.qty, op: op.op, title: op.title, hrs: h, src: "floor" });
      }
      cum += h;
    });
  });
  hopper.forEach(h => {
    const o = allOrders.find(x => x.so === h.so);
    if (o) layPart(o.part, o.qty, h.week, load, weeks, detail, o.so);
  });
  return { load, detail };
}

function PlanningView({ jobs, plan, setPlan }) {
  const [sel, setSel] = useState(null);
  const [period, setPeriod] = useState(9); // weeks (2-month default)
  const [form, setForm] = useState({ part: "STA-3100", qty: 10 });
  const [selWk, setSelWk] = useState(null); // { week, dept|null }
  const [relSo, setRelSo] = useState(null);  // SO being released (modal)
  const fileRef = useRef(null);
  const docTarget = useRef(null);

  const allOrders = [...SOS, ...plan.orders];
  const backlog = [...SOS.filter(so => !soSummary(so.so, jobs).released), ...plan.orders]
    .filter(o => !plan.hopper.find(h => h.so === o.so));
  const lanes = Math.min(period, 8);

  const place = (so, wk) => {
    setPlan(p => {
      const ex = p.hopper.find(h => h.so === so);
      const ord = allOrders.find(x => x.so === so);
      const entry = ex ? { ...ex, week: wk }
        : { so, week: wk, remaining: treeParts(ord ? ord.part : "ACT-1000"), splits: 0 };
      return { ...p, hopper: [...p.hopper.filter(h => h.so !== so), entry] };
    });
    setSel(null);
  };
  const createTicket = (so, parts, label) => {
    const o = allOrders.find(x => x.so === so);
    setPlan(p => ({ ...p,
      kits: [...p.kits, { id: label, so, week: (p.hopper.find(h => h.so === so)?.week ?? 0),
                          parts, part: o.part, config: o.config, qty: o.qty, due: o.due,
                          status: "due", issuedQty: null, note: "", kitter: "", ts: null }],
      hopper: p.hopper.map(h => h.so === so
        ? { ...h, remaining: h.remaining.filter(x => !parts.includes(x)), splits: h.splits + 1 } : h),
    }));
    setRelSo(null);
  };
  const removeFromHopper = (so) => setPlan(p => ({ ...p, hopper: p.hopper.filter(h => h.so !== so) }));
  const nudge = (so, d) => setPlan(p => ({ ...p, hopper: p.hopper.map(h =>
    h.so === so ? { ...h, week: Math.max(0, Math.min(period - 1, h.week + d)) } : h) }));
  const nextSo = () => String(4113 + plan.orders.length);
  const addOrder = () => {
    const so = nextSo();
    const due = wkLabel(Math.min(period + 2, 12));
    setPlan(p => ({ ...p, orders: [...p.orders, { so, part: form.part, config: PARTS[form.part].desc, qty: form.qty, due }] }));
  };
  const demoTen = () => {
    setPlan(p => {
      const base = 4113 + p.orders.length;
      const add = Array.from({ length: 10 }, (_, i) => ({
        so: String(base + i), part: "STA-3100", config: "Stator Assembly", qty: 10, due: wkLabel(8) }));
      return { ...p, orders: [...p.orders, ...add],
               hopper: [...p.hopper, ...add.map(o => ({ so: o.so, week: 0, remaining: treeParts("STA-3100"), splits: 0 }))] };
    });
  };
  const attach = (files) => {
    const so = docTarget.current; if (!so || !files?.length) return;
    const names = Array.from(files).map(f => ({ name: f.name, kb: Math.max(1, Math.round(f.size / 1024)) }));
    setPlan(p => ({ ...p, docs: { ...p.docs, [so]: [...(p.docs[so] || []), ...names] } }));
  };
  const pickDocs = (so) => { docTarget.current = so; fileRef.current?.click(); };

  const { load, detail } = useMemo(() => computeLoad(jobs, plan.hopper, allOrders, period),
    [jobs, plan.hopper, plan.orders, period]);

  const OrderCard = ({ o, inHopper, week, hop }) => {
    const p = PARTS[o.part];
    const docs = plan.docs[o.so] || [];
    const isSel = sel === o.so;
    const scope = inHopper ? (hop?.remaining ?? treeParts(o.part)) : null;
    const total = inHopper ? treeParts(o.part).length : 0;
    return (
      <div draggable
           onDragStart={e => { e.dataTransfer.setData("text/plain", o.so); setSel(o.so); }}
           onClick={() => !inHopper && setSel(isSel ? null : o.so)}
           style={{ background: "#FFFFFF", border: `1.5px solid ${isSel ? C.gold : C.line}`,
                    borderLeft: `4px solid ${p.color}`, borderRadius: 8, padding: "8px 10px", marginBottom: 8,
                    cursor: "grab", boxShadow: isSel ? `0 0 0 2px ${C.gold}44` : "0 1px 5px rgba(31,58,95,.07)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontFamily: MONO, fontWeight: 800, fontSize: 13.5, color: C.navy }}>SO {o.so}</span>
          <span style={{ fontFamily: MONO, fontSize: 10.5, color: C.dim }}>Due {o.due}</span>
        </div>
        <div style={{ fontSize: 11.5, fontWeight: 700, marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{o.config}</div>
        <div style={{ fontFamily: MONO, fontSize: 11, color: p.color }}>{o.part} <span style={{ color: C.dim }}>· Qty {o.qty}</span></div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 5, flexWrap: "wrap" }}>
          <button onClick={e => { e.stopPropagation(); pickDocs(o.so); }}
            style={{ fontSize: 10.5, fontWeight: 700, border: `1px solid ${C.line}`, background: C.panel2,
                     borderRadius: 6, padding: "3px 8px", cursor: "pointer", color: C.navy }}>
            📎 Attach
          </button>
          {docs.length > 0 && (
            <span title={docs.map(d => d.name).join("\n")}
              style={{ fontSize: 10.5, fontWeight: 700, color: "#2F6B4A", background: "#E7F2EA",
                       border: "1px solid #C9D8C4", borderRadius: 6, padding: "3px 8px" }}>
              {docs.length} doc{docs.length > 1 ? "s" : ""}
            </span>
          )}
          {inHopper && (
            <span style={{ marginLeft: "auto", display: "inline-flex", gap: 4 }}>
              <button onClick={e => { e.stopPropagation(); nudge(o.so, -1); }} disabled={week === 0} style={miniBtn}>◀</button>
              <button onClick={e => { e.stopPropagation(); nudge(o.so, 1); }} style={miniBtn}>▶</button>
              <button onClick={e => { e.stopPropagation(); removeFromHopper(o.so); }} style={{ ...miniBtn, color: C.red, borderColor: "#E3B7AF" }}>✕</button>
            </span>
          )}
        </div>
        {inHopper && (
          <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            {scope.length === 0 ? (
              <span style={{ fontSize: 10, fontWeight: 800, color: "#2F6B4A" }}>
                ✓ RELEASED TO KITTING · {hop.splits} ticket{hop.splits === 1 ? "" : "s"}
              </span>
            ) : (
              <>
                <button onClick={e => { e.stopPropagation(); setRelSo(o.so); }}
                  style={{ fontSize: 10.5, fontWeight: 800, background: C.navy, color: "#fff", border: "none",
                           borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}>⇧ Release kit…</button>
                {hop.splits > 0 && (
                  <span style={{ fontSize: 9.5, fontWeight: 800, color: "#8A6A16", background: "#FBF3E2",
                                 border: "1px solid #DDD3B8", borderRadius: 5, padding: "2px 7px" }}>
                    PARTIAL · {total - scope.length}/{total} ASSIGNED
                  </span>
                )}
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  const cellStyle = (pct) => pct === 0 ? { background: "#FFFFFF", color: "#B8C0CC" }
    : pct <= 55 ? { background: "#E7F0FA", color: "#2C6DB4" }
    : pct <= 85 ? { background: "#EAF3EC", color: "#2F6B4A" }
    : pct <= 100 ? { background: "#FBF0DC", color: "#8A6A16", fontWeight: 800 }
    : pct <= 150 ? { background: "#F6DBD5", color: "#8A2A1E", fontWeight: 800 }
    : { background: "#E9A79B", color: "#5E170D", fontWeight: 800 };

  return (
    <div style={{ maxWidth: 1500, margin: "0 auto", padding: "0 18px 60px 18px" }}>
      <input type="file" multiple ref={fileRef} style={{ display: "none" }}
             onChange={e => { attach(e.target.files); e.target.value = ""; }} />

      <Badge n={1} title="JOB HOPPER — RELEASE PLANNING"
        right={
          <span style={{ display: "inline-flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <select value={form.part} onChange={e => setForm(f => ({ ...f, part: e.target.value }))}
              style={{ padding: "7px 8px", borderRadius: 7, border: `1.5px solid ${C.line}`, fontSize: 12, fontFamily: MONO, background: "#fff", color: C.text }}>
              {Object.keys(PARTS).map(pn => <option key={pn} value={pn}>{pn} — {PARTS[pn].desc}</option>)}
            </select>
            <input type="number" min={1} max={50} value={form.qty}
              onChange={e => setForm(f => ({ ...f, qty: Math.max(1, Math.min(50, parseInt(e.target.value) || 1)) }))}
              style={{ width: 58, padding: "7px 8px", borderRadius: 7, border: `1.5px solid ${C.line}`, fontSize: 12.5, fontFamily: MONO }} />
            <button onClick={addOrder} style={{ ...btnGhost, padding: "7px 12px" }}>＋ Add order</button>
            <button onClick={demoTen} style={{ ...btnPrimary, background: C.navy, padding: "8px 14px", fontSize: 12 }}>⚡ Demo: 10 × Stator this week</button>
          </span>
        } />

      <div style={{ display: "flex", gap: 14, alignItems: "stretch" }}>
        {/* backlog */}
        <div style={{ width: 258, flexShrink: 0, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 10.5, letterSpacing: 1.2, color: C.dim, fontWeight: 800, marginBottom: 8 }}>
            REPOSITORY — UNRELEASED ({backlog.length})
          </div>
          {backlog.length === 0 && <div style={{ fontSize: 12, color: C.dim }}>Nothing waiting. Add an order above.</div>}
          {backlog.map(o => <OrderCard key={o.so} o={o} />)}
          <div style={{ fontSize: 10, color: C.dim, marginTop: 6, lineHeight: 1.5 }}>
            Drag a card into a week — or tap the card, then tap "＋ place" on a week lane (touch).
          </div>
        </div>

        {/* week lanes */}
        <div style={{ flex: 1, display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
          {Array.from({ length: lanes }, (_, i) => {
            const items = plan.hopper.filter(h => h.week === i);
            return (
              <div key={i}
                   onDragOver={e => e.preventDefault()}
                   onDrop={e => { e.preventDefault(); const so = e.dataTransfer.getData("text/plain") || sel; if (so) place(so, i); }}
                   style={{ width: 216, flexShrink: 0, background: "#F2F4F7", border: `1.5px dashed ${items.length ? C.navy : "#B8C0CC"}`,
                            borderRadius: 10, padding: 10, minHeight: 220 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 800, color: C.navy }}>WK {i + 1} · {wkLabel(i)}</span>
                  {sel && (
                    <button onClick={() => place(sel, i)}
                      style={{ fontSize: 10.5, fontWeight: 800, color: "#fff", background: C.gold, border: "none",
                               borderRadius: 6, padding: "3px 8px", cursor: "pointer" }}>＋ place</button>
                  )}
                </div>
                {items.map(h => {
                  const o = allOrders.find(x => x.so === h.so);
                  return o ? <OrderCard key={h.so} o={o} inHopper week={h.week} hop={h} /> : null;
                })}
                {items.length === 0 && <div style={{ fontSize: 11, color: "#A6AFBB", textAlign: "center", marginTop: 60 }}>drop here</div>}
              </div>
            );
          })}
        </div>
      </div>

      <Badge n={2} title="DEPARTMENT BANDWIDTH — % OF WEEKLY CAPACITY"
        right={
          <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
            <span style={{ fontSize: 11, color: C.dim, marginRight: 4 }}>Period:</span>
            {[[4, "1 mo"], [9, "2 mo"], [13, "3 mo"]].map(([w, l]) => (
              <button key={w} onClick={() => setPeriod(w)}
                style={{ padding: "6px 12px", fontSize: 11.5, fontWeight: 800, cursor: "pointer", borderRadius: 7,
                         border: `1.5px solid ${period === w ? C.navy : C.line}`,
                         background: period === w ? C.navy : "#fff", color: period === w ? "#fff" : C.navy }}>{l}</button>
            ))}
          </span>
        } />

      <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, padding: 12, overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 120 + period * 62 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "6px 10px", fontSize: 10.5, letterSpacing: 1, color: C.dim }}>DEPARTMENT</th>
              <th style={{ textAlign: "right", padding: "6px 8px", fontSize: 10, color: C.dim }}>CAP</th>
              {Array.from({ length: period }, (_, i) => {
                const on = selWk && selWk.week === i;
                return (
                  <th key={i}
                      onClick={() => setSelWk(sw => sw && sw.week === i && !sw.dept ? null : { week: i, dept: null })}
                      title="Show the work driving this week's load"
                      style={{ padding: "4px 3px", cursor: "pointer" }}>
                    <span style={{ display: "inline-block", padding: "3px 7px", borderRadius: 6, fontSize: 10.5,
                                   background: on ? C.navy : "transparent",
                                   color: on ? "#fff" : i === 0 ? C.navy : C.dim,
                                   fontWeight: on || i === 0 ? 800 : 600 }}>
                      {i === 0 ? "NOW" : wkLabel(i)}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {DEPT_ROWS.map(([z, name]) => (
              <tr key={z} style={{ borderTop: `1px solid ${C.line}` }}>
                <td style={{ padding: "7px 10px", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>{name}</td>
                <td style={{ padding: "7px 8px", fontSize: 10.5, fontFamily: MONO, color: C.dim, textAlign: "right", whiteSpace: "nowrap" }}>{DEPT_CAP[z]}h</td>
                {Array.from({ length: period }, (_, i) => {
                  const hrs = load[z][i];
                  const pct = Math.round((hrs / DEPT_CAP[z]) * 100);
                  const selCell = selWk && selWk.week === i && selWk.dept === z;
                  return (
                    <td key={i} title={`${name} · ${i === 0 ? "this week" : "wk of " + wkLabel(i)} — ${Math.round(hrs)}h of ${DEPT_CAP[z]}h · tap for detail`}
                        onClick={() => setSelWk(sw => sw && sw.week === i && sw.dept === z ? null : { week: i, dept: z })}
                        style={{ ...cellStyle(pct), textAlign: "center", fontFamily: MONO, fontSize: 11.5,
                                 padding: "8px 4px", borderLeft: "1px solid #EDEFF3", cursor: "pointer",
                                 boxShadow: selCell ? `inset 0 0 0 2.5px ${C.navy}` : "none" }}>
                      {pct === 0 ? "·" : pct + "%"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        {selWk && selWk.week < period && (() => {
          const rows = detail
            .filter(d => d.week === selWk.week && (!selWk.dept || d.zone === selWk.dept))
            .sort((a, b) => b.hrs - a.hrs);
          const tot = rows.reduce((a, r) => a + r.hrs, 0);
          const deptName = selWk.dept ? DEPT_ROWS.find(([z]) => z === selWk.dept)?.[1] : null;
          return (
            <div style={{ marginTop: 12, border: `2px solid ${C.navy}`, borderRadius: 10, overflow: "hidden", background: "#fff" }}>
              <div style={{ background: C.navy, color: "#fff", padding: "8px 14px", display: "flex", gap: 12,
                            alignItems: "baseline", flexWrap: "wrap" }}>
                <span style={{ fontWeight: 800, fontSize: 13 }}>
                  WK {selWk.week + 1} · {selWk.week === 0 ? "THIS WEEK" : "WK OF " + wkLabel(selWk.week).toUpperCase()} — WORK DRIVING THE LOAD
                </span>
                {deptName && (
                  <span style={{ fontSize: 11.5, fontWeight: 800, color: C.gold }}>
                    {deptName.toUpperCase()} ONLY
                    <button onClick={() => setSelWk({ week: selWk.week, dept: null })}
                      style={{ marginLeft: 8, fontSize: 10.5, fontWeight: 800, background: "transparent",
                               border: "1px solid rgba(255,255,255,.5)", color: "#fff", borderRadius: 5,
                               padding: "1px 7px", cursor: "pointer" }}>show all depts</button>
                  </span>
                )}
                <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 12 }}>
                  {rows.length} step{rows.length === 1 ? "" : "s"} · {Math.round(tot)}h
                </span>
                <button onClick={() => setSelWk(null)}
                  style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: 15 }}>✕</button>
              </div>
              <div style={{ maxHeight: 340, overflowY: "auto", padding: "8px 12px" }}>
                {rows.length === 0 && <div style={{ fontSize: 12, color: C.dim, padding: "8px 2px" }}>No work lands here.</div>}
                {rows.map((r, i) => {
                  const pp = PARTS[r.part];
                  const dn = DEPT_ROWS.find(([z]) => z === r.zone)?.[1] || r.zone;
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 4px",
                                          borderBottom: i < rows.length - 1 ? `1px solid ${C.line}` : "none", flexWrap: "wrap" }}>
                      {!selWk.dept && (
                        <span style={{ fontSize: 10, fontWeight: 800, color: C.navy, background: "#EDF1F7",
                                       border: `1px solid ${C.line}`, borderRadius: 5, padding: "2px 7px", whiteSpace: "nowrap" }}>
                          {dn}
                        </span>
                      )}
                      <span style={{ fontFamily: MONO, fontWeight: 800, fontSize: 12.5, color: C.navy }}>SO {r.so}</span>
                      <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: pp.color }}>{r.part}</span>
                      <span style={{ fontSize: 11.5, color: C.text, minWidth: 0 }}>
                        <b>OP {r.op}</b> · {r.title}
                      </span>
                      <span style={{ fontSize: 10.5, color: C.dim, whiteSpace: "nowrap" }}>{pp.desc} · Qty {r.qty}</span>
                      <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 8 }}>
                        {r.src === "floor"
                          ? <span style={{ fontSize: 9.5, fontWeight: 800, color: "#2F6B4A", background: "#E7F2EA",
                                           border: "1px solid #C9D8C4", borderRadius: 5, padding: "2px 7px" }}>ON FLOOR{r.job ? " · " + r.job : ""}</span>
                          : <span style={{ fontSize: 9.5, fontWeight: 800, color: "#8A6A16", background: "#FBF3E2",
                                           border: "1px solid #DDD3B8", borderRadius: 5, padding: "2px 7px" }}>PLANNED — HOPPER</span>}
                        <span style={{ fontFamily: MONO, fontSize: 12.5, fontWeight: 800, color: C.navy, minWidth: 46, textAlign: "right" }}>
                          {r.hrs.toFixed(1)}h
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
              <div style={{ padding: "6px 14px 9px 14px", fontSize: 10, color: C.dim, borderTop: `1px solid ${C.line}` }}>
                Tap a % cell to filter to one department · tap the week header again to close · move hopper cards to later weeks to relieve red cells.
              </div>
            </div>
          );
        })()}

        <div style={{ display: "flex", gap: 14, alignItems: "center", marginTop: 10, flexWrap: "wrap", fontSize: 11 }}>
          <span style={{ color: C.dim, fontWeight: 800, letterSpacing: 1, fontSize: 10 }}>LOAD</span>
          {[["≤55% — open", "#E7F0FA", "#2C6DB4"], ["56–85% — healthy", "#EAF3EC", "#2F6B4A"],
            ["86–100% — tight", "#FBF0DC", "#8A6A16"], ["101–150% — constraint", "#F6DBD5", "#8A2A1E"],
            ["&gt;150% — will slip", "#E9A79B", "#5E170D"]].map(([l, bg, fg]) => (
            <span key={l} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 15, height: 12, background: bg, border: "1px solid rgba(0,0,0,.15)", borderRadius: 3 }} />
              <span style={{ color: fg, fontWeight: 700 }} dangerouslySetInnerHTML={{ __html: l }} />
            </span>
          ))}
        </div>
        <div style={{ fontSize: 10.5, color: C.dim, marginTop: 8, lineHeight: 1.55 }}>
          PREVIEW — the Bandwidth tab adds execution detail: holds, NCRs, frozen work, QA-pending, and late risk.
          Load = active floor jobs (remaining ops from their current step) + hopper orders (full routing from their planned week).
          Subassemblies are scheduled before their parents — queue stator assemblies and Stacking loads first, Winding follows.
          Demo model: estimated hours per op scaled by qty · ~{WEEK_BUDGET}h touch-time per job per week. Production version uses
          JobBOSS² standard times and actuals learned from sign-off timestamps.
        </div>
      </div>

      {relSo && (() => {
        const ord = allOrders.find(x => x.so === relSo);
        const hop = plan.hopper.find(h => h.so === relSo);
        if (!ord || !hop) return null;
        return <ReleaseModal order={ord} hop={hop} kits={plan.kits}
                             onClose={() => setRelSo(null)}
                             onCreate={(parts, label) => createTicket(relSo, parts, label)} />;
      })()}
    </div>
  );
}
const miniBtn = { fontSize: 11, fontWeight: 800, border: "1px solid #C4CBD6", background: "#fff",
                  borderRadius: 6, padding: "2px 7px", cursor: "pointer", color: "#1F3A5F" };

/* ---------------------- BANDWIDTH (detailed execution view) ---------------------- */
const MONTHS = { Jan:0, Feb:1, Mar:2, Apr:3, May:4, Jun:5, Jul:6, Aug:7, Sep:8, Oct:9, Nov:10, Dec:11 };
const dueWk = (str) => {
  try { const [mo, d] = str.split(" "); return Math.max(0, Math.round((new Date(2026, MONTHS[mo], parseInt(d)) - WK0) / (7 * 86400000))); }
  catch (e) { return 8; }
};

function computeBandwidth(jobs, hopper, allOrders, weeks) {
  const load = {}, blocked = {}, detail = [];
  const stats = {};
  DEPT_ROWS.forEach(([z]) => { load[z] = Array(weeks).fill(0); blocked[z] = 0; stats[z] = { wip: 0, holds: 0, ncrs: 0, qa: 0, late: 0 }; });
  jobs.filter(j => j.status !== "complete").forEach(j => {
    const ops = PARTS[j.part].ops;
    const zNow = ops[j.cur].zone;
    if (stats[zNow]) stats[zNow].wip++;
    const rem = ops.slice(j.cur);
    const totRem = rem.reduce((a, op) => a + opHrs(op, j.qty), 0);
    if (j.status === "hold") {
      if (stats[zNow]) {
        stats[zNow].holds++;
        if ((j.holdReason || "").includes("NCR")) stats[zNow].ncrs++;
      }
      if (blocked[zNow] != null) {
        blocked[zNow] += totRem;
        detail.push({ week: 0, zone: zNow, so: j.so, job: j.id, part: j.part, qty: j.qty,
                      op: rem[0].op, title: `${rem[0].title} — FROZEN (${j.holdReason || "hold"})`, hrs: totRem, src: "blocked" });
      }
      return;
    }
    if (ops[j.cur].qa && stats[zNow]) stats[zNow].qa++;
    let cum = 0;
    rem.forEach(op => {
      const wk = Math.floor(cum / WEEK_BUDGET); const h = opHrs(op, j.qty);
      if (wk < weeks && load[op.zone]) {
        load[op.zone][wk] += h;
        detail.push({ week: wk, zone: op.zone, so: j.so, job: j.id, part: j.part, qty: j.qty, op: op.op, title: op.title, hrs: h, src: "floor" });
      }
      cum += h;
    });
    const endWk = Math.max(0, Math.ceil(totRem / WEEK_BUDGET) - 1);
    if (endWk > dueWk(j.due) && stats[zNow]) stats[zNow].late++;
  });
  hopper.forEach(h => {
    const o = allOrders.find(x => x.so === h.so);
    if (o) layPart(o.part, o.qty, h.week, load, weeks, detail, o.so);
  });
  return { load, blocked, detail, stats };
}

function BandwidthView({ jobs, plan }) {
  const [period, setPeriod] = useState(9);
  const [selWk, setSelWk] = useState(null);   // { week, dept|null }
  const [selDept, setSelDept] = useState(null);
  const allOrders = [...SOS, ...plan.orders];
  const { load, blocked, detail, stats } = useMemo(
    () => computeBandwidth(jobs, plan.hopper, allOrders, period),
    [jobs, plan.hopper, plan.orders, period]);

  const act = jobs.filter(j => j.status !== "complete");
  const holds = act.filter(j => j.status === "hold").length;
  const ncrs = act.filter(j => (j.holdReason || "").includes("NCR")).length;
  const late = Object.values(stats).reduce((a, x) => a + x.late, 0);
  const blockedH = Math.round(Object.values(blocked).reduce((a, b) => a + b, 0));
  const overCells = DEPT_ROWS.reduce((a, [z]) => a + load[z].filter(h => h / DEPT_CAP[z] > 1).length, 0);

  const cellPct = (pct) => pct === 0 ? { background: "#FFFFFF", color: "#B8C0CC" }
    : pct <= 55 ? { background: "#E7F0FA", color: "#2C6DB4" }
    : pct <= 85 ? { background: "#EAF3EC", color: "#2F6B4A" }
    : pct <= 100 ? { background: "#FBF0DC", color: "#8A6A16", fontWeight: 800 }
    : pct <= 150 ? { background: "#F6DBD5", color: "#8A2A1E", fontWeight: 800 }
    : { background: "#E9A79B", color: "#5E170D", fontWeight: 800 };

  const KPI = ({ v, l, c }) => (
    <span style={{ display: "inline-flex", alignItems: "baseline", gap: 7, padding: "6px 13px",
                   background: "#fff", border: `1px solid ${C.line}`, borderLeft: `4px solid ${c}`, borderRadius: 8 }}>
      <span style={{ fontFamily: MONO, fontSize: 17, fontWeight: 800, color: c }}>{v}</span>
      <span style={{ fontSize: 11, color: C.dim }}>{l}</span>
    </span>
  );

  const zoneNow = (j) => PARTS[j.part].ops[j.cur].zone;

  return (
    <div style={{ maxWidth: 1500, margin: "0 auto", padding: "0 18px 60px 18px" }}>
      <Badge n={1} title="DEPARTMENT BANDWIDTH — EXECUTION VIEW"
        right={
          <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
            <span style={{ fontSize: 11, color: C.dim, marginRight: 4 }}>Period:</span>
            {[[4, "1 mo"], [9, "2 mo"], [13, "3 mo"]].map(([w, l]) => (
              <button key={w} onClick={() => { setPeriod(w); setSelWk(null); }}
                style={{ padding: "6px 12px", fontSize: 11.5, fontWeight: 800, cursor: "pointer", borderRadius: 7,
                         border: `1.5px solid ${period === w ? C.navy : C.line}`,
                         background: period === w ? C.navy : "#fff", color: period === w ? "#fff" : C.navy }}>{l}</button>
            ))}
          </span>
        } />

      {/* KPI strip */}
      <div style={{ display: "flex", gap: 9, flexWrap: "wrap", marginBottom: 12 }}>
        <KPI v={act.length} l="active travelers" c={C.blue} />
        <KPI v={holds} l={`on hold (${ncrs} NCR)`} c={C.red} />
        <KPI v={blockedH + "h"} l="frozen by holds" c={C.red} />
        <KPI v={late} l="late-risk jobs" c={C.amber} />
        <KPI v={overCells} l="over-capacity dept-weeks" c={overCells ? C.red : C.green} />
      </div>

      <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, padding: 12, overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 150 + period * 62 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "6px 10px", fontSize: 10.5, letterSpacing: 1, color: C.dim }}>DEPARTMENT</th>
              <th style={{ textAlign: "right", padding: "6px 6px", fontSize: 10, color: C.dim }}>CAP</th>
              {Array.from({ length: period }, (_, i) => {
                const on = selWk && selWk.week === i;
                return (
                  <th key={i} onClick={() => setSelWk(sw => sw && sw.week === i && !sw.dept ? null : { week: i, dept: null })}
                      style={{ padding: "4px 2px", cursor: "pointer" }}>
                    <span style={{ display: "inline-block", padding: "3px 6px", borderRadius: 6, fontSize: 10.5,
                                   background: on ? C.navy : "transparent", color: on ? "#fff" : i === 0 ? C.navy : C.dim,
                                   fontWeight: on || i === 0 ? 800 : 600 }}>
                      {i === 0 ? "NOW" : wkLabel(i)}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {DEPT_ROWS.map(([z, name]) => {
              const st = stats[z];
              return (
                <tr key={z} style={{ borderTop: `1px solid ${C.line}` }}>
                  <td style={{ padding: "7px 10px", whiteSpace: "nowrap" }}>
                    <button onClick={() => setSelDept(d => d === z ? null : z)}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 0,
                               fontSize: 12, fontWeight: 800, color: selDept === z ? C.gold : C.navy,
                               textDecoration: "underline", textUnderlineOffset: 3, textDecorationColor: "#C9D2DE" }}>
                      {name}
                    </button>
                  </td>
                  <td style={{ padding: "7px 6px", fontSize: 10.5, fontFamily: MONO, color: C.dim, textAlign: "right" }}>{DEPT_CAP[z]}h</td>
                  {Array.from({ length: period }, (_, i) => {
                    const hrs = load[z][i];
                    const pct = Math.round((hrs / DEPT_CAP[z]) * 100);
                    const selCell = selWk && selWk.week === i && selWk.dept === z;
                    const frozen = i === 0 && blocked[z] > 0;
                    return (
                      <td key={i}
                          onClick={() => setSelWk(sw => sw && sw.week === i && sw.dept === z ? null : { week: i, dept: z })}
                          title={`${name} · ${Math.round(hrs)}h of ${DEPT_CAP[z]}h${frozen ? ` · +${Math.round(blocked[z])}h frozen by holds` : ""} · tap for detail`}
                          style={{ ...cellPct(pct), textAlign: "center", fontFamily: MONO, fontSize: 11,
                                   padding: frozen ? "4px 3px" : "8px 3px", borderLeft: "1px solid #EDEFF3", cursor: "pointer",
                                   boxShadow: selCell ? `inset 0 0 0 2.5px ${C.navy}` : "none" }}>
                        {pct === 0 && !frozen ? "·" : pct + "%"}
                        {frozen && <div style={{ fontSize: 9, fontWeight: 800, color: "#8A2A1E" }}>⛔{Math.round(blocked[z])}h</div>}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* breakdown panel (week / cell) */}
        {selWk && selWk.week < period && (() => {
          const rows = detail
            .filter(d => d.week === selWk.week && (!selWk.dept || d.zone === selWk.dept))
            .sort((a, b) => (a.src === "blocked" ? -1 : b.src === "blocked" ? 1 : b.hrs - a.hrs));
          const tot = rows.reduce((a, r) => a + r.hrs, 0);
          const deptName = selWk.dept ? DEPT_ROWS.find(([z]) => z === selWk.dept)?.[1] : null;
          return (
            <div style={{ marginTop: 12, border: `2px solid ${C.navy}`, borderRadius: 10, overflow: "hidden", background: "#fff" }}>
              <div style={{ background: C.navy, color: "#fff", padding: "8px 14px", display: "flex", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
                <span style={{ fontWeight: 800, fontSize: 13 }}>
                  WK {selWk.week + 1} · {selWk.week === 0 ? "THIS WEEK" : "WK OF " + wkLabel(selWk.week).toUpperCase()}{deptName ? " · " + deptName.toUpperCase() : ""}
                </span>
                <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 12 }}>{rows.length} item{rows.length === 1 ? "" : "s"} · {Math.round(tot)}h</span>
                <button onClick={() => setSelWk(null)} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: 15 }}>✕</button>
              </div>
              {selWk.dept && (() => {
                const st = stats[selWk.dept] || {};
                const zb = ZONES.find(z => z.id === selWk.dept);
                const frz = Math.round(blocked[selWk.dept] || 0);
                return (
                  <div style={{ display: "flex", gap: 14, flexWrap: "wrap", padding: "7px 14px", background: "#F2F5F9",
                                borderBottom: `1px solid ${C.line}`, fontSize: 11, fontWeight: 700 }}>
                    <span>WIP <b style={{ fontFamily: MONO }}>{st.wip || 0}</b>{zb?.cap ? ` / band ${zb.cap[0]}–${zb.cap[1]}` : ""}</span>
                    <span style={{ color: st.holds ? C.red : C.dim }}>⛔ {st.holds || 0} hold{st.holds === 1 ? "" : "s"}{st.ncrs ? ` (${st.ncrs} NCR)` : ""}</span>
                    <span style={{ color: st.qa ? C.amber : C.dim }}>★ {st.qa || 0} QA pending</span>
                    <span style={{ color: st.late ? C.amber : C.dim }}>⚠ {st.late || 0} late risk</span>
                    <span style={{ color: frz ? C.red : C.dim }}>❄ {frz}h frozen</span>
                  </div>
                );
              })()}
              <div style={{ maxHeight: 320, overflowY: "auto", padding: "8px 12px" }}>
                {rows.map((r, i) => {
                  const pp = PARTS[r.part];
                  const dn = DEPT_ROWS.find(([z]) => z === r.zone)?.[1] || r.zone;
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 4px", flexWrap: "wrap",
                                          borderBottom: i < rows.length - 1 ? `1px solid ${C.line}` : "none",
                                          background: r.src === "blocked" ? "#FBEDEA" : "transparent", borderRadius: 6 }}>
                      {!selWk.dept && <span style={{ fontSize: 10, fontWeight: 800, color: C.navy, background: "#EDF1F7", border: `1px solid ${C.line}`, borderRadius: 5, padding: "2px 7px" }}>{dn}</span>}
                      <span style={{ fontFamily: MONO, fontWeight: 800, fontSize: 12.5, color: C.navy }}>SO {r.so}</span>
                      <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: pp.color }}>{r.part}</span>
                      <span style={{ fontSize: 11.5 }}><b>OP {r.op}</b> · {r.title}</span>
                      <span style={{ fontSize: 10.5, color: C.dim, whiteSpace: "nowrap" }}>{pp.desc} · Qty {r.qty}</span>
                      <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 8 }}>
                        {r.src === "blocked"
                          ? <span style={{ fontSize: 9.5, fontWeight: 800, color: "#5E170D", background: "#E9A79B", borderRadius: 5, padding: "2px 7px" }}>⛔ BLOCKED — HOLD{r.job ? " · " + r.job : ""}</span>
                          : r.src === "floor"
                          ? <span style={{ fontSize: 9.5, fontWeight: 800, color: "#2F6B4A", background: "#E7F2EA", border: "1px solid #C9D8C4", borderRadius: 5, padding: "2px 7px" }}>ON FLOOR{r.job ? " · " + r.job : ""}</span>
                          : <span style={{ fontSize: 9.5, fontWeight: 800, color: "#8A6A16", background: "#FBF3E2", border: "1px solid #DDD3B8", borderRadius: 5, padding: "2px 7px" }}>PLANNED — HOPPER</span>}
                        <span style={{ fontFamily: MONO, fontSize: 12.5, fontWeight: 800, color: C.navy, minWidth: 46, textAlign: "right" }}>{r.hrs.toFixed(1)}h</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* department panel */}
        {selDept && (() => {
          const name = DEPT_ROWS.find(([z]) => z === selDept)?.[1];
          const here = act.filter(j => zoneNow(j) === selDept);
          const arriving = detail
            .filter(d => d.zone === selDept && d.week > 0 && d.week <= 2 && d.src !== "blocked")
            .sort((a, b) => a.week - b.week || b.hrs - a.hrs).slice(0, 8);
          return (
            <div style={{ marginTop: 12, border: `2px solid ${C.gold}`, borderRadius: 10, overflow: "hidden", background: "#fff" }}>
              <div style={{ background: "#FFF9EC", borderBottom: `1.5px solid ${C.gold}`, padding: "8px 14px",
                            display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
                <span style={{ fontWeight: 800, fontSize: 13, color: "#8A6A16" }}>{name.toUpperCase()} — DEPARTMENT STATUS</span>
                <span style={{ fontSize: 11, color: C.dim }}>{here.length} traveler{here.length === 1 ? "" : "s"} here now</span>
                <button onClick={() => setSelDept(null)} style={{ marginLeft: "auto", background: "none", border: "none", color: C.dim, cursor: "pointer", fontSize: 15 }}>✕</button>
              </div>
              <div style={{ padding: "8px 14px" }}>
                {here.length === 0 && <div style={{ fontSize: 12, color: C.dim }}>No travelers at this work center right now.</div>}
                {here.map(j => {
                  const op = PARTS[j.part].ops[j.cur];
                  const rem = PARTS[j.part].ops.slice(j.cur).reduce((a, o) => a + opHrs(o, j.qty), 0);
                  const isLate = j.status !== "hold" && Math.max(0, Math.ceil(rem / WEEK_BUDGET) - 1) > dueWk(j.due);
                  return (
                    <div key={j.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 2px", flexWrap: "wrap", borderBottom: `1px solid ${C.line}` }}>
                      <span style={{ fontFamily: MONO, fontWeight: 800, fontSize: 12.5, color: C.navy }}>SO {j.so}</span>
                      <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: PARTS[j.part].color }}>{j.part}</span>
                      <span style={{ fontFamily: MONO, fontSize: 11, color: C.dim }}>{j.id}</span>
                      <span style={{ fontSize: 11.5 }}><b>OP {op.op}{op.qa ? " ★" : ""}</b> · {op.title}</span>
                      <span style={{ fontSize: 10.5, color: C.dim }}>{j.operator ? `Operator: ${j.operator}` : "Queued"}</span>
                      <span style={{ marginLeft: "auto", display: "inline-flex", gap: 6, alignItems: "center" }}>
                        {j.status === "hold" && <span style={{ fontSize: 9.5, fontWeight: 800, color: "#fff", background: C.red, borderRadius: 5, padding: "2px 7px" }}>⛔ {j.holdReason}</span>}
                        {isLate && <span style={{ fontSize: 9.5, fontWeight: 800, color: "#8A6A16", background: "#FBF3E2", border: "1px solid #DDD3B8", borderRadius: 5, padding: "2px 7px" }}>⚠ LATE RISK</span>}
                        <span style={{ fontFamily: MONO, fontSize: 10.5, color: C.dim }}>Due {j.due}</span>
                      </span>
                    </div>
                  );
                })}
                {arriving.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: 10, letterSpacing: 1, fontWeight: 800, color: C.dim, marginBottom: 4 }}>ARRIVING — NEXT 2 WEEKS</div>
                    {arriving.map((r, i) => (
                      <div key={i} style={{ fontSize: 11, color: C.text, padding: "2px 0", display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontFamily: MONO, color: C.dim }}>WK {r.week + 1}</span>
                        <span style={{ fontFamily: MONO, fontWeight: 800, color: C.navy }}>SO {r.so}</span>
                        <span style={{ fontFamily: MONO, fontWeight: 700, color: PARTS[r.part].color }}>{r.part}</span>
                        <span>OP {r.op} · {r.title}</span>
                        <span style={{ marginLeft: "auto", fontFamily: MONO, color: C.dim }}>{r.hrs.toFixed(1)}h · {r.src === "floor" ? "on floor" : "planned"}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        <div style={{ fontSize: 10.5, color: C.dim, marginTop: 10, lineHeight: 1.55 }}>
          Held jobs do not progress: their remaining hours show as ⛔ frozen at their current department and are excluded from
          forward weeks. Tap any % cell to expand its status pane — WIP, holds/NCRs, QA-pending, late risk, frozen hours —
          plus the work behind the number. Tap a department name for its full live roster. Planned hopper load is included.
        </div>
      </div>
    </div>
  );
}

/* ---------------------- RELEASE MODAL (whole / partial kit) ---------------------- */
function ReleaseModal({ order, hop, kits, onClose, onCreate }) {
  const [mode, setMode] = useState("whole");
  const [picked, setPicked] = useState([]);
  const all = treeParts(order.part);
  const remaining = hop.remaining;
  const issuedAs = (part) => kits.find(k => k.so === order.so && k.parts.includes(part))?.id || null;
  const sel = mode === "whole" ? remaining : picked.filter(x => remaining.includes(x));
  const label = (hop.splits === 0 && mode === "whole" && remaining.length === all.length)
    ? order.so
    : `${order.so}-0${hop.splits + 1}`;

  const Row = ({ node, depth }) => {
    const inRem = remaining.includes(node.part);
    const done = issuedAs(node.part);
    const on = mode === "whole" ? inRem : sel.includes(node.part);
    const pp = PARTS[node.part];
    return (
      <>
        <div onClick={() => { if (mode === "partial" && inRem)
               setPicked(pk => pk.includes(node.part) ? pk.filter(x => x !== node.part) : [...pk, node.part]); }}
             style={{ display: "flex", alignItems: "center", gap: 9, padding: "7px 8px", marginLeft: depth * 22,
                      borderRadius: 7, marginBottom: 4, cursor: mode === "partial" && inRem ? "pointer" : "default",
                      background: on ? "#EAF1F9" : done ? "#EFF6F0" : "#F5F6F8",
                      border: `1.5px solid ${on ? C.blue : done ? "#C9D8C4" : C.line}`,
                      opacity: !inRem && !done ? 0.5 : 1 }}>
          <span style={{ width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                         border: `2px solid ${done ? "#2F8F5B" : on ? C.blue : "#A6B0BD"}`,
                         background: done ? "#2F8F5B" : on ? C.blue : "#fff",
                         color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center",
                         fontSize: 12, fontWeight: 900 }}>{(done || on) ? "✓" : ""}</span>
          <span style={{ fontFamily: MONO, fontWeight: 800, fontSize: 12.5, color: pp.color }}>{node.part}</span>
          <span style={{ fontSize: 11.5, color: C.text }}>{pp.desc}</span>
          <span style={{ fontSize: 10, color: C.dim }}>· {(ITEMS[node.part] || []).length} BOM lines</span>
          {done && <span style={{ marginLeft: "auto", fontSize: 9.5, fontWeight: 800, color: "#2F6B4A",
                                  background: "#E7F2EA", border: "1px solid #C9D8C4", borderRadius: 5, padding: "2px 7px" }}>
            ISSUED · SO {done}</span>}
        </div>
        {node.children.map(c => <Row key={c.part} node={c} depth={depth + 1} />)}
      </>
    );
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(16,26,40,.58)",
                                    display: "flex", alignItems: "center", justifyContent: "center", padding: 14 }}>
      <div onClick={e => e.stopPropagation()}
           style={{ width: "min(560px, 96vw)", maxHeight: "88vh", overflowY: "auto", background: "#fff",
                    borderRadius: 12, boxShadow: "0 24px 70px rgba(0,0,0,.45)" }}>
        <div style={{ background: C.navy, color: "#fff", padding: "10px 16px", display: "flex", alignItems: "baseline", gap: 10 }}>
          <span style={{ fontWeight: 800, fontSize: 14 }}>RELEASE KIT — SO {order.so}</span>
          <span style={{ fontSize: 11, opacity: 0.8 }}>{order.config} · Qty {order.qty} · WK {hop.week + 1} ({wkLabel(hop.week)})</span>
          <button onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: 16 }}>✕</button>
        </div>

        <div style={{ display: "flex", gap: 8, padding: "12px 16px 4px 16px" }}>
          {[["whole", `Whole kit — everything remaining (${remaining.length})`], ["partial", "Break partial — pick assemblies"]].map(([m, l]) => (
            <button key={m} onClick={() => setMode(m)}
              style={{ flex: 1, padding: "10px 6px", borderRadius: 8, fontSize: 12, fontWeight: 800, cursor: "pointer",
                       border: `2px solid ${mode === m ? C.navy : C.line}`,
                       background: mode === m ? C.navy : "#fff", color: mode === m ? "#fff" : C.navy }}>{l}</button>
          ))}
        </div>
        {mode === "partial" && (
          <div style={{ padding: "4px 16px 0 16px", fontSize: 11, color: C.dim }}>
            Sometimes only part of the hardware shows up first — issue what you have; the rest stays in the hopper unassigned.
          </div>
        )}

        <div style={{ padding: "10px 16px 4px 16px" }}>
          <div style={{ fontSize: 10, letterSpacing: 1.2, fontWeight: 800, color: C.dim, marginBottom: 6 }}>
            FAMILY TREE — {order.part}
          </div>
          <Row node={buildTree(order.part)} depth={0} />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px 14px 16px",
                      borderTop: `1px solid ${C.line}`, marginTop: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12 }}>
            Will issue as <b style={{ fontFamily: MONO, color: C.navy }}>SO {label}</b> · {sel.length} assembly kit{sel.length === 1 ? "" : "s"}
            {label !== order.so && <span style={{ color: "#8A6A16", fontWeight: 700 }}> · partial #{hop.splits + 1}</span>}
          </span>
          <button disabled={sel.length === 0}
            onClick={() => onCreate(sel, label)}
            style={{ marginLeft: "auto", padding: "11px 18px", borderRadius: 9, border: "none", fontSize: 13, fontWeight: 800,
                     cursor: sel.length ? "pointer" : "not-allowed",
                     background: sel.length ? C.green : "#C9CFD8", color: "#fff" }}>
            Create kit ticket → Kitting
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------------- KITTING ---------------------- */
function KittingView({ plan, setPlan }) {
  const [draft, setDraft] = useState({});
  const [cardKit, setCardKit] = useState(null);
  const get = (k) => draft[k.id] || { qty: k.qty, note: "", kitter: "" };
  const upd = (id, patch) => setDraft(d => ({ ...d, [id]: { ...(d[id] || {}), ...patch } }));
  const issue = (k) => {
    const dr = get(k);
    const rec = { ...k, status: "issued", issuedQty: dr.qty ?? k.qty, note: dr.note || "", kitter: dr.kitter.trim(),
                  ts: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) };
    setPlan(p => ({ ...p, kits: p.kits.map(x => x.id === k.id ? rec : x) }));
    setCardKit(rec); // kit card pops immediately on issue
  };
  const weeks = [...new Set(plan.kits.map(k => k.week))].sort((a, b) => a - b);
  const awaiting = plan.hopper.filter(h => (h.remaining || []).length > 0);

  const BomBlock = ({ part, qty }) => (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: C.navy }}>
        <span style={{ fontFamily: MONO, color: PARTS[part].color }}>{part}</span> — {PARTS[part].desc}
        <span style={{ color: C.dim, fontWeight: 600 }}> · kit for qty {qty}</span>
      </div>
      {(ITEMS[part] || []).map(it => (
        <div key={it[0]} style={{ display: "flex", gap: 8, fontSize: 10.5, fontFamily: MONO, color: "#4A5462",
                                  padding: "2px 0 2px 14px" }}>
          <span style={{ width: 86, fontWeight: 700 }}>{it[0]}</span>
          <span style={{ flex: 1 }}>{it[1]}</span>
          <span style={{ width: 54, textAlign: "right", color: C.dim }}>{it[2]}/EA</span>
          <span style={{ width: 66, textAlign: "right", fontWeight: 800, color: C.navy }}>
            {it[2] === "AR" ? "AR" : `${parseInt(it[2]) * qty} EA`}
          </span>
          {it[3] && <span style={{ color: C.amber, fontWeight: 800 }}>{it[3]}</span>}
        </div>
      ))}
    </div>
  );

  return (
    <div style={{ maxWidth: 1160, margin: "0 auto", padding: "0 18px 60px 18px" }}>
      <Badge n={1} title="KITTING — RELEASE QUEUE"
        right={<span style={{ fontSize: 11.5, color: C.dim }}>{plan.kits.filter(k => k.status === "due").length} due · {plan.kits.filter(k => k.status === "issued").length} issued</span>} />

      {plan.kits.length === 0 && (
        <div style={{ background: C.panel, border: `1.5px dashed ${C.line}`, borderRadius: 10, padding: "22px 18px",
                      fontSize: 12.5, color: C.dim, textAlign: "center" }}>
          No kit tickets yet. In <b>Planning</b>, tap <b>⇧ Release kit…</b> on a hopper card — whole kit or partial —
          and tickets land here for the kitter, grouped by week.
        </div>
      )}

      {weeks.map(w => (
        <div key={w} style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: w === 0 ? C.navy : C.dim, letterSpacing: 1, margin: "10px 0 8px 0" }}>
            WK {w + 1} · {wkLabel(w)}{w === 0 ? " — THIS WEEK" : ""}
          </div>
          {plan.kits.filter(k => k.week === w).map(k => {
            const dr = get(k);
            const issued = k.status === "issued";
            return (
              <div key={k.id} style={{ background: C.panel, border: `1px solid ${C.line}`,
                                       borderLeft: `5px solid ${issued ? C.green : PARTS[k.part].color}`,
                                       borderRadius: 10, padding: "12px 14px", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ fontFamily: MONO, fontWeight: 800, fontSize: 16, color: C.navy }}>
                    SO {k.id.includes("-") ? <>{k.so}<span style={{ color: C.amber }}>{k.id.slice(k.so.length)}</span></> : k.id}
                  </span>
                  <span style={{ fontSize: 12.5, fontWeight: 700 }}>{k.config}</span>
                  <span style={{ fontFamily: MONO, fontSize: 11.5, color: C.dim }}>Qty {k.qty} · Due {k.due}</span>
                  {k.id.includes("-") && <span style={{ fontSize: 9.5, fontWeight: 800, color: "#8A6A16", background: "#FBF3E2",
                                                        border: "1px solid #DDD3B8", borderRadius: 5, padding: "2px 7px" }}>PARTIAL KIT</span>}
                  {issued && (
                    <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 10.5, fontWeight: 800, color: "#2F6B4A" }}>
                        ✓ ISSUED — {k.issuedQty} of {k.qty} · {k.kitter} · {k.ts}
                      </span>
                      <button onClick={() => setCardKit(k)}
                        style={{ fontSize: 10.5, fontWeight: 800, border: `1.5px solid ${C.navy}`, background: "#fff",
                                 color: C.navy, borderRadius: 6, padding: "4px 9px", cursor: "pointer" }}>
                        ⌸ Kit Card (QR)
                      </button>
                    </span>
                  )}
                </div>

                <div style={{ margin: "8px 0 4px 0", padding: "8px 10px", background: "#F7F8FA",
                              border: `1px solid ${C.line}`, borderRadius: 8 }}>
                  <div style={{ fontSize: 9.5, letterSpacing: 1.2, fontWeight: 800, color: C.dim, marginBottom: 6 }}>
                    BOM TO KIT — {k.parts.length} ASSEMBL{k.parts.length === 1 ? "Y" : "IES"}
                  </div>
                  {k.parts.map(pt => <BomBlock key={pt} part={pt} qty={k.qty} />)}
                </div>

                {issued ? (
                  k.note && <div style={{ fontSize: 11.5, color: C.dim, fontStyle: "italic" }}>Note: {k.note}</div>
                ) : (
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap", marginTop: 6 }}>
                    <div style={{ width: 150 }}>
                      <Field label="Released qty"><NumInput val={dr.qty} set={v => upd(k.id, { qty: v })} max={k.qty} /></Field>
                    </div>
                    <div style={{ flex: 1, minWidth: 180 }}>
                      <Field label="Kitting note">
                        <input value={dr.note} onChange={e => upd(k.id, { note: e.target.value })}
                               placeholder="e.g. shorted 2 EA MAG-3122 — backorder" style={inputStyle} />
                      </Field>
                    </div>
                    <div style={{ width: 120 }}>
                      <Field label="Kitter">
                        <input value={dr.kitter} onChange={e => upd(k.id, { kitter: e.target.value })}
                               placeholder="e.g. K.O." style={inputStyle} maxLength={10} />
                      </Field>
                    </div>
                    <button disabled={(dr.kitter || "").trim().length < 2}
                      onClick={() => issue(k)}
                      style={{ padding: "13px 16px", borderRadius: 9, border: "none", fontSize: 12.5, fontWeight: 800,
                               cursor: (dr.kitter || "").trim().length >= 2 ? "pointer" : "not-allowed",
                               background: (dr.kitter || "").trim().length >= 2 ? C.green : "#C9CFD8", color: "#fff" }}>
                      ✓ SIGN &amp; ISSUE KIT
                    </button>
                  </div>
                )}
                {issued && (
                  <div style={{ fontSize: 10, color: C.dim, marginTop: 4 }}>
                    Kit card generated — ⌸ to view or print. In production, issuing also opens the traveler(s) at OP 10.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}

      {awaiting.length > 0 && (
        <>
          <div style={{ fontSize: 10.5, letterSpacing: 1.2, fontWeight: 800, color: C.dim, margin: "16px 0 8px 0" }}>
            AWAITING RELEASE FROM PLANNING ({awaiting.length})
          </div>
          {awaiting.map(h => {
            const o = [...SOS, ...plan.orders].find(x => x.so === h.so);
            if (!o) return null;
            return (
              <div key={h.so} style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap",
                                       background: "#F5F6F8", border: `1px dashed ${C.line}`, borderRadius: 8,
                                       padding: "8px 12px", marginBottom: 6, opacity: 0.85, fontSize: 12 }}>
                <span style={{ fontFamily: MONO, fontWeight: 800, color: C.navy }}>SO {h.so}</span>
                <span>{o.config}</span>
                <span style={{ fontFamily: MONO, fontSize: 11, color: C.dim }}>WK {h.week + 1} · {wkLabel(h.week)}</span>
                <span style={{ marginLeft: "auto", fontSize: 10.5, color: C.dim }}>
                  {h.remaining.length} assembl{h.remaining.length === 1 ? "y" : "ies"} unassigned — release from Planning
                </span>
              </div>
            );
          })}
        </>
      )}

      {cardKit && <KitCardModal kit={cardKit} onClose={() => setCardKit(null)} />}
    </div>
  );
}

/* ---------------------- SALES ORDERS ---------------------- */
function SOListView({ jobs, openSO }) {
  return (
    <div style={{ maxWidth: 1160, margin: "0 auto", padding: "0 18px 60px 18px" }}>
      <Badge n={1} title="OPEN SALES ORDERS"
        right={<span style={{ fontSize: 11.5, color: C.dim }}>Tap an order to open its family tree</span>} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(258px, 1fr))", gap: 12 }}>
        {SOS.map(s => {
          const p = PARTS[s.part];
          const sum = soSummary(s.so, jobs);
          return (
            <button key={s.so} onClick={() => openSO(s.so)}
              style={{ textAlign: "left", background: C.panel, border: `1px solid ${C.line}`,
                       borderLeft: `5px solid ${sum.holds ? C.red : sum.released ? p.color : "#B8C0CC"}`,
                       borderRadius: 9, padding: "12px 14px", cursor: "pointer", color: C.text,
                       boxShadow: "0 1px 8px rgba(31,58,95,.08)", opacity: sum.released ? 1 : 0.68 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontFamily: MONO, fontWeight: 800, fontSize: 17, color: C.navy }}>SO {s.so}</span>
                <span style={{ fontFamily: MONO, fontSize: 12, color: C.dim }}>Due {s.due}</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, marginTop: 3 }}>{s.config}</div>
              <div style={{ fontFamily: MONO, fontSize: 12, color: p.color, marginTop: 2 }}>{s.part} <span style={{ color: C.dim }}>Rev {p.rev} · Qty {s.qty}</span></div>
              {sum.released ? (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                    <div style={{ flex: 1, height: 6, background: "#E4E7EC", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ width: sum.pct + "%", height: "100%", background: sum.holds ? C.red : C.green }} />
                    </div>
                    <span style={{ fontFamily: MONO, fontSize: 11.5, fontWeight: 700 }}>{sum.pct}%</span>
                  </div>
                  <div style={{ fontSize: 11.5, marginTop: 5, color: sum.holds ? C.red : C.dim, fontWeight: sum.holds ? 700 : 500 }}>
                    {sum.active} traveler{sum.active === 1 ? "" : "s"} on floor{sum.holds ? ` · ${sum.holds} ON HOLD` : ""}{sum.done ? ` · ${sum.done} complete` : ""}
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 11.5, marginTop: 8, color: "#8A93A0", fontWeight: 600 }}>Scheduled — not released to floor</div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------------- SPAGHETTI CHART ---------------------- */
function SpaghettiChart({ meta, soJobs }) {
  const anchorOf = (zid) => ZONES.find(z => z.id === zid)?.anchor;
  const routes = (soJobs.length ? soJobs : [{ id: "PLANNED ROUTE", part: meta.part, cur: -1, status: "planned" }])
    .map((j, idx, arr) => {
      const ops = PARTS[j.part].ops;
      const off = (idx - (arr.length - 1) / 2) * 10;
      const pts = ops.map(o => {
        const a = anchorOf(o.zone);
        return a ? [a[0] + off, a[1] + off * 0.35] : null;
      });
      return { j, ops, pts, color: PARTS[j.part].color };
    });
  const seg = (pts, a, b) => pts.slice(a, b + 1).filter(Boolean).map(pt => pt.join(",")).join(" ");

  return (
    <div>
      <svg viewBox="60 15 1450 800" style={{ width: "100%", height: "auto", display: "block" }}>
        <rect x={60} y={15} width={1450} height={800} fill="#F4F5F7" />
        <rect x={115} y={22} width={1390} height={780} fill="#EBECEE" stroke="#5A6472" strokeWidth={4} />
        {ZONES.map(z => (
          z.poly
            ? <polygon key={z.id} points={z.poly} fill={z.fill} opacity={0.5} stroke="#9AA6B5" strokeWidth={1.4}
                       strokeDasharray={z.dashed ? "6 5" : "none"} />
            : <rect key={z.id} x={z.x} y={z.y} width={z.w} height={z.h} rx={2} fill={z.fill} opacity={0.5}
                    stroke="#9AA6B5" strokeWidth={1.4} strokeDasharray={z.dashed ? "6 5" : "none"} />
        ))}
        {ZONES.map(z => {
          if (!z.label) return null;
          const lx = z.poly ? z.lx : z.center ? z.x + z.w / 2 : z.x + 10;
          const ly = z.ly ?? (z.poly ? z.ly : z.y + 22);
          const common = { fontSize: z.small ? 9.5 : 11, fill: "#59636F", fontFamily: SANS, fontWeight: 800,
                           textAnchor: z.center ? "middle" : "start", letterSpacing: 0.5,
                           stroke: "#FFFFFF", strokeWidth: 3.5, paintOrder: "stroke", strokeLinejoin: "round" };
          return (
            <g key={"sl" + z.id} pointerEvents="none">
              <text x={lx} y={ly} {...common}>{z.label}</text>
              {z.label2 && <text x={lx} y={ly + 12} {...common}>{z.label2}</text>}
            </g>
          );
        })}
        {routes.map(({ j, ops, pts, color }) => {
          const cur = j.cur;
          const last = pts.length - 1;
          const doneEnd = Math.min(Math.max(cur, 0), last);
          return (
            <g key={j.id}>
              {cur >= 0 && (
                <polyline points={seg(pts, 0, doneEnd)} fill="none" stroke={color} strokeWidth={4}
                          strokeLinejoin="round" strokeLinecap="round" opacity={0.95} />
              )}
              <polyline points={seg(pts, doneEnd, last)} fill="none" stroke={color} strokeWidth={2.5}
                        strokeLinejoin="round" strokeLinecap="round" strokeDasharray="8 7"
                        opacity={cur >= 0 ? 0.45 : 0.55} />
              {pts.map((pt, i) => pt && (
                <circle key={i} cx={pt[0]} cy={pt[1]} r={i === 0 || i === last ? 6 : 4.2}
                        fill={i <= cur ? color : "#FFFFFF"} stroke={color} strokeWidth={1.8}
                        opacity={i <= cur || cur < 0 ? 0.95 : 0.5} />
              ))}
              {cur >= 0 && cur <= last && pts[cur] && (
                <g>
                  <circle cx={pts[cur][0]} cy={pts[cur][1]} r={9} fill="none" stroke={color} strokeWidth={2.5}>
                    <animate attributeName="r" values="7;12;7" dur="1.8s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="1;0.25;1" dur="1.8s" repeatCount="indefinite" />
                  </circle>
                  <rect x={pts[cur][0] - 40} y={pts[cur][1] - 30} width={80} height={17} rx={8.5}
                        fill="#14243A" stroke={color} strokeWidth={1.5} />
                  <text x={pts[cur][0]} y={pts[cur][1] - 18} fontSize={10} fontFamily={MONO} fontWeight={700}
                        fill="#fff" textAnchor="middle">{j.id}</text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
      <div style={{ padding: "10px 14px 4px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
        {routes.map(({ j, ops, color }) => {
          const cur = j.cur;
          const at = cur >= 0 && cur < ops.length ? ops[cur] : null;
          return (
            <div key={j.id} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 11.5, flexWrap: "wrap" }}>
              <span style={{ width: 26, height: 0, borderTop: `4px solid ${color}`, borderRadius: 2 }} />
              <span style={{ fontFamily: MONO, fontWeight: 800, color: C.navy }}>{j.id}</span>
              <span style={{ fontFamily: MONO, color }}>{j.part}</span>
              <span style={{ color: "#59636F" }}>
                {cur < 0 ? `planned route · ${ops.length} stops, released at kitting`
                  : j.status === "complete" ? `complete — full path through ${ops.length} stops`
                  : <>at <b>OP {at.op} · {at.title}</b> — {cur} of {ops.length} stops traveled, {ops.length - cur - 1} ahead (dashed)</>}
              </span>
            </div>
          );
        })}
        <div style={{ fontSize: 10, color: "#8A93A0", marginTop: 2 }}>
          Path derived from routing: each operation's work center in traveler sequence. Solid = traveled · dashed = remaining · dots = routing stops.
        </div>
      </div>
    </div>
  );
}

/* ---------------------- SO FAMILY TREE (drawing format) ---------------------- */
function SOTreeView({ so, jobs, back, openTraveler }) {
  const [mode, setMode] = useState("tree");
  const meta = SOS.find(s => s.so === so);
  if (!meta) return null;
  const top = PARTS[meta.part];
  const tree = buildTree(meta.part);
  const soJobs = jobs.filter(j => j.so === so);
  const jobFor = (part) => soJobs.find(j => j.part === part);
  const sum = soSummary(so, jobs);
  const conn = "2px solid #8FA3BC";

  const NodeBox = ({ part }) => {
    const pp = PARTS[part];
    const j = jobFor(part);
    const items = ITEMS[part] || [];
    const state = !j ? "idle" : j.status === "complete" ? "done" : j.status === "hold" ? "hold" : "active";
    const op = j && j.status !== "complete" ? pp.ops[j.cur] : null;
    const chip = {
      active: { bg: "#E8F0FA", tx: "#1D5C9E", label: `${j?.id} · OP ${op?.op}${op?.qa ? " ★" : ""} · ${op?.title}` },
      hold:   { bg: "#F9E7E3", tx: C.red,     label: `${j?.id} · ON HOLD — ${j?.holdReason || "NCR"}` },
      done:   { bg: "#E7F2EA", tx: C.green,   label: `${j?.id} · ✓ COMPLETE — STOCK` },
      idle:   { bg: "#EFF1F4", tx: "#8A93A0", label: "NOT RELEASED" },
    }[state];
    return (
      <button onClick={j ? () => openTraveler(j.id) : undefined} disabled={!j}
        style={{ width: 218, background: "#FFFFFF", textAlign: "center", padding: 0, overflow: "hidden",
                 border: state === "idle" ? "1.5px solid #A6B4C6" : `2.5px solid ${C.navy}`,
                 borderRadius: 4, cursor: j ? "pointer" : "default",
                 opacity: state === "idle" ? 0.4 : 1, filter: state === "idle" ? "grayscale(.55)" : "none",
                 boxShadow: state === "idle" ? "none" : "0 2px 10px rgba(31,58,95,.18)" }}>
        <div style={{ padding: "8px 10px 5px 10px" }}>
          <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 15, color: "#1D5C9E", letterSpacing: 0.5 }}>{part}</div>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.5, color: "#3C424A", marginTop: 1 }}>{pp.desc.toUpperCase()}</div>
          <div style={{ fontFamily: MONO, fontSize: 9.5, fontWeight: 700, color: "#3C424A", marginTop: 2 }}>QTY: 1</div>
        </div>
        <div style={{ background: chip.bg, color: chip.tx, fontFamily: MONO, fontSize: 9, fontWeight: 800,
                      padding: "4px 6px", borderTop: "1px solid #C9D2DE", borderBottom: "1px solid #C9D2DE",
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {chip.label}
        </div>
        <div style={{ textAlign: "left", padding: "6px 8px 8px 12px" }}>
          {items.map(it => (
            <div key={it[0]} style={{ fontFamily: MONO, fontSize: 9, color: "#59636F", lineHeight: 1.55, whiteSpace: "nowrap" }}>
              ├ {it[0]} {it[1]} ({it[2]}) {it[3] ? <span style={{ color: C.amber }}>{it[3]}</span> : null}
            </div>
          ))}
        </div>
      </button>
    );
  };

  const TreeNode = ({ node, first, last, root }) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, minWidth: 236, padding: "0 6px" }}>
      {!root && (
        <>
          <div style={{ display: "flex", width: "100%", height: 0 }}>
            <div style={{ flex: 1, borderTop: first ? "none" : conn }} />
            <div style={{ flex: 1, borderTop: last ? "none" : conn }} />
          </div>
          <div style={{ height: 20, borderLeft: conn }} />
        </>
      )}
      <NodeBox part={node.part} />
      {node.children.length > 0 && (
        <>
          <div style={{ height: 20, borderLeft: conn }} />
          <div style={{ display: "flex", width: "100%" }}>
            {node.children.map((c, i) => (
              <TreeNode key={c.part} node={c} first={i === 0} last={i === node.children.length - 1} />
            ))}
          </div>
        </>
      )}
    </div>
  );

  const tbCell = { padding: "3px 8px", borderBottom: "1px solid #C9D2DE", fontSize: 9 };
  return (
    <div style={{ maxWidth: 1160, margin: "0 auto", padding: "16px 18px 60px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
        <button onClick={back} style={btnGhost}>← Sales Orders</button>
        <div style={{ display: "flex", border: "1.5px solid #C4CBD6", borderRadius: 7, overflow: "hidden" }}>
          {[["tree", "⌥ Family Tree"], ["spaghetti", "〰 Spaghetti Chart"]].map(([m, l]) => (
            <button key={m} onClick={() => setMode(m)}
              style={{ border: "none", padding: "8px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer",
                       background: mode === m ? C.navy : "#FFFFFF", color: mode === m ? "#fff" : C.navy }}>
              {l}
            </button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        {sum.holds > 0 && <span style={{ color: C.red, fontSize: 12.5, fontWeight: 800 }}>■ {sum.holds} TRAVELER{sum.holds > 1 ? "S" : ""} ON HOLD</span>}
      </div>

      {/* drawing sheet */}
      <div style={{ background: "#FFFFFF", border: "1.5px solid #9AA6B5", boxShadow: "0 4px 22px rgba(31,58,95,.12)" }}>
        {/* title block */}
        <div style={{ display: "flex", borderBottom: "2px solid #26364A", alignItems: "stretch" }}>
          <div style={{ padding: "10px 16px", borderRight: "1.5px solid #9AA6B5", minWidth: 150 }}>
            <div style={{ fontWeight: 900, fontSize: 19, color: "#1D5C9E", fontStyle: "italic" }}>Island</div>
            <div style={{ fontSize: 7.5, letterSpacing: 3.2, fontWeight: 800, color: "#3C424A" }}>C O M P O N E N T S</div>
            <div style={{ fontSize: 7, color: "#8A93A0", marginTop: 2 }}>A G.W. LISK COMPANY</div>
          </div>
          <div style={{ flex: 1, textAlign: "center", alignSelf: "center", padding: "8px 10px" }}>
            <div style={{ fontWeight: 800, fontSize: 13.5, letterSpacing: 0.5 }}>{top.desc.toUpperCase()}</div>
            <div style={{ fontSize: 10, letterSpacing: 3, color: "#59636F", marginTop: 2 }}>FAMILY TREE</div>
            <div style={{ fontSize: 9, color: "#59636F", marginTop: 3 }}>
              TOP LEVEL ASSEMBLY: <b style={{ fontFamily: MONO }}>{meta.part}</b> — {meta.config}
            </div>
          </div>
          <div style={{ borderLeft: "1.5px solid #9AA6B5", minWidth: 218 }}>
            {[["DOCUMENT NO.", `${meta.part} FAMILY TREE`], ["REV", top.rev], ["DATE", "2026-07-25"],
              ["DRAWN BY", "Engineering"], ["CHECKED BY", "Quality"], ["APPROVED BY", "—"]].map(([k, v]) => (
              <div key={k} style={{ display: "flex" }}>
                <div style={{ ...tbCell, width: 88, color: "#59636F", fontWeight: 700, borderRight: "1px solid #C9D2DE" }}>{k}</div>
                <div style={{ ...tbCell, flex: 1, fontFamily: MONO }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
        {/* SO banner */}
        <div style={{ background: C.navy, color: "#fff", display: "flex", gap: 20, alignItems: "baseline",
                      padding: "7px 16px", fontSize: 11.5, flexWrap: "wrap" }}>
          <span style={{ fontFamily: MONO, fontWeight: 800, fontSize: 15, color: C.gold }}>SALES ORDER {meta.so}</span>
          <span>QTY {meta.qty}</span>
          <span>DUE {meta.due}</span>
          <span style={{ fontWeight: 700 }}>{sum.released ? `${sum.pct}% COMPLETE · ${sum.active + sum.holds} TRAVELER${sum.active + sum.holds === 1 ? "" : "S"} ON FLOOR` : "SCHEDULED — NOT RELEASED TO FLOOR"}</span>
          <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 10, opacity: 0.7 }}>SHEET 1 OF 1 · {meta.part}</span>
        </div>

        {/* tree / spaghetti */}
        {mode === "tree" ? (
          <div style={{ padding: "30px 14px 26px 14px", overflowX: "auto", background: sum.released ? "#FFFFFF" : "#FAFBFC" }}>
            <div style={{ minWidth: Math.max(260, (CHILDREN[meta.part]?.length || 1) * 250, meta.part === "ACT-1000" ? 760 : 0) }}>
              <TreeNode node={tree} root first last />
            </div>
          </div>
        ) : (
          <div style={{ padding: "14px 6px 8px 6px", background: "#FFFFFF" }}>
            <SpaghettiChart meta={meta} soJobs={soJobs} />
          </div>
        )}

        {/* legend / revision / notes */}
        <div style={{ display: "flex", borderTop: "2px solid #26364A", flexWrap: "wrap" }}>
          <div style={{ padding: "8px 12px", borderRight: "1px solid #C9D2DE", minWidth: 200 }}>
            <div style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: 1, color: "#59636F", marginBottom: 5 }}>LEGEND</div>
            {[["#1F3A5F", "BOLD BORDER — TRAVELER ACTIVE ON FLOOR", 1],
              [C.red, "RED CHIP — ON HOLD / NCR", 1],
              [C.green, "GREEN CHIP — TRAVELER COMPLETE", 1],
              ["#A6B4C6", "FADED — NOT RELEASED / NO TRAVELER", 0.4]].map(([c, l, o]) => (
              <div key={l} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 8.5, color: "#3C424A", marginBottom: 3 }}>
                <span style={{ width: 14, height: 10, border: `2px solid ${c}`, opacity: o, borderRadius: 2 }} />{l}
              </div>
            ))}
          </div>
          <div style={{ padding: "8px 12px", borderRight: "1px solid #C9D2DE", flex: 1, minWidth: 220 }}>
            <div style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: 1, color: "#59636F", marginBottom: 5 }}>REVISION HISTORY</div>
            <div style={{ display: "flex", fontSize: 8.5, fontWeight: 700, color: "#59636F", borderBottom: "1px solid #C9D2DE", paddingBottom: 2 }}>
              <span style={{ width: 34 }}>REV</span><span style={{ width: 70 }}>ECO NO.</span><span style={{ flex: 1 }}>DESCRIPTION</span><span style={{ width: 74 }}>DATE</span><span style={{ width: 30 }}>BY</span>
            </div>
            <div style={{ display: "flex", fontSize: 8.5, fontFamily: MONO, color: "#3C424A", paddingTop: 3 }}>
              <span style={{ width: 34 }}>1</span><span style={{ width: 70 }}>ECO-0001</span><span style={{ flex: 1 }}>INITIAL RELEASE</span><span style={{ width: 74 }}>2026-07-25</span><span style={{ width: 30 }}>ENG</span>
            </div>
          </div>
          <div style={{ padding: "8px 12px", flex: 1.2, minWidth: 250 }}>
            <div style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: 1, color: "#59636F", marginBottom: 5 }}>NOTES</div>
            <div style={{ fontSize: 8.5, color: "#3C424A", lineHeight: 1.6 }}>
              1. THIS FAMILY TREE DEPICTS THE ASSEMBLY HIERARCHY FOR {meta.part} ON SALES ORDER {meta.so}.<br />
              2. QUANTITIES ARE FOR ONE (1) TOP LEVEL ASSEMBLY UNLESS OTHERWISE NOTED.<br />
              3. TAP AN ACTIVE (BOLD) ASSEMBLY TO OPEN ITS DIGITAL TRAVELER.<br />
              {meta.part === "ACT-1000" && <>4. <span style={{ color: C.amber }}>▲</span> ENC-5000 PURCHASED COMPLETE — NO INTERNAL BOM LOADED.<br /></>}
            </div>
          </div>
        </div>
        <div style={{ textAlign: "center", fontSize: 7.5, letterSpacing: 1, color: "#8A93A0", padding: "5px 0 7px 0", borderTop: "1px solid #C9D2DE" }}>
          PROPRIETARY AND CONFIDENTIAL — ISLAND COMPONENTS GROUP, INC. · AS9100D · UNCONTROLLED WHEN PRINTED (DEMO)
        </div>
      </div>
    </div>
  );
}

/* ---------------------- shared button styles ---------------------- */
const btnGhost = { background: "#FFFFFF", border: `1.5px solid #C4CBD6`, color: C.navy, padding: "8px 14px",
                   borderRadius: 7, fontSize: 12.5, fontWeight: 700, cursor: "pointer" };
const btnPrimary = { background: C.green, border: "none", color: "#fff", padding: "10px 18px",
                     borderRadius: 7, fontSize: 13, fontWeight: 800, cursor: "pointer", letterSpacing: 0.4 };
