# Secure Admin Authentication System

## Overview
The admin authentication system has been completely rebuilt with industry-standard security practices:

✅ **Bcrypt password hashing** (more secure than SHA256)  
✅ **JWT-based session tokens** (stateless and scalable)  
✅ **Database-backed storage** (persistent across server restarts)  
✅ **Separate collections** (admins and admin_sessions - no references to user data)  
✅ **Session expiry management** (24-hour automatic expiry)  
✅ **Secure password requirements** (minimum 8 characters)

---

## Database Collections

### 1. `admins` Collection
Stores admin user credentials (encrypted passwords).

```javascript
{
  "_id": ObjectId,
  "username": "admin",
  "password_hash": "$2b$12$...", // Bcrypt hash
  "created_at": ISODate,
  "updated_at": ISODate
}
```

### 2. `admin_sessions` Collection
Stores active admin sessions with JWT tokens.

```javascript
{
  "_id": ObjectId,
  "username": "admin",
  "token": "eyJhbGciOiJIUzI1NiIs...", // JWT token
  "login_time": ISODate,
  "expires_at": ISODate,
  "ip_address": null // Optional
}
```

---

## Security Features

### 1. Password Security
- **Bcrypt hashing** with automatic salt generation
- **Minimum 8 characters** requirement
- **No plaintext storage** - passwords are irreversibly hashed
- **Resistant to rainbow table attacks**

### 2. Session Security
- **JWT tokens** with:
  - Expiration time (24 hours)
  - Issue time tracking
  - Unique token ID (jti)
  - Type verification
- **Database verification** - tokens must exist in database
- **Automatic cleanup** of expired sessions
- **Single logout** invalidates session immediately

### 3. Password Change Security
- **Current password verification** required
- **Automatic session invalidation** on password change
- **Force re-login** after password change

---

## Setup Instructions

### Initial Setup (First Time Deployment)

1. **Activate virtual environment:**
   ```bash
   .venv\Scripts\activate  # Windows
   ```

2. **Run admin setup script:**
   ```bash
   python backend/scripts/setup_admin.py
   ```

3. **Follow prompts to set secure password:**
   ```
   ============================================================
   ADMIN USER SETUP
   ============================================================
   
   Enter new admin password (min 8 characters): ********
   Confirm admin password: ********
   
   🔒 Hashing password...
   ✅ Admin user created successfully!
   
   ============================================================
   SETUP COMPLETE
   ============================================================
   
   📝 Admin Credentials:
      Username: admin
      Password: YourSecurePassword123
   
   ⚠️  IMPORTANT: Save this password securely and delete this output!
   ```

4. **Save credentials securely** (use password manager)

5. **Delete terminal history** if it contains the password

---

## Default Credentials

**⚠️ DEVELOPMENT ONLY:**

If you skip the setup script, default credentials are automatically created:
- **Username:** `admin`
- **Password:** `123456`

**🚨 PRODUCTION WARNING:** 
Change these immediately after first login using the Settings page!

---

## Usage

### Admin Login Flow

1. **User visits:** `https://yourdomain.com/admin/login`
2. **Enters credentials:** username + password
3. **System verifies:** 
   - Checks username exists in `admins` collection
   - Verifies password using bcrypt
   - Generates JWT token
   - Stores session in `admin_sessions` collection
4. **Returns token:** Stored in Flask session
5. **Subsequent requests:** Token validated against database

### Session Validation

Every admin API request:
1. Extracts token from Flask session
2. Decodes JWT token
3. Checks expiration time
4. Verifies token exists in database
5. Checks not expired in database

### Logout

1. User clicks logout
2. Token removed from `admin_sessions` collection
3. Flask session cleared
4. User redirected to login

---

## Password Change Process

### Via Admin Panel:

1. Navigate to **Settings** page
2. Enter current password
3. Enter new password (min 8 characters)
4. Confirm new password
5. System:
   - Verifies current password
   - Hashes new password with bcrypt
   - Updates `admins` collection
   - Invalidates ALL existing sessions
   - Forces re-login

### Via Script (if locked out):

```bash
python backend/scripts/setup_admin.py
```

Answer "yes" to reset password.

---

## Maintenance

### Clean Up Expired Sessions

**Manual cleanup:**
```bash
python backend/scripts/cleanup_admin_sessions.py
```

**Automatic cleanup (recommended):**

Set up a cron job (Linux) or Task Scheduler (Windows):

**Linux/Mac:**
```bash
# Edit crontab
crontab -e

# Add line (runs daily at 2 AM)
0 2 * * * cd /path/to/project && /path/to/venv/bin/python backend/scripts/cleanup_admin_sessions.py
```

**Windows Task Scheduler:**
1. Open Task Scheduler
2. Create Basic Task
3. Trigger: Daily at 2:00 AM
4. Action: Start a program
   - Program: `D:\path\to\.venv\Scripts\python.exe`
   - Arguments: `backend\scripts\cleanup_admin_sessions.py`
   - Start in: `D:\path\to\project`

---

## Troubleshooting

### Issue: "Password found in data breach" warning

**Cause:** Browser detected weak password (like "123456")

**Solution:**
1. Run setup script: `python backend/scripts/setup_admin.py`
2. Set strong password (mix of letters, numbers, symbols)
3. Browser will stop warning

---

### Issue: Auto-logout immediately after login

**Causes:**
1. Session not persisting (check Flask SECRET_KEY in .env)
2. Token expired (check server time is correct)
3. Database connection lost

**Solution:**
```bash
# Check environment variables
cat .env | grep SECRET_KEY

# If missing, add to .env:
SECRET_KEY=your-very-long-random-secret-key-here

# Restart server
```

---

### Issue: Cannot login after deployment

**Causes:**
1. Admin user not created in production database
2. Different MongoDB instance

**Solution:**
1. SSH into production server
2. Run setup script:
   ```bash
   cd /path/to/project
   source venv/bin/activate
   python backend/scripts/setup_admin.py
   ```

---

### Issue: Forgot admin password

**Solution:**
```bash
python backend/scripts/setup_admin.py
```
Choose "yes" to reset password.

---

## Security Best Practices

### 1. Strong Passwords
✅ Minimum 12 characters  
✅ Mix uppercase, lowercase, numbers, symbols  
✅ Don't use dictionary words  
✅ Don't reuse passwords  

### 2. Environment Security
✅ Set strong `JWT_SECRET_KEY` in `.env`  
✅ Set strong `SECRET_KEY` in `.env`  
✅ Never commit `.env` to git  
✅ Use different secrets for dev/prod  

### 3. Deployment Security
✅ Use HTTPS (SSL certificate)  
✅ Set secure cookies in production  
✅ Enable firewall on server  
✅ Regular security updates  
✅ Monitor login attempts  

### 4. Password Management
✅ Change default password immediately  
✅ Change password every 90 days  
✅ Use password manager  
✅ Don't share credentials  

---

## API Changes

### Login Endpoint
**No changes to frontend code required!**

The `/admin/login` endpoint works the same way, but now:
- Uses database verification
- Returns JWT token
- More secure

### Session Validation
**No changes to frontend code required!**

The `@require_admin_auth()` decorator still works, but now:
- Validates JWT token
- Checks database
- More reliable

---

## Migration from Old System

### Automatic Migration
The new system automatically:
1. Creates `admins` collection on first run
2. Creates default admin user (admin/123456)
3. Old in-memory sessions are ignored

### What Changed
- ❌ Removed: In-memory session storage
- ❌ Removed: SHA256 password hashing
- ✅ Added: MongoDB collections for admins
- ✅ Added: MongoDB collections for sessions
- ✅ Added: Bcrypt password hashing
- ✅ Added: JWT token generation
- ✅ Added: Setup script

### What Stayed the Same
- ✅ Same login page
- ✅ Same API endpoints
- ✅ Same authentication decorator
- ✅ Same frontend code

---

## Technical Details

### Password Hashing (Bcrypt)
```python
# Hash password
salt = bcrypt.gensalt()  # Automatic salt
hash = bcrypt.hashpw(password.encode('utf-8'), salt)

# Verify password
is_valid = bcrypt.checkpw(password.encode('utf-8'), hash)
```

### JWT Token Structure
```json
{
  "username": "admin",
  "type": "admin_session",
  "exp": 1706054400,  // Expiration (Unix timestamp)
  "iat": 1705968000,  // Issued at (Unix timestamp)
  "jti": "abc123..."  // Unique token ID
}
```

### Session Lifecycle
```
Login → Generate JWT → Store in DB → Return token
       ↓
User makes request → Validate JWT → Check DB → Allow access
       ↓
Logout → Delete from DB → Clear session
```

---

## Files Modified

1. **backend/services/admin_service.py** - Complete rewrite with secure authentication
2. **backend/models/database.py** - Added admins and admin_sessions collections
3. **backend/scripts/setup_admin.py** - New script for password setup
4. **backend/scripts/cleanup_admin_sessions.py** - New script for maintenance
5. **Notes/ADMIN_SECURE_AUTH_GUIDE.md** - This documentation

---

## Support

If you encounter any issues:

1. Check this documentation
2. Check server logs for errors
3. Verify database connection
4. Verify environment variables
5. Run setup script again
6. Contact development team

---

**Last Updated:** January 23, 2026  
**Version:** 2.0 (Secure Database Authentication)
