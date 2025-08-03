# API Configuration Fix

## Problem
The dev frontend was connecting to the production backend instead of the development backend.

## Solution
Updated the API configuration to ensure the dev frontend always uses the dev API URL.

### Changes Made

1. **Updated `getBaseUrl()` function** in `src/services/api.ts`:
   - Forces dev API URL (`https://api.gridcube.dev.vawkes.com`) in development mode
   - Added detailed logging to help debug configuration issues

2. **Updated `updateBaseUrl()` function**:
   - Preserves dev API URL in development mode
   - Only uses config-based URL in production

3. **Added debugging utilities**:
   - Created `src/utils/api-test.ts` for testing API configuration
   - Added configuration logging to `App.tsx`

### How to Test

1. **Start the dev frontend**:
   ```bash
   cd frontend-react
   npm start
   ```

2. **Check the browser console** for configuration logs:
   ```
   🔧 API Configuration:
     - NODE_ENV: development
     - REACT_APP_API_URL: undefined
     - Base URL: https://api.gridcube.dev.vawkes.com
   ```

3. **Test API calls**:
   - Login with your credentials
   - Check that API calls go to `api.gridcube.dev.vawkes.com`
   - Verify device filtering works with the new device ID mapping

4. **Manual test in browser console**:
   ```javascript
   // Test API configuration
   testApiConfig()
   ```

### Expected Behavior

- ✅ Dev frontend should connect to `https://api.gridcube.dev.vawkes.com`
- ✅ API calls should work with the new device ID mapping
- ✅ Device filtering should work correctly
- ✅ No more validation errors for 6-digit device IDs

### Troubleshooting

If the frontend is still connecting to production:

1. **Check environment variables**:
   ```bash
   echo $NODE_ENV
   echo $REACT_APP_API_URL
   ```

2. **Clear browser cache** and restart the dev server

3. **Check browser console** for configuration logs

4. **Verify the API URL** in network requests (should be `api.gridcube.dev.vawkes.com`)

### Files Modified

- `src/services/api.ts` - Updated API configuration logic
- `src/utils/api-test.ts` - Added debugging utilities
- `src/App.tsx` - Added configuration testing 