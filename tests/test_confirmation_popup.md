# Confirmation Popup Testing Guide

## Test Scenario: Keyboard Navigation with Popup

### Setup
1. Start Flask server: `python app.py`
2. Open browser to `http://localhost:5000/kiosk`
3. Open browser console (F12) to see debug logs

### Test Case 1: Successful Extraction with Edit
**Steps:**
1. Press Enter on landing page to start
2. When prompted, say "मेरा नाम राज है और मेरा नंबर 9876543210 है"
3. Wait for AI to extract name/phone
4. **Confirmation popup should appear**

**Expected Behavior:**
- Console shows: `🔒 Confirmation popup opened - Backspace enabled for editing (window.__popupActive = true)`
- Popup displays name "राज" and phone "9876543210"
- Phone input is focused and selected
- Audio plays: "कृपया अपनी जानकारी की पुष्टि करें..."

**Test Backspace:**
5. Press **Backspace** key
   - Console should show: `⌨️ Backspace pressed - popup active, allowing normal edit behavior`
   - Last digit should be deleted (shows "987654321")
   - Page should **NOT** reload ✓

6. Press Backspace multiple times
   - Each press deletes one digit
   - No page reload

7. Type new digits (e.g., "0")
   - Phone now shows "9876543210"

8. Press **Enter**
   - Console shows: `🔓 Phone confirmed - clearing popup flag (window.__popupActive = false)`
   - Popup closes
   - Audio plays: "धन्यवाद! आपकी जानकारी सहेज ली गई है।"
   - Proceeds to language selection

### Test Case 2: Failed Extraction (Error Flow)
**Steps:**
1. When prompted for name/phone, say unclear audio or just "hello"
2. AI fails to extract phone number

**Expected Behavior:**
- Confirmation popup appears with empty/partial phone field
- Error audio plays: "extraction_error"
- Console shows: `🔒 Confirmation popup opened`
- User can type full phone number using numeric keyboard
- Backspace works to correct mistakes
- Enter confirms and proceeds

### Test Case 3: Backspace After Popup Closes
**Steps:**
1. Complete name/phone confirmation (popup closes)
2. Continue to conversation step
3. Press **Backspace**

**Expected Behavior:**
- Console shows: `⌨️ Backspace pressed - no popup active, reloading page`
- Page should reload (exit behavior) ✓

## Debug Console Logs to Look For

✅ **Popup Opening:**
```
🔒 Confirmation popup opened - Backspace enabled for editing (window.__popupActive = true)
```

✅ **Backspace While Popup Active:**
```
⌨️ Backspace pressed - popup active, allowing normal edit behavior
```

✅ **Popup Closing:**
```
🔓 Phone confirmed - clearing popup flag (window.__popupActive = false)
```

✅ **Backspace After Popup Closed:**
```
⌨️ Backspace pressed - no popup active, reloading page
```

## Common Issues

### Issue: Backspace still reloads page when popup is active
**Solution:** Check console for `window.__popupActive` value
- If undefined or false when popup is visible → Bug in popup flag setting
- Check that popup appears and console shows "🔒 Confirmation popup opened"

### Issue: Backspace doesn't delete digits in input field
**Solution:** 
- Ensure input field has focus (click on it)
- Check that `window.__popupActive = true` in console

### Issue: Enter doesn't confirm
**Solution:**
- Check console for errors
- Verify phone number validation (must be 10 digits starting with 6-9)

## Success Criteria
- ✅ Popup appears for both successful and failed extractions
- ✅ Phone input is editable with keyboard
- ✅ Backspace deletes digits when popup is active (NO page reload)
- ✅ Enter confirms and proceeds
- ✅ Backspace reloads page when popup is closed (in conversation mode)
- ✅ Voice instructions play at each step
