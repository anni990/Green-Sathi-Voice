# Voice Bot Admin Interface - Setup & Testing Guide

## 🚀 Quick Start

### 1. Activate Virtual Environment (IMPORTANT!)
```bash
# Create virtual environment if not exists
python -m venv venv

# Activate virtual environment (Windows)
venv\Scripts\activate

# Or on Linux/Mac
source venv/bin/activate
```

### 2. Install Required Packages
```bash
pip install flask flask-cors pymongo python-dotenv google-generativeai speechrecognition gtts pydub requests
```

### 3. Setup Environment Variables
Create a `.env` file in the project root:
```
MONGODB_URL=mongodb://localhost:27017
DB_NAME=voice_bot
GEMINI_API_KEY=your_gemini_api_key_here
SECRET_KEY=your-secret-key-for-flask-sessions
```

### 4. Start MongoDB
Make sure MongoDB is running on your system.

### 5. Create Test Data
```bash
python create_test_data.py
```

### 6. Test Admin Interface
```bash
python test_admin.py
```

### 7. Run the Application
```bash
python app.py
```

### 8. Access Admin Panel
Open browser and go to: `http://localhost:5000/admin`

**Login Credentials:**
- Username: `admin`
- Password: `123456`

## 🎯 Admin Panel Features

### Dashboard
- ✅ Total users count
- ✅ Total conversations count
- ✅ Recent users (last 7 days)
- ✅ Average conversations per user
- ✅ User registration chart (daily)
- ✅ Language distribution chart
- ✅ Most active users table

### User Management
- ✅ View all users with pagination
- ✅ Search users by name/phone
- ✅ View detailed user information
- ✅ User conversation history

### Analytics
- ✅ Conversation analytics
- ✅ Hourly distribution charts
- ✅ Language usage statistics

### Settings
- ✅ Change admin password
- ✅ Session management

## 🔧 API Endpoints

All admin API endpoints are prefixed with `/admin/api/`:

- `GET /admin/api/dashboard` - Dashboard statistics
- `GET /admin/api/users` - Users list with pagination and search
- `GET /admin/api/users/<id>` - User details
- `GET /admin/api/users/<id>/conversations` - User conversations
- `GET /admin/api/search` - Search users
- `GET /admin/api/analytics` - Analytics data
- `POST /admin/api/change-password` - Change admin password

## 🎨 UI Features

- **Responsive Design**: Works on desktop, tablet, and mobile
- **Glassmorphism UI**: Modern translucent design
- **Real-time Charts**: Interactive charts using Chart.js
- **Search & Pagination**: Efficient data browsing
- **Modal Windows**: Detailed views for users
- **Loading States**: Smooth user experience
- **Notifications**: Success/error messages

## 🛠️ Troubleshooting

### Common Issues:

1. **Import Errors**: Make sure virtual environment is activated and packages are installed
2. **Database Connection**: Ensure MongoDB is running
3. **Missing Data**: Run `create_test_data.py` to add sample data
4. **Session Issues**: Check SECRET_KEY in .env file
5. **API Errors**: Check browser console for detailed error messages

### Environment Check:
```bash
# Check if in virtual environment
echo $VIRTUAL_ENV  # Should show virtual environment path

# Check installed packages
pip list | grep -E "(flask|pymongo)"

# Test database connection
python -c "from backend.models.database import db_manager; print('DB Connected:', db_manager.users.count_documents({}))"
```

## 📊 Sample Data

The `create_test_data.py` script creates:
- 8 sample users with different languages
- Multiple conversations per user
- Realistic timestamps (spread over 30 days)
- Various conversation patterns

This provides a rich dataset to demonstrate all admin panel features.

## 🔒 Security Notes

- Default admin password is `123456` - **CHANGE IN PRODUCTION**
- Sessions expire after 24 hours
- Admin routes are protected with authentication
- All API endpoints require valid admin session

## 📱 Mobile Compatibility

The admin interface is fully responsive:
- Collapsible sidebar on mobile
- Touch-friendly buttons
- Optimized table layouts
- Mobile-first design approach