# Tari Mining & Rewards Data Cleaner

Did you try to copy-paste your Activity Log from Tari Universe to a Google Sheet? This cleans it up for a clean 
date/value result.

To get prices, see this other Google Apps Script:
<https://github.com/nottoseethesun/crypto-price-fetchers/tree/main/fetch-from-centralized-exchange>

This is a simple Google Apps Script that cleans messy Tari mining/rewards export data in a Google Sheet (columns A:B).

## What it does

- Removes junk rows (blanks, `#ERROR!`, `XTM`, `Received`, misplaced values, etc.)
- Keeps only meaningful rows: **valid date/time in Column A** + **reward number in Column B**
- Packs valid rows consecutively at the top (no gaps)
- Standardizes all dates in Column A to `yyyy-MM-dd HH:mm:ss` (plain text)
- Preserves the first row (headers) completely untouched

### Important Note on Transaction Types

This script currently does **not** handle or preserve transaction types (e.g. distinguishing mining vs. receiving rewards).  
This works well for most Tari Universe logs, which are typically just mining earnings and reward receipts.
If your data includes other transaction types that need to be kept or differentiated, the script would need modification.

### Before / After Example

**Before** (messy raw data):

```table
XTM                 XTM

Received            Received
Aug 11, 5:59        Aug 11, 5:59

#ERROR!             #ERROR!
3.92                3.92
XTM                 XTM

Received            Received
Aug 10, 19:51       Aug 10, 19:51
...
```

**After** (clean output):

```table
Date                  Reward
2026-08-11 05:59:00   3.92
2026-08-10 19:51:00   ...
...
```

## How to Install & Use

1. Open your Google Spreadsheet containing the Tari mining data
2. Go to **Extensions → Apps Script**
3. Delete any default code in the editor
4. Paste the entire contents of [`cleanUpTariUniverseCopyPaste.gs`](./cleanUpTariUniverseCopyPaste.gs)
5. Save the project (Ctrl+S or Cmd+S)
6. Reload the spreadsheet tab (Ctrl+R / Cmd+R or Ctrl+Shift+R / Cmd+Shift+R for hard refresh)
7. You should now see a new menu item in the top bar: **Tari Tools**
8. Click **Tari Tools → Clean & Standardize Tari Rewards** to run the script

**Manual run (alternative):**

- In the Apps Script editor, select `processTariMiningSheet` from the dropdown
- Click **Run**

**Safety first:**

- Always duplicate your tab/sheet first!
- Ctrl+Z (Windows/Linux) or Cmd+Z (Mac) often works to undo after running

### Full Details

For complete documentation, including:

- Detailed purpose
- Deletion rules
- Preserved values
- Output examples
- Undo advice
- Safety notes

**Refer to the large comment block at the top of the file** `cleanUpTariUniverseCopyPaste.gs` — it contains the full, self-contained explanation.

## License

Apache License 2.0 — feel free to use, modify, and share.

Happy Tari mining & reward tracking! 🚀
