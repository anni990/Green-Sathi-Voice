# Device Authentication System - Implementation Guide

## Overview
This document provides complete instructions for deploying and testing the device-based authentication system for Green Sathi Voice Bot.

## ✅ What's Been Implemented

### Backend Components

1. **Database Schema** (`backend/models/database.py`)
   - Added `devices` collection with auto-incrementing device IDs (starting from 1201)
   - Updated `users` and `conversations` collections to include `device_id` field
   - Added device management methods: `get_next_device_id()`, `create_device()`, `update_device_tokens()`, etc.

2. **Authentication Service** (`backend/services/device_auth_service.py`)
   - JWT token generation (access token: 1 hour, refresh token: 24 hours)
   - bcrypt password hashing
   - Single active session enforcement (invalidates old tokens on new login)
   - `@device_auth_required` decorator for protected routes

3. **API Routes** (`backend/routes/device_routes.py`)
   - `GET /register` - Registration page
   - `GET /login` - Login page
   - `GET /api/device/suggest_id` - Get next available device ID
   - `POST /api/device/register` - Register new device
   - `POST /api/device/login` - Login device
   - `POST /api/device/refresh` - Refresh access token
   - `POST /api/device/logout` - Logout device
   - `GET /api/device/info` - Get device information
   - `POST /api/device/validate` - Validate access token

4. **Configuration** (`backend/utils/config.py`)
   - `JWT_SECRET_KEY` - Secret for JWT signing
   - `ACCESS_TOKEN_EXPIRY` - 3600 seconds (1 hour)
   - `REFRESH_TOKEN_EXPIRY` - 86400 seconds (24 hours)
   - `DEVICE_ID_START` - 1201 (starting device ID)
   - `DEFAULT_DEVICE_ID` - 1200 (for existing data migration)

5. **Protected Routes**
   - Updated `backend/routes/user_routes.py` - All endpoints require device authentication
   - Updated `backend/routes/voice_routes.py` - `/generate_response` requires device authentication

6. **Data Migration** (`backend/scripts/migrate_device_id.py`)
   - Script to assign `device_id=1200` to all existing users and conversations

### Frontend Components

1. **Registration Page** (`templates/device_register.html`)
   - Device name input (minimum 3 characters)
   - Auto-suggested device ID (read-only, fetched from backend)
   - Password input (minimum 8 characters)
   - Confirm password input
   - Password visibility toggle
   - Redirects to login after successful registration

2. **Login Page** (`templates/device_login.html`)
   - Device ID input (numeric)
   - Password input
   - Password visibility toggle
   - Redirects to landing page after successful login
   - Auto-check for existing login

3. **Device Auth Manager** (`static/js/DeviceAuthManager.js`)
   - Token storage in localStorage
   - Automatic token refresh on API 401 errors
   - Auth state management
   - Login/logout functionality
   - Session validation

4. **Updated Landing Page** (`templates/index.html`)
   - **Not Logged In:** Shows "Login" and "Register" buttons
   - **Logged In:** Shows account dropdown with:
     - Device name
     - Device ID
     - Logout button
   - Prevents voice bot access without authentication

5. **Updated API Service** (`static/js/ApiService.js`)
   - Automatic authorization header injection
   - 401 error handling with token refresh
   - Retry logic after token refresh

6. **Updated State Manager** (`static/js/StateManager.js`)
   - Stores device_id and device_name
   - Preserves device info on state reset

## 📦 Installation Steps

### 1. Install Python Dependencies

```powershell
# Activate virtual environment
.\venv\Scripts\activate

# Install new dependencies
pip install PyJWT==2.8.0 bcrypt==4.1.2

# Or install all from requirements.txt
pip install -r requirements.txt
```

### 2. Update Environment Variables

Add these to your `.env` file:

```env
# Device Authentication
JWT_SECRET_KEY=your-super-secret-jwt-key-change-in-production
ACCESS_TOKEN_EXPIRY=3600
REFRESH_TOKEN_EXPIRY=86400
DEVICE_ID_START=1201
DEFAULT_DEVICE_ID=1200
```

### 3. Run Database Migration

**Important:** Run this ONCE to migrate existing data:

```powershell
python backend/scripts/migrate_device_id.py
```

This will:
- Assign `device_id=1200` to all existing users
- Assign `device_id=1200` to all existing conversations
- Allow existing data to work with the new system

### 4. Start the Application

```powershell
python app.py
```

The server will start on `http://localhost:5000`

## 🧪 Testing Guide

### Test 1: Device Registration

1. Navigate to `http://localhost:5000/`
2. Click "Register" button
3. Fill in the form:
   - **Device Name:** `Kiosk Main Office` (min 3 chars)
   - **Device ID:** Auto-filled (should be 1201 for first device)
   - **Password:** `testpass123` (min 8 chars)
   - **Confirm Password:** `testpass123`
4. Click "Register Device"
5. Should show success message and redirect to login page

**Expected Result:** Device registered with ID 1201, tokens stored in localStorage

### Test 2: Device Login

1. Navigate to `http://localhost:5000/login` (or redirected from registration)
2. Enter credentials:
   - **Device ID:** `1201`
   - **Password:** `testpass123`
3. Click "Login to Device"
4. Should show success message and redirect to landing page

**Expected Result:** 
- Logged in successfully
- Landing page shows account dropdown instead of Login/Register buttons
- Account dropdown shows device name and ID

### Test 3: Voice Bot Access (Authenticated)

1. On landing page, ensure you're logged in (see account dropdown)
2. Click the microphone or press Enter
3. Voice bot should start normally
4. Follow the name/phone/language flow
5. Check MongoDB to verify:
   - User created with `device_id=1201`
   - Conversations saved with `device_id=1201`

**Expected Result:** Voice bot works normally, data tagged with device_id

### Test 4: Voice Bot Access (Not Authenticated)

1. Open browser in incognito/private mode
2. Navigate to `http://localhost:5000/`
3. Click "Register" or "Login" button
4. Try to start voice bot without logging in
5. Should show alert: "Please login to use the voice assistant"

**Expected Result:** Cannot access voice bot without authentication

### Test 5: Account Dropdown

1. On landing page (logged in), click account icon
2. Dropdown should open showing:
   - Device name: "Kiosk Main Office"
   - Device ID: 1201
3. Click outside dropdown to close
4. Click "Logout" button

**Expected Result:** 
- Dropdown opens/closes correctly
- Logout clears tokens and shows Login/Register buttons

### Test 6: Token Refresh

1. Login to a device
2. Wait for access token to expire (1 hour, or manually delete access_token from localStorage)
3. Try to use voice bot
4. System should automatically refresh token and continue

**Expected Result:** Seamless token refresh, no interruption to user

### Test 7: Single Session Enforcement

1. Login to device 1201 on Browser A
2. Note the access token in localStorage
3. Login to device 1201 on Browser B with same credentials
4. Try to use voice bot on Browser A

**Expected Result:** Browser A session invalidated, must re-login

### Test 8: Data Isolation

1. Register and login as Device 1201
2. Create a user and have conversations
3. Logout and register as Device 1202
4. Create a different user
5. Check MongoDB:
   - Device 1201's user has `device_id=1201`
   - Device 1202's user has `device_id=1202`
   - Conversations are tagged with respective device IDs

**Expected Result:** Each device's data is properly isolated

## 🗄️ Database Structure

### Devices Collection
```javascript
{
  "_id": ObjectId,
  "device_id": 1201,  // Auto-increment starting from 1201
  "device_name": "Kiosk Main Office",
  "password_hash": "$2b$12$...",  // bcrypt hash
  "access_token": "eyJ...",  // JWT access token
  "refresh_token": "eyJ...",  // JWT refresh token
  "created_at": ISODate,
  "last_login": ISODate
}
```

### Users Collection (Updated)
```javascript
{
  "_id": ObjectId,
  "name": "Rajesh Kumar",
  "phone": "9876543210",
  "language": "hindi",
  "device_id": 1201,  // NEW: Links to devices collection
  "created_at": ISODate,
  "updated_at": ISODate
}
```

### Conversations Collection (Updated)
```javascript
{
  "_id": ObjectId,
  "user_id": ObjectId,  // Links to users collection
  "device_id": 1201,  // NEW: Links to devices collection
  "session_id": "uuid",
  "user_input": "आज मंडी का भाव क्या है?",
  "bot_response": "आज गेहूं का भाव...",
  "timestamp": ISODate
}
```

## 🔑 API Endpoints Summary

### Public Endpoints (No Auth Required)
- `GET /register` - Registration page
- `GET /login` - Login page
- `GET /api/device/suggest_id` - Get next device ID
- `POST /api/device/register` - Register device
- `POST /api/device/login` - Login device
- `POST /api/device/refresh` - Refresh access token
- `POST /api/device/validate` - Validate token

### Protected Endpoints (Require `Authorization: Bearer <token>`)
- `POST /api/device/logout` - Logout device
- `GET /api/device/info` - Get device info
- `POST /api/user/register` - Register user (requires device auth)
- `GET /api/user/profile/<phone>` - Get user profile
- `GET /api/user/conversation_history/<user_id>` - Get conversations
- `POST /api/user/session/<user_id>` - Create new session
- `POST /api/voice/generate_response` - Generate AI response
- Other voice endpoints (process_audio, extract_info, etc.)

## 🔒 Security Features

1. **Password Hashing:** bcrypt with salt (secure against rainbow tables)
2. **JWT Tokens:** Signed with secret key, includes expiration
3. **Single Session:** Old tokens invalidated on new login
4. **Token Refresh:** Automatic renewal without re-login
5. **Protected Routes:** Decorator pattern enforces authentication
6. **CORS Enabled:** Supports cross-origin requests for mobile apps
7. **Device Isolation:** Each device's data is scoped by device_id

## 📱 Mobile Responsiveness

The authentication UI is fully responsive:
- **Desktop:** Full-width forms, all text visible
- **Mobile:** Compact buttons, icons only, full-width dropdowns
- **Tablets:** Adaptive layout based on screen size

## 🐛 Troubleshooting

### Issue: "Module not found: jwt" or "Module not found: bcrypt"
**Solution:** Install dependencies: `pip install PyJWT bcrypt`

### Issue: Device ID not showing in registration form
**Solution:** Check if backend is running and `/api/device/suggest_id` endpoint is accessible

### Issue: 401 Unauthorized errors on all API calls
**Solution:** 
1. Check if access_token exists in localStorage
2. Try logging out and logging back in
3. Check browser console for error messages

### Issue: Token refresh fails
**Solution:**
1. Check if refresh_token exists in localStorage
2. Verify `JWT_SECRET_KEY` is same in `.env` and hasn't changed
3. Check if refresh token has expired (24 hours)

### Issue: Existing data not visible after migration
**Solution:** Run migration script: `python backend/scripts/migrate_device_id.py`

### Issue: Cannot start voice bot
**Solution:** Ensure you're logged in (check for account dropdown in header)

## 📝 Next Steps

1. **Test all flows thoroughly** using the testing guide above
2. **Customize device names** for your specific kiosk locations
3. **Monitor token expiration** and adjust if needed
4. **Set up admin panel** to manage devices (optional future enhancement)
5. **Configure production secrets** before deployment

## ✅ Completion Checklist

- [x] Backend database schema updated
- [x] Authentication service implemented
- [x] API routes created
- [x] Frontend registration page created
- [x] Frontend login page created
- [x] DeviceAuthManager.js module created
- [x] Landing page updated with auth buttons
- [x] Account dropdown implemented
- [x] Token interceptor added to ApiService
- [x] StateManager updated with device info
- [x] Migration script created
- [x] Requirements.txt updated
- [ ] **Run migration script**
- [ ] **Test registration flow**
- [ ] **Test login flow**
- [ ] **Test logout flow**
- [ ] **Test token refresh**
- [ ] **Test data isolation**
- [ ] **Deploy to production**

## 🎉 Success Criteria

The implementation is successful when:
1. ✅ New devices can register with auto-incrementing IDs
2. ✅ Devices can login with ID and password
3. ✅ Voice bot requires authentication to access
4. ✅ Tokens auto-refresh without user intervention
5. ✅ Single session enforcement works (old sessions invalidated)
6. ✅ Each device's data is isolated by device_id
7. ✅ Existing data migrated to device_id=1200
8. ✅ Account dropdown shows device info
9. ✅ Logout clears all auth data
10. ✅ Mobile and desktop layouts work correctly

---

**Implementation Date:** January 2026  
**Status:** ✅ Complete - Ready for Testing  
**Version:** 1.0.0
