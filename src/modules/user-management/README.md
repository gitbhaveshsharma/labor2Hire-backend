# User Management API - Testing Guide

## Overview

This guide provides comprehensive instructions for testing the User Management APIs using Postman with the provided dummy data for an Indian street laborer profile.

## Base Configuration

### Environment Setup

- **Base URL**: `http://localhost:3000` (or your configured port)
- **API Prefix**: `/api/user-profiles`

### Authentication

All user management endpoints require authentication. Include the following header in all requests:

```
Authorization: Bearer <your_jwt_token>
```

**Note**: You must first register/login through the authentication endpoints to obtain a JWT token.

## API Endpoints Overview

### 🔓 User Endpoints (All Authenticated Users)

#### Core Profile Management

- `POST /api/user-profiles` - Create user profile
- `GET /api/user-profiles/me` - Get own profile
- `GET /api/user-profiles/:profileId` - Get specific profile (Own profile only)
- `PUT /api/user-profiles/:profileId` - Update profile (Own profile only)

#### Search & Discovery

- `GET /api/user-profiles/search` - Search profiles with filters
- `GET /api/user-profiles/search/nearby` - Geographic search

#### Skills Management (Own Profile Only)

- `POST /api/user-profiles/:profileId/skills` - Add skill to own profile
- `PUT /api/user-profiles/:profileId/skills/:skillName` - Update skill in own profile
- `DELETE /api/user-profiles/:profileId/skills/:skillName` - Remove skill from own profile

#### Document Management (Own Profile Only)

- `POST /api/user-profiles/documents` - Add document to own profile
- `POST /api/user-profiles/documents/:documentId/decrypt` - Decrypt own document (requires password)
- `PUT /api/user-profiles/documents/:documentId` - Update own document (requires password)
- `DELETE /api/user-profiles/documents/:documentId` - Delete own document (requires password)

#### Analytics (Own Profile Only)

- `GET /api/user-profiles/:profileId/statistics` - Get own profile statistics
- `GET /api/user-profiles/:profileId/completeness` - Own profile completeness analysis

### 🔒 Admin-Only Endpoints

#### Profile Management

- `DELETE /api/user-profiles/:profileId` - Delete any user profile
- `GET /api/user-profiles/:profileId` - Get any user profile (with `?includeEncrypted=true`)
- `PUT /api/user-profiles/:profileId` - Update any user profile

#### Skills Management (Any Profile)

- `POST /api/user-profiles/:profileId/skills` - Add skill to any profile
- `PUT /api/user-profiles/:profileId/skills/:skillName` - Update skill in any profile
- `DELETE /api/user-profiles/:profileId/skills/:skillName` - Remove skill from any profile

#### Document Management (Any Profile)

- `POST /api/user-profiles/:profileId/documents` - Add document to any profile
- `GET /api/user-profiles/:profileId/documents/:documentId/decrypt` - Decrypt any user's document
- `PUT /api/user-profiles/:profileId/documents/:documentId/verify` - Update verification status

#### Analytics (Any Profile)

- `GET /api/user-profiles/:profileId/statistics` - Get any user's statistics
- `GET /api/user-profiles/:profileId/completeness` - Any user's profile completeness

## Detailed Testing Instructions

## 🔓 User Testing (Regular User/Laborer)

**Authentication Required**: Include JWT token in all requests

```
Authorization: Bearer <your_jwt_token>
```

### 1. Create User Profile

**Endpoint**: `POST /api/user-profiles`
**Method**: POST
**Headers**:

```
Content-Type: application/json
Authorization: Bearer <your_jwt_token>
```

**Body** (Raw JSON):

```json
{
  "personalInfo": {
    "firstName": "Rajesh",
    "lastName": "Kumar",
    "middleName": "Singh",
    "dateOfBirth": "1990-05-15",
    "gender": "male",
    "nationality": "Indian",
    "maritalStatus": "married"
  },
  "contactInfo": {
    "email": "rajesh.kumar@gmail.com",
    "alternateEmail": "rajesh.backup@gmail.com",
    "phoneNumber": "9876543210",
    "alternatePhoneNumber": "8765432109",
    "socialMedia": {
      "facebook": "https://facebook.com/rajesh.kumar",
      "linkedin": "https://linkedin.com/in/rajesh-kumar"
    }
  },
  "location": {
    "address": {
      "street": "123 MG Road",
      "city": "Mumbai",
      "state": "Maharashtra",
      "country": "India",
      "zipCode": "400001"
    },
    "coordinates": {
      "type": "Point",
      "coordinates": [72.8777, 19.076]
    },
    "timezone": "Asia/Kolkata"
  },
  "professionalInfo": {
    "workCategory": "construction",
    "skills": [
      {
        "name": "brick laying",
        "level": "experienced",
        "yearsOfExperience": 10
      },
      {
        "name": "concrete mixing",
        "level": "experienced",
        "yearsOfExperience": 8
      }
    ],
    "languages": [
      {
        "language": "Hindi",
        "proficiency": "native"
      },
      {
        "language": "English",
        "proficiency": "conversational"
      },
      {
        "language": "Marathi",
        "proficiency": "fluent"
      }
    ],
    "availability": "daily",
    "dailyRate": {
      "amount": 800,
      "currency": "INR"
    }
  },
  "preferences": {
    "notifications": {
      "email": true,
      "sms": false,
      "push": true,
      "jobAlerts": true,
      "messageAlerts": true
    },
    "privacy": {
      "profileVisibility": "public",
      "showEmail": false,
      "showPhone": true,
      "showLocation": true
    },
    "jobPreferences": {
      "preferredLocations": ["Mumbai", "Pune", "Nashik"],
      "maxCommuteDistance": 25,
      "workType": "on-site",
      "salaryExpectation": {
        "min": 600,
        "max": 1000,
        "currency": "INR"
      }
    }
  }
}
```

**Expected Response**:

- Status: `201 Created`
- Returns the created profile with `_id` and calculated `profileCompleteness`

### 2. Get Own Profile

**Endpoint**: `GET /api/user-profiles/me`
**Method**: GET
**Headers**:

```
Authorization: Bearer <your_jwt_token>
```

**Expected Response**:

- Status: `200 OK`
- Returns your complete profile with document IDs visible but numbers encrypted

### 3. Update Profile

**Endpoint**: `PUT /api/user-profiles/:profileId`
**Method**: PUT
**Headers**:

```
Content-Type: application/json
Authorization: Bearer <your_jwt_token>
```

**Sample Body** (updating availability and daily rate):

```json
{
  "professionalInfo": {
    "availability": "flexible",
    "dailyRate": {
      "amount": 900,
      "currency": "INR"
    }
  }
}
```

### 4. Add Skills

**Endpoint**: `POST /api/user-profiles/:profileId/skills`
**Method**: POST
**Headers**:

```
Content-Type: application/json
Authorization: Bearer <your_jwt_token>
```

**Body**:

```json
{
  "name": "tile installation",
  "level": "experienced",
  "yearsOfExperience": 5
}
```

### 5. Search Profiles

**Endpoint**: `GET /api/user-profiles/search`
**Method**: GET
**Headers**:

```
Authorization: Bearer <your_jwt_token>
```

**Query Parameters**:

```
?query=construction&skills=brick laying&page=1&limit=10
```

### 6. Geographic Search

**Endpoint**: `GET /api/user-profiles/search/nearby`
**Method**: GET
**Headers**:

```
Authorization: Bearer <your_jwt_token>
```

**Query Parameters**:

```
?latitude=19.076&longitude=72.8777&radius=10&page=1&limit=10
```

### 7. Add Verification Document

**Endpoint**: `POST /api/user-profiles/documents`
**Method**: POST
**Headers**:

```
Content-Type: application/json
Authorization: Bearer <your_jwt_token>
```

**Body**:

```json
{
  "type": "aadhar-card",
  "documentNumber": "1234-5678-9012",
  "issuingState": "Maharashtra",
  "issueDate": "2020-01-15"
}
```

### 8. Decrypt Own Document

**Endpoint**: `POST /api/user-profiles/documents/:documentId/decrypt`
**Method**: POST
**Headers**:

```
Content-Type: application/json
Authorization: Bearer <your_jwt_token>
```

**Body**:

```json
{
  "password": "your_account_password"
}
```

### 9. Get Profile Statistics

**Endpoint**: `GET /api/user-profiles/:profileId/statistics`
**Method**: GET
**Headers**:

```
Authorization: Bearer <your_jwt_token>
```

**Expected Response**: Profile completion, views, skills count, etc.

### 10. Get Profile Completeness

**Endpoint**: `GET /api/user-profiles/:profileId/completeness`
**Method**: GET
**Headers**:

```
Authorization: Bearer <your_jwt_token>
```

**Expected Response**: Detailed breakdown of profile completeness with suggestions.

## 🔒 Admin Testing (Administrator Users)

**Authentication Required**: Include JWT token with admin role in all requests

```
Authorization: Bearer <admin_jwt_token>
```

### 1. Get Any User Profile (with encrypted data)

**Endpoint**: `GET /api/user-profiles/:profileId`
**Method**: GET
**Headers**:

```
Authorization: Bearer <admin_jwt_token>
```

**Query Parameters**:

```
?includeEncrypted=true
```

**Expected Response**: Complete profile including encrypted document numbers.

### 2. Update Any User Profile

**Endpoint**: `PUT /api/user-profiles/:profileId`
**Method**: PUT
**Headers**:

```
Content-Type: application/json
Authorization: Bearer <admin_jwt_token>
```

**Sample Body** (updating verification status):

```json
{
  "verification": {
    "isIdentityVerified": true,
    "isPhoneVerified": true,
    "isEmailVerified": true
  }
}
```

### 3. Delete User Profile

**Endpoint**: `DELETE /api/user-profiles/:profileId`
**Method**: DELETE
**Headers**:

```
Authorization: Bearer <admin_jwt_token>
```

**Expected Response**: Confirmation of profile deletion.

### 4. Add Document to Any Profile

**Endpoint**: `POST /api/user-profiles/:profileId/documents`
**Method**: POST
**Headers**:

```
Content-Type: application/json
Authorization: Bearer <admin_jwt_token>
```

**Body**:

```json
{
  "type": "pan-card",
  "documentNumber": "ABCDE1234F",
  "issuingState": "Maharashtra",
  "issueDate": "2021-03-10"
}
```

### 5. Decrypt Any User's Document

**Endpoint**: `GET /api/user-profiles/:profileId/documents/:documentId/decrypt`
**Method**: GET
**Headers**:

```
Authorization: Bearer <admin_jwt_token>
```

**Expected Response**: Decrypted document details without requiring password.

### 6. Update Document Verification Status

**Endpoint**: `PUT /api/user-profiles/:profileId/documents/:documentId/verify`
**Method**: PUT
**Headers**:

```
Content-Type: application/json
Authorization: Bearer <admin_jwt_token>
```

**Body**:

```json
{
  "status": "verified"
}
```

### 7. Get Any User's Statistics

**Endpoint**: `GET /api/user-profiles/:profileId/statistics`
**Method**: GET
**Headers**:

```
Authorization: Bearer <admin_jwt_token>
```

**Expected Response**: Complete user analytics and statistics.

### 8. Manage Skills for Any Profile

**Add Skill**: `POST /api/user-profiles/:profileId/skills`
**Update Skill**: `PUT /api/user-profiles/:profileId/skills/:skillName`
**Remove Skill**: `DELETE /api/user-profiles/:profileId/skills/:skillName`

**Sample Body for Adding Skill**:

```json
{
  "name": "welding",
  "level": "expert",
  "yearsOfExperience": 15
}
```

## Error Handling

### Common Error Responses

**400 Bad Request** - Validation errors:

```json
{
  "success": false,
  "message": "Validation error",
  "errors": [
    "First name is required",
    "Phone number must be between 10 and 15 digits"
  ],
  "timestamp": "2025-06-08T10:30:00.000Z"
}
```

**401 Unauthorized** - Missing or invalid token:

```json
{
  "success": false,
  "message": "Access denied. No token provided.",
  "timestamp": "2025-06-08T10:30:00.000Z"
}
```

**403 Forbidden** - Insufficient permissions:

```json
{
  "success": false,
  "message": "Access denied. Insufficient permissions.",
  "timestamp": "2025-06-08T10:30:00.000Z"
}
```

**404 Not Found** - Resource not found:

```json
{
  "success": false,
  "message": "User profile not found",
  "timestamp": "2025-06-08T10:30:00.000Z"
}
```

## Data Validation Rules

### Personal Information

- `firstName` & `lastName`: Required, 2-50 characters
- `dateOfBirth`: Must be 16-100 years old
- `gender`: "male", "female", "other", "prefer-not-to-say"
- `nationality`: Only "Indian" supported
- `maritalStatus`: "single", "married", "divorced", "widowed", "prefer-not-to-say"

### Contact Information

- `phoneNumber`: Required, 10-15 digits
- `email`: Optional, valid email format
- Social media links: Optional, valid URLs

### Location

- `coordinates`: [longitude, latitude] format
- `city`, `state`, `country`: String fields with max length limits
- `zipCode`: Max 20 characters

### Professional Information

- `workCategory`: Predefined list including "construction", "cleaning", etc.
- `skills.level`: "beginner", "experienced", "expert"
- `languages.proficiency`: "basic", "conversational", "fluent", "native"
- `availability`: "daily", "weekly", "part-time", "flexible", "not-available"
- `dailyRate.currency`: Only "INR" supported

### Document Types

- "aadhar-card", "pan-card", "voter-id", "driving-license", "ration-card", "other"

## Testing Workflow

1. **Authentication**: First register/login to get JWT token
2. **Create Profile**: Use the provided dummy data
3. **Verify Creation**: Get own profile to confirm data
4. **Test Updates**: Update various profile sections
5. **Add Skills**: Test skill management endpoints
6. **Add Documents**: Test document verification workflow
7. **Search Testing**: Test search and nearby search
8. **Analytics**: Check statistics and completeness
9. **Error Testing**: Test with invalid data to verify validation

## Notes

- All timestamps are in ISO 8601 format
- Coordinates use GeoJSON Point format [longitude, latitude]
- Document numbers are automatically encrypted when stored
- Profile completeness is automatically calculated on save
- All endpoints support CORS for web client testing
- Rate limiting may apply depending on server configuration

## Troubleshooting

### Common Issues

1. **"User profile already exists"**: Each user can only have one profile
2. **"Email address is already in use"**: Email must be unique across all profiles
3. **"Invalid coordinates"**: Ensure longitude (-180 to 180) and latitude (-90 to 90)
4. **"Document type already exists"**: Each user can only have one document per type
5. **"Invalid password"**: Required for document encryption/decryption operations

### Debug Tips

- Check the `profileCompleteness` field to understand missing data
- Use the completeness endpoint for detailed suggestions
- Verify JWT token is not expired
- Ensure proper Content-Type headers for POST/PUT requests
- Check server logs for detailed error information
