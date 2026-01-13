/**
 * Google Apps Script to clean and consolidate "Tari Mining and Rewards" data
 * ========================================================================
 * 
 * PURPOSE:
 *   - Cleans messy Tari mining/rewards export data in columns A:B.
 *   - Removes junk rows and keeps ONLY meaningful mining event rows:
 *     → Valid Date object in Column A (any date, with or without visible time)
 *     → Valid reward amount (number) in Column B
 *   - Packs the remaining valid rows consecutively at the top (no gaps)
 *   - Standardizes all dates in Column A to clean ISO-like string format
 *   - Preserves the first row (headers) completely untouched
 * 
 * IMPORTANT NOTE ON TRANSACTION TYPES:
 *   This script currently does NOT handle or preserve transaction types 
 *   (e.g. distinguishing mining vs. receiving rewards). 
 *   This is sufficient for most Tari Universe logs, which are primarily 
 *   mining earnings and reward receipts. If your data includes other 
 *   transaction types that need to be kept or differentiated, the script 
 *   would need modification.
 * 
 * TARGET SHEET / TAB:
 *   Only processes the sheet named exactly:
 *   const TARGET_SHEET_NAME = "Tari Mining and Rewards";
 * 
 * WHAT GETS DELETED (rows 2 and below):
 *   • Completely blank rows
 *   • Rows containing "#ERROR!", "XTM", "Received" (in A or B)
 *   • Rows with a number in Column A (misplaced)
 *   • Rows without a valid Date object in Column A
 *   • Rows without a valid number in Column B
 *   • Any other rows without both a valid Date in A AND a number in B
 * 
 * RAW DATA EXAMPLE (typical messy input before processing):
 * 
 *     XTM                 XTM
 *     
 *     Received            Received
 *     Aug 11, 5:59        Aug 11, 5:59
 *     
 *     #ERROR!             #ERROR!
 *     3.92                3.92
 *     XTM                 XTM
 *     
 *     Received            Received
 *     Aug 10, 19:51       Aug 10, 19:51
 *     
 *     #ERROR!             #ERROR!
 *     3.03                3.03
 *     XTM                 XTM
 * 
 * PRESERVED & TRANSFORMED VALUES:
 *   • Row 1 → untouched (headers, usually "Date" and "Reward" or similar)
 *   • Column A → all valid Date objects converted to strings:
 *       Format: yyyy-MM-dd HH:mm:ss   (24-hour time)
 *       Example: "2026-08-12 18:33:00", "2026-09-07 02:32:00"
 *       Pure dates (no time component) become ... 00:00:00
 *   • Column B → only real numbers (rewards), preserved exactly
 * 
 * FINAL OUTPUT EXAMPLE (typical result after running):
 * 
 *     Date                  Reward
 *     2026-09-07 02:32:00   4.54
 *     2026-09-06 21:46:00   3.49
 *     2026-09-06 16:32:00   4.27
 *     2026-09-06 09:42:00   2.65
 *     2026-09-06 06:18:00   9.02
 *     2026-09-05 19:17:00   3.46
 *     ... (only valid mining events with both date and reward, no gaps, no junk)
 * 
 * FEATURES & BEHAVIOR:
 *   - Recognizes any valid Date object in Column A (regardless of time component)
 *   - Column A becomes plain text (@ format) to lock the standardized strings
 *   - Column B formatted as number with 2 decimal places (0.00)
 *   - No formulas preserved — only values
 * 
 * HOW TO USE:
 *   1. Open your Google Spreadsheet
 *   2. Extensions → Apps Script
 *   3. Replace all existing code with the full script
 *   4. Confirm TARGET_SHEET_NAME matches your tab exactly
 *   5. Save the project
 *   6. Reload the spreadsheet tab to make the custom menu appear:
 *      - Preferred: While viewing your target sheet tab, press Ctrl+R (Windows/Linux/ChromeOS)
 *        or Cmd+R (Mac) to reload just that tab.
 *      - Alternative: Press Ctrl+Shift+R (Windows/Linux/ChromeOS) or Cmd+Shift+R (Mac)
 *        for a full hard refresh of the entire spreadsheet (recommended if menu doesn't show).
 *      After reload, look at the top menu bar of the Google Sheet (not the Apps Script editor):
 *      you should now see a new item called "Tari Tools" between "Extensions" and "Help".
 *   7. Run the script using one of these two methods:
 *      • Easy way (recommended): Click the top menu Tari Tools → Clean & Standardize Tari Rewards
 *      • Manual way (via editor): In the Apps Script editor, at the top dropdown menu next to
 *        the "Run" button, make sure "processTariMiningSheet" is selected, then click the "Run" button.
 * 
 * UNDO ADVICE:
 *   • If the result is not as desired, immediately press Ctrl+Z (Windows/Linux/ChromeOS)
 *     or Cmd+Z (Mac) — this often works even after script execution
 *   • For safety, always work on a duplicated tab or copied spreadsheet first
 * 
 * SAFETY / BEST PRACTICES:
 *   • Make a copy of the spreadsheet or duplicate the tab before first run!
 *   • Large sheets (>8–10k rows) may hit execution time limits
 * 
 * Happy Tari mining & reward tracking! 🚀
 * Last updated: January 2026
 */

const TARGET_SHEET_NAME = "Tari Mining and Rewards";
const STANDARD_DATE_FORMAT = 'yyyy-MM-dd HH:mm:ss';


// ───────────────────────────────────────────────────────────────
// Core processing function - accepts sheet name as parameter
// ───────────────────────────────────────────────────────────────
function cleanTariSheet(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    throw new Error(`Sheet "${sheetName}" not found. Check spelling and case.`);
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const dataRange = sheet.getRange(2, 1, lastRow - 1, 2);
  const values = dataRange.getValues();

  const errorSet = new Set(["#ERROR!", "XTM", "Received"]);
  const keptRows = values.filter(([a, b]) => {
    if ((a == null || a === "") && (b == null || b === "")) return false;
    if (typeof a === "number") return false;
    if (typeof a === "string" && errorSet.has(a.trim())) return false;
    if (typeof b === "string" && errorSet.has(b.trim())) return false;
    return a instanceof Date && typeof b === 'number';
  });

  if (keptRows.length === 0) {
    dataRange.clearContent();
    return;
  }

  const timezone = ss.getSpreadsheetTimeZone();
  keptRows.forEach(row => {
    if (row[0] instanceof Date) {
      row[0] = Utilities.formatDate(row[0], timezone, STANDARD_DATE_FORMAT);
    }
  });

  const header = sheet.getRange(1, 1, 1, 2).getValues();
  const finalData = header.concat(keptRows);

  sheet.clearContents();
  sheet.getRange(1, 1, finalData.length, 2).setValues(finalData);

  sheet.getRange(2, 1, finalData.length - 1, 1).setNumberFormat('@');
  sheet.getRange(2, 2, finalData.length - 1, 1).setNumberFormat('0.00');
}


// ───────────────────────────────────────────────────────────────
// Normal run - uses the global constant
// ───────────────────────────────────────────────────────────────
function processTariMiningSheet() {
  try {
    cleanTariSheet(TARGET_SHEET_NAME);
  } catch (e) {
    SpreadsheetApp.getUi().alert("Error: " + e.message);
  }
}


// ───────────────────────────────────────────────────────────────
// TEST FUNCTION - creates sample data and runs on temp sheet
// ───────────────────────────────────────────────────────────────
function testCleanTariData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Clean up any old test sheet
  let testSheet = ss.getSheetByName("TEST_TARI_CLEANUP");
  if (testSheet) ss.deleteSheet(testSheet);
  
  // Create fresh test sheet
  testSheet = ss.insertSheet("TEST_TARI_CLEANUP");

  // Realistic messy sample data (including header)
  const sampleData = [
    ["Date", "Reward"],
    ["XTM", "XTM"],
    ["", ""],
    ["Received", "Received"],
    [new Date(2026, 7, 11, 5, 59), new Date(2026, 7, 11, 5, 59)],
    ["", ""],
    ["#ERROR!", "#ERROR!"],
    [3.92, 3.92],
    ["XTM", "XTM"],
    ["", ""],
    ["Received", "Received"],
    [new Date(2026, 7, 10, 19, 51), new Date(2026, 7, 10, 19, 51)],
    ["", ""],
    ["#ERROR!", "#ERROR!"],
    [3.03, 3.03],
    ["XTM", "XTM"],
    ["", ""],
    [new Date(2026, 8, 13, 4, 1), 5.73],
    [new Date(2026, 8, 12, 18, 33), 2.14],
    [new Date(2026, 8, 12, 12, 26), 2.79],
    [new Date(2026, 8, 12, 10, 50), 28.59]
  ];

  testSheet.getRange(1, 1, sampleData.length, 2).setValues(sampleData);

  try {
    cleanTariSheet("TEST_TARI_CLEANUP");
    SpreadsheetApp.getUi().alert(
      "TEST COMPLETE!\n\n" +
      "Check sheet 'TEST_TARI_CLEANUP':\n" +
      "- Header row preserved\n" +
      "- Only rows with both date & number remain\n" +
      "- Dates in A standardized to yyyy-MM-dd HH:mm:ss\n" +
      "- No junk left\n\n" +
      "Delete the test sheet when finished."
    );
  } catch (e) {
    SpreadsheetApp.getUi().alert("Test failed: " + e.message);
  }
}


// ───────────────────────────────────────────────────────────────
// Menu
// ───────────────────────────────────────────────────────────────
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Tari Tools")
    .addItem("Clean & Standardize Tari Rewards", "processTariMiningSheet")
    .addToUi();
}
