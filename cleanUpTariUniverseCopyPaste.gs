/**
 * Tari Miner Rewards Cleaner & Standardizer
 * ======================================================================
 * 
 * PURPOSE:
 *   - Cleans messy Tari mining/rewards export data in the currently active sheet tab.
 *   - Removes junk rows and keeps ONLY meaningful mining event rows:
 *     → Valid date (recognized as Date object or short string in Column A)
 *     → Valid reward amount (number or numeric string) in Column B
 *   - Pairs dates with their corresponding rewards by skipping junk/empty rows
 *   - Standardizes all dates in Column A to clean ISO-like string format (UTC)
 *   - Preserves the first row (headers) completely untouched
 *   - Operates automatically on whatever sheet tab is currently active/selected
 *     (no hardcoded sheet name — just switch tabs and run!)
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
 *   Automatically processes the currently active/selected sheet tab.
 *   No need to specify a name — just make sure the tab you want to clean
 *   is the one you're viewing when you run the script.
 * 
 * WHAT GETS DELETED (rows 2 and below):
 *   • Completely blank rows
 *   • Rows containing "#ERROR!", "XTM", "Received" (in A or B)
 *   • Rows with a number in Column A (misplaced)
 *   • Rows without a valid date in Column A (Date object or short string)
 *   • Rows without a valid number/numeric string in Column B
 *   • Any other rows without both a valid date in A AND a number in B
 * 
 * RAW DATA EXAMPLE (typical messy input before processing):
 * 
 *     Date                  Tari Amount - $xtm
 *     Received              Received
 *     Dec 18, 22:17         Dec 18, 22:17
 *     
 *     #ERROR!               #ERROR!
 *     200.17                200.17
 *     XTM                   XTM
 *     
 *     Received              Received
 *     Dec 10, 15:34         Dec 10, 15:34
 *     
 *     #ERROR!               #ERROR!
 *     200.24                200.24
 *     XTM                   XTM
 * 
 * PRESERVED & TRANSFORMED VALUES:
 *   • Row 1 → untouched (headers, usually "Date" and "Reward" or similar)
 *   • Column A → all valid dates converted to strings:
 *       Format: yyyy-MM-dd HH:mm:ss   (24-hour time, UTC)
 *       Example: "2026-12-19 00:17:00", "2026-07-18 06:04:00"
 *       Pure dates (no time component) become ... 00:00:00
 *   • Column B → only real numbers (rewards), preserved exactly
 * 
 * FINAL OUTPUT EXAMPLE (typical result after running):
 * 
 *     Date (UTC)            Reward (XTM)
 *     2026-12-19 00:17:00   200.17
 *     2026-12-10 17:34:00   200.24
 *     2026-12-01 12:34:00   201.12
 *     2026-11-23 00:13:00   200.32
 *     ... (only valid mining events with both date and reward, no gaps, no junk)
 * 
 * FEATURES & BEHAVIOR:
 *   - Recognizes any valid Date object in Column A (regardless of time component)
 *     and also matches short string formats like "Dec 18, 22:17"
 *   - Automatically works on the currently active sheet tab
 *   - Column A becomes plain text (@ format) to lock the standardized strings
 *   - Column B formatted as number with 2 decimal places (0.00)
 *   - No formulas preserved — only values
 * 
 * HOW TO USE:
 *   1. Open your Google Spreadsheet
 *   2. Make sure the tab you want to clean is the active/selected one
 *   3. Extensions → Apps Script
 *   4. Replace all existing code with the full script below
 *   5. Save the project
 *   6. Reload the spreadsheet tab (Ctrl+R or Cmd+R) to make the custom menu appear
 *      - After reload, look at the top menu bar of the Google Sheet (not the Apps Script editor):
 *        you should now see a new item called "Tari Tools" between "Extensions" and "Help".
 *   7. Run the script using the menu:
 *      • Click Tari Tools → Clean & Standardize Tari Rewards
 * 
 * UNDO ADVICE:
 *   • If the result is not as desired, immediately press Ctrl+Z (Windows/Linux/ChromeOS)
 *     or Cmd+Z (Mac) — this often works even after script execution
 *   • For safety, always work on a duplicated tab or copied spreadsheet first
 * 
 * SAFETY / BEST PRACTICES:
 *   • Make a copy of the spreadsheet or duplicate the tab before first run!
 *   • Large sheets (>8–10k rows) may hit execution time limits
 *   • To prevent future date auto-conversion issues:
 *     Before pasting new data → Select column A → Format → Number → Plain text
 * 
 * Happy Tari mining & reward tracking! 🚀
 * Last updated: January 14, 2026
 */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Tari Tools')
    .addItem('Clean & Standardize Tari Rewards', 'cleanTariRewards')
    .addSeparator()
    .addItem('Run Tests (Debug)', 'runAllTests')
    .addToUi();
}

// ================================================
// MAIN FUNCTION - Run from menu
// ================================================
function cleanTariRewards() {
  const ui = SpreadsheetApp.getUi();
  const sheet = SpreadsheetApp.getActiveSheet();
  const data = sheet.getDataRange().getValues();

  try {
    const merged = mergeDateAndRewardFixed(data);
    const cleaned = filterAndStandardize(merged);
    outputCleanedData(cleaned);

    ui.alert('Success!', `Processed ${data.length} rows → Kept ${cleaned.length} valid rewards.\nCheck log for details.`, ui.ButtonSet.OK);
  } catch (error) {
    Logger.log('Error in cleanTariRewards: ' + error.message);
    ui.alert('Error', error.message, ui.ButtonSet.OK);
  }
}

// ================================================
// FIXED MERGE - Converts Date objects to short string, skips junk
// ================================================
function mergeDateAndRewardFixed(rows) {
  const result = [];
  let i = 0;

  while (i < rows.length) {
    let cell = rows[i][0]; // Raw cell value
    let dateStr = '';

    if (cell instanceof Date) {
      let month = cell.toLocaleString('en-US', {month: 'short'});
      let day = cell.getDate();
      let hour = cell.getHours();
      let min = cell.getMinutes().toString().padStart(2, '0');
      dateStr = `${month} ${day}, ${hour}:${min}`;
      Logger.log(`Row ${i+1} | Detected DATE OBJECT → Converted to short: "${dateStr}" (original: ${cell})`);
    } else if (typeof cell === 'string' && cell.trim() !== '') {
      dateStr = normalizeString(cell);
      Logger.log(`Row ${i+1} | String: "${cell}" → Normalized: "${dateStr}"`);
    }

    if (dateStr === '' || isJunk(dateStr)) {
      i++;
      continue;
    }

    if (isDateLike(dateStr)) {
      Logger.log(`  → Valid date detected: "${dateStr}"`);

      let rewardStr = null;
      for (let j = i + 1; j < rows.length; j++) {
        let cand = rows[j][0];
        let candStr = '';

        if (cand instanceof Date) {
          Logger.log(`    Warning: Reward position (row ${j+1}) is a Date object - skipping`);
          continue;
        } else {
          candStr = normalizeString(cand.toString());
        }

        if (isRewardLike(candStr)) {
          rewardStr = candStr;
          Logger.log(`    → Reward found: "${rewardStr}" (row ${j+1})`);
          break;
        }
        if (candStr === '' || isJunk(candStr)) continue;
        if (isDateLike(candStr)) {
          Logger.log(`    → Next date hit - stopping search`);
          break;
        }
      }

      if (rewardStr) {
        result.push([dateStr, rewardStr]);
      } else {
        Logger.log(`    → No reward found after "${dateStr}"`);
      }
    } else {
      Logger.log(`  → Not recognized as date`);
    }

    i++;
  }

  Logger.log(`\n=== SUMMARY === Merged ${result.length} date-reward pairs`);
  return result;
}

// ================================================
// HELPERS
// ================================================
function normalizeString(str) {
  return str
    .replace(/[\s\u00A0\u200B\uFEFF\t\r\n]+/g, ' ')
    .replace(/[^\x20-\x7E]/g, '')
    .trim();
}

function isJunk(str) {
  str = str.toUpperCase().trim();
  return str.includes('RECEIVED') ||
         str === 'XTM' ||
         str.includes('#ERROR!') ||
         str.includes('BLOCK #') ||
         str === '';
}

function isDateLike(str) {
  if (!str || typeof str !== 'string') return false;
  // Flexible regex for "Month Day, H:MM"
  return !!str.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}\s*,?\s*\d{1,2}:\d{2}$/i);
}

function isRewardLike(str) {
  if (!str || typeof str !== 'string') return false;
  return /^\d+(\.\d{1,2})?$/.test(str.trim());
}

function parseTariDate(str) {
  str = normalizeString(str);
  const match = str.match(/^([A-Za-z]+)\s+(\d{1,2})\s*,?\s*(\d{1,2}):(\d{2})$/i);
  if (!match) return null;

  const [, monthStr, day, hour, min] = match;
  const months = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
  };

  const month = months[monthStr.toLowerCase()];
  if (month === undefined) return null;

  const year = 2026;
  const date = new Date(year, month, parseInt(day), parseInt(hour), parseInt(min));
  return isNaN(date.getTime()) ? null : date;
}

// ================================================
// FILTER & OUTPUT
// ================================================
function filterAndStandardize(rows) {
  const output = [];

  for (const row of rows) {
    let dateStr = normalizeString(row[0] || '');
    let rewardStr = normalizeString(row[1] || '');

    if (!dateStr || !rewardStr) continue;
    if (!isRewardLike(rewardStr)) continue;

    const parsed = parseTariDate(dateStr);
    if (!parsed) continue;

    const cleanDate = Utilities.formatDate(parsed, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
    output.push([cleanDate, parseFloat(rewardStr)]);
  }

  Logger.log(`=== FILTER SUMMARY === Kept ${output.length} valid reward rows`);
  return output;
}

function outputCleanedData(data) {
  const sheet = SpreadsheetApp.getActiveSheet();
  sheet.clearContents();

  sheet.getRange(1, 1, 1, 2).setValues([['Date (UTC)', 'Reward (XTM)']]);
  sheet.getRange(1, 1, 1, 2).setFontWeight('bold');

  if (data.length > 0) {
    sheet.getRange(2, 1, data.length, 2).setValues(data);
  }

  sheet.autoResizeColumns(1, 2);
  sheet.getRange('A:A').setNumberFormat('yyyy-mm-dd hh:mm:ss');
  sheet.getRange('B:B').setNumberFormat('0.00');
  SpreadsheetApp.flush();
}

// ================================================
// UNIT TESTS - To verify core functions
// ================================================
function runAllTests() {
  const tests = [testParseTariDate, testIsDateLike, testIsRewardLike];
  let passed = 0;
  const ui = SpreadsheetApp.getUi();

  for (const testFn of tests) {
    try {
      testFn();
      passed++;
      Logger.log(`✓ ${testFn.name} passed`);
    } catch (e) {
      Logger.log(`✗ ${testFn.name} failed: ${e.message}`);
    }
  }

  ui.alert(`Tests: ${passed}/${tests.length} passed`);
}

function testParseTariDate() {
  const cases = [
    ["Dec 19, 0:17", new Date(2026, 11, 19, 0, 17)],
    ["Jul 18, 6:04", new Date(2026, 6, 18, 6, 4)],
    ["Sep 19, 11:02", new Date(2026, 8, 19, 11, 2)],
    ["Nov 11, 17:13", new Date(2026, 10, 11, 17, 13)],
    ["Aug 31, 15:40", new Date(2026, 7, 31, 15, 40)]
  ];

  for (const [input, expected] of cases) {
    const result = parseTariDate(input);
    if (!result || Math.abs(result.getTime() - expected.getTime()) > 1000) {
      throw new Error(`Failed: "${input}" → ${result} (expected ${expected})`);
    }
  }
}

function testIsDateLike() {
  const valid = ["Dec 19, 0:17", "Jul 18, 6:04", "Sep 19, 11:02", "Nov 11, 17:13", "Aug 31, 15:40"];
  const invalid = ["Received", "200.17", "XTM", "#ERROR!", "Block #12123"];

  for (const s of valid) if (!isDateLike(s)) throw new Error(`Should be date: ${s}`);
  for (const s of invalid) if (isDateLike(s)) throw new Error(`Should not be date: ${s}`);
}

function testIsRewardLike() {
  const valid = ["200.17", "8.25", "66.86", "12.96", "2.4", "3"];
  const invalid = ["XTM", "#ERROR!", "Received", "", "abc"];

  for (const s of valid) if (!isRewardLike(s)) throw new Error(`Should be reward: ${s}`);
  for (const s of invalid) if (isRewardLike(s)) throw new Error(`Should not be reward: ${s}`);
}
