# Authentication API - Testing Guide

## Overview

This guide provides comprehensive instructions for testing the Authentication APIs using Postman with dummy data for Indian street laborers. The authentication module handles user registration, login, password management, and secure token-based authentication.

## Base Configuration

### Environment Setup

- **Base URL**: `http://localhost:3000` (or your configured port)
- **API Prefix**: `/api/auth`

### Rate Limiting

Authentication endpoints have rate limiting configured:

- **Standard Auth Routes**: 50 requests per 15 minutes
- **Sensitive Operations**: 5 requests per 15 minutes (password reset, change password)

## API Endpoints Overview

### 🔓 Public Endpoints (No Authentication Required)

#### User Registration & Login

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token

#### Password Recovery

- `POST /api/auth/forgot-password` - Request password reset token
- `POST /api/auth/reset-password` - Reset password with token

#### Health Check

- `GET /api/auth/health` - Service health check

### 🔒 Protected Endpoints (Authentication Required)

#### Profile Management

- `GET /api/auth/profile` - Get current user profile
- `PUT /api/auth/profile` - Update user profile

#### Security Operations

- `PUT /api/auth/change-password` - Change password (requires current password)
- `POST /api/auth/logout` - Logout user (invalidate sessions)
- `GET /api/auth/verify` - Verify token validity

#### Location & Status

- `PUT /api/auth/location` - Update user location
- `PUT /api/auth/toggle-status` - Toggle active status (for laborers)

### 🔒 Admin-Only Endpoints

#### Bulk Operations

- `POST /api/auth/users/bulk` - Get multiple users by IDs (Admin/Employer only)

### 🧪 Development Endpoints (Development Mode Only)

#### Testing Utilities

- `GET /api/auth/dev/users` - Get all users (Dev only)
- `DELETE /api/auth/dev/users/:userId` - Delete user (Dev only)
- `POST /api/auth/dev/reset-user-password` - Reset user password (Dev only)

## Detailed Testing Instructions

## 🔓 Public Endpoint Testing

### 1. Health Check

**Endpoint**: `GET /api/auth/health`
**Method**: GET
**Headers**: None required

**Expected Response**:

```json
{
  "success": true,
  "message": "Authentication service is healthy",
  "timestamp": "2025-01-08T10:30:00.000Z"
}
```

### 2. User Registration

**Endpoint**: `POST /api/auth/register`
**Method**: POST
**Headers**:

```
Content-Type: application/json
```

**Body** (Laborer Registration):

```json
{
  "name": "राजेश कुमार (Rajesh Kumar)",
  "phoneNumber": "9876543210",
  "password": "Rajesh@123",
  "role": "laborer",
  "languagePreference": "hi"
}
```

**Body** (Employer Registration):

```json
{
  "name": "प्रिया शर्मा (Priya Sharma)",
  "phoneNumber": "9876543211",
  "password": "Priya@456",
  "role": "employer",
  "languagePreference": "hi"
}
```

**Body** (Admin Registration):

```json
{
  "name": "Admin User",
  "phoneNumber": "9876543212",
  "password": "Admin@789",
  "role": "admin",
  "languagePreference": "en"
}
```

**Expected Response**:

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "605c72ef1532071f38c6726a",
      "name": "राजेश कुमार (Rajesh Kumar)",
      "email": null,
      "phoneNumber": "98****3210",
      "role": "laborer",
      "languagePreference": "hi",
      "accountStatus": "active",
      "isActive": true,
      "isEmailVerified": false,
      "isPhoneVerified": false,
      "profilePicture": null,
      "walletBalance": 0,
      "location": null,
      "lastLogin": null,
      "createdAt": "2025-01-08T10:30:00.000Z",
      "updatedAt": "2025-01-08T10:30:00.000Z",
      "metadata": {
        "loginAttempts": 0,
        "registrationIP": "127.0.0.1",
        "userAgent": "Mozilla/5.0...",
        "deviceInfo": {
          "platform": "unknown",
          "mobile": false
        }
      }
    },
    "session": {
      "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expires_in": 86400,
      "expires_at": 1641648600,
      "refresh_token_expires_at": 1642253400,
      "token_type": "Bearer",
      "user": {
        "id": "605c72ef1532071f38c6726a",
        "aud": "labor2hire-client",
        "role": "laborer",
        "account_status": "active",
        "phone": "98****3210",
        "confirmed_at": "2025-01-08T10:30:00.000Z",
        "last_sign_in_at": null,
        "app_metadata": {
          "provider": "phone",
          "providers": ["phone"]
        },
        "user_metadata": {
          "name": "राजेश कुमार (Rajesh Kumar)",
          "language_preference": "hi",
          "role": "laborer"
        }
      }
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "sessionMetadata": {
      "sessionId": "session_1641562200_abc123def",
      "registrationTimestamp": "2025-01-08T10:30:00.000Z",
      "expiresAt": "2025-01-09T10:30:00.000Z",
      "refreshExpiresAt": "2025-01-15T10:30:00.000Z",
      "issuer": "labor2hire-backend",
      "audience": "labor2hire-client",
      "registrationMethod": "phone_password",
      "securityLevel": "standard",
      "mfaEnabled": false,
      "permissions": {
        "canCreateJobs": false,
        "canApplyToJobs": true,
        "canManagePayments": false,
        "hasWallet": true,
        "canWithdraw": true,
        "canDeposit": true,
        "geoLocation": true,
        "realTimeTracking": true,
        "premiumFeatures": false
      },
      "features": {
        "canCreateJobs": false,
        "canApplyToJobs": true,
        "canManagePayments": false,
        "hasWallet": true,
        "canWithdraw": true,
        "canDeposit": true,
        "geoLocation": true,
        "realTimeTracking": true,
        "premiumFeatures": false
      },
      "onboardingRequired": true
    }
  }
}
```

### 3. User Login

**Endpoint**: `POST /api/auth/login`
**Method**: POST
**Headers**:

```
Content-Type: application/json
```

**Body** (Laborer Login):

```json
{
  "phoneNumber": "9876543210",
  "password": "Rajesh@123"
}
```

**Body** (Employer Login):

```json
{
  "phoneNumber": "9876543211",
  "password": "Priya@456"
}
```

**Expected Response**:

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "605c72ef1532071f38c6726a",
      "name": "राजेश कुमार (Rajesh Kumar)",
      "email": null,
      "phoneNumber": "98****3210",
      "role": "laborer",
      "languagePreference": "hi",
      "accountStatus": "active",
      "isActive": true,
      "isEmailVerified": false,
      "isPhoneVerified": false,
      "profilePicture": null,
      "walletBalance": 0,
      "location": null,
      "lastLogin": "2025-01-08T10:30:00.000Z",
      "createdAt": "2025-01-08T10:30:00.000Z",
      "updatedAt": "2025-01-08T10:30:00.000Z",
      "metadata": {
        "loginAttempts": 0,
        "lastLoginIP": "127.0.0.1",
        "userAgent": "Mozilla/5.0...",
        "deviceInfo": {
          "platform": "unknown",
          "mobile": false
        }
      }
    },
    "session": {
      "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expires_in": 86400,
      "expires_at": 1641648600,
      "refresh_token_expires_at": 1642253400,
      "token_type": "Bearer"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "sessionMetadata": {
      "sessionId": "session_1641562200_xyz789abc",
      "loginTimestamp": "2025-01-08T10:30:00.000Z",
      "expiresAt": "2025-01-09T10:30:00.000Z",
      "refreshExpiresAt": "2025-01-15T10:30:00.000Z",
      "issuer": "labor2hire-backend",
      "audience": "labor2hire-client",
      "loginMethod": "phone_password",
      "securityLevel": "standard",
      "mfaEnabled": false,
      "permissions": {
        "canCreateJobs": false,
        "canApplyToJobs": true,
        "canManagePayments": false,
        "hasWallet": true,
        "canWithdraw": true,
        "canDeposit": true,
        "geoLocation": true,
        "realTimeTracking": true,
        "premiumFeatures": false
      },
      "features": {
        "canCreateJobs": false,
        "canApplyToJobs": true,
        "canManagePayments": false,
        "hasWallet": true,
        "canWithdraw": true,
        "canDeposit": true,
        "geoLocation": true,
        "realTimeTracking": true,
        "premiumFeatures": false
      }
    }
  }
}
```

### 4. Refresh Token

**Endpoint**: `POST /api/auth/refresh`
**Method**: POST
**Headers**:

```
Content-Type: application/json
```

**Body**:

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Note**: Refresh token can also be sent automatically via httpOnly cookie if set.

**Expected Response**:

```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "user": {
      "id": "605c72ef1532071f38c6726a",
      "name": "राजेश कुमार (Rajesh Kumar)",
      "phoneNumber": "98****3210",
      "role": "laborer",
      "languagePreference": "hi",
      "accountStatus": "active",
      "isPhoneVerified": false,
      "lastLogin": "2025-01-08T10:30:00.000Z",
      "createdAt": "2025-01-08T10:30:00.000Z",
      "updatedAt": "2025-01-08T10:30:00.000Z"
    },
    "session": {
      "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expires_in": 86400,
      "expires_at": 1641648600,
      "refresh_token_expires_at": 1642253400,
      "token_type": "Bearer"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "sessionMetadata": {
      "sessionId": "session_1641562200_refresh456",
      "refreshTimestamp": "2025-01-08T10:30:00.000Z",
      "expiresAt": "2025-01-09T10:30:00.000Z",
      "refreshExpiresAt": "2025-01-15T10:30:00.000Z",
      "issuer": "labor2hire-backend",
      "audience": "labor2hire-client",
      "refreshMethod": "refresh_token",
      "securityLevel": "standard",
      "mfaEnabled": false
    }
  }
}
```

### 5. Forgot Password

**Endpoint**: `POST /api/auth/forgot-password`
**Method**: POST
**Headers**:

```
Content-Type: application/json
```

**Body**:

```json
{
  "phoneNumber": "9876543210"
}
```

**Expected Response**:

```json
{
  "success": true,
  "message": "Password reset token sent to your phone number",
  "resetToken": "abc123def456789xyz"
}
```

**Note**: In production, the `resetToken` field will not be included. In development mode, it's included for testing purposes.

### 6. Reset Password

**Endpoint**: `POST /api/auth/reset-password`
**Method**: POST
**Headers**:

```
Content-Type: application/json
```

**Body**:

```json
{
  "resetToken": "abc123def456789xyz",
  "newPassword": "NewRajesh@456"
}
```

**Expected Response**:

```json
{
  "success": true,
  "message": "Password reset successful"
}
```

## 🔒 Protected Endpoint Testing

**Authentication Required**: Include JWT token in all requests

```
Authorization: Bearer <your_jwt_token>
```

### 7. Get Profile

**Endpoint**: `GET /api/auth/profile`
**Method**: GET
**Headers**:

```
Authorization: Bearer <your_jwt_token>
```

**Expected Response**:

```json
{
  "success": true,
  "message": "Profile retrieved successfully",
  "data": {
    "user": {
      "id": "605c72ef1532071f38c6726a",
      "name": "राजेश कुमार (Rajesh Kumar)",
      "phoneNumber": "98****3210",
      "role": "laborer",
      "languagePreference": "hi",
      "accountStatus": "active",
      "isPhoneVerified": false,
      "lastLogin": "2025-01-08T10:30:00.000Z",
      "createdAt": "2025-01-08T10:30:00.000Z",
      "updatedAt": "2025-01-08T10:30:00.000Z"
    },
    "permissions": {
      "canCreateJobs": false,
      "canApplyToJobs": true,
      "canManagePayments": false,
      "hasWallet": true,
      "canWithdraw": true,
      "canDeposit": true,
      "geoLocation": true,
      "realTimeTracking": true,
      "premiumFeatures": false
    },
    "features": {
      "canCreateJobs": false,
      "canApplyToJobs": true,
      "canManagePayments": false,
      "hasWallet": true,
      "canWithdraw": true,
      "canDeposit": true,
      "geoLocation": true,
      "realTimeTracking": true,
      "premiumFeatures": false
    }
  }
}
```

### 8. Update Profile

**Endpoint**: `PUT /api/auth/profile`
**Method**: PUT
**Headers**:

```
Content-Type: application/json
Authorization: Bearer <your_jwt_token>
```

**Body** (Updating name and language preference):

```json
{
  "name": "राजेश कुमार सिंह (Rajesh Kumar Singh)",
  "languagePreference": "en"
}
```

**Expected Response**:

```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "user": {
      "id": "605c72ef1532071f38c6726a",
      "name": "राजेश कुमार सिंह (Rajesh Kumar Singh)",
      "phoneNumber": "98****3210",
      "role": "laborer",
      "languagePreference": "en",
      "accountStatus": "active",
      "isPhoneVerified": false,
      "lastLogin": "2025-01-08T10:30:00.000Z",
      "createdAt": "2025-01-08T10:30:00.000Z",
      "updatedAt": "2025-01-08T10:35:00.000Z"
    }
  }
}
```

### 9. Change Password

**Endpoint**: `PUT /api/auth/change-password`
**Method**: PUT
**Headers**:

```
Content-Type: application/json
Authorization: Bearer <your_jwt_token>
```

**Body**:

```json
{
  "currentPassword": "Rajesh@123",
  "newPassword": "NewRajesh@789"
}
```

**Expected Response**:

```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

### 10. Update Location

**Endpoint**: `PUT /api/auth/location`
**Method**: PUT
**Headers**:

```
Content-Type: application/json
Authorization: Bearer <your_jwt_token>
```

**Body** (Mumbai coordinates):

```json
{
  "coordinates": [72.8777, 19.076]
}
```

**Expected Response**:

```json
{
  "success": true,
  "message": "Location update endpoint available - to be integrated with geolocation service",
  "data": {
    "userId": "605c72ef1532071f38c6726a",
    "coordinates": [72.8777, 19.076],
    "timestamp": "2025-01-08T10:30:00.000Z"
  }
}
```

### 11. Toggle Active Status

**Endpoint**: `PUT /api/auth/toggle-status`
**Method**: PUT
**Headers**:

```
Authorization: Bearer <your_jwt_token>
```

**Expected Response**:

```json
{
  "success": true,
  "message": "Toggle active status endpoint available - to be implemented",
  "data": {
    "userId": "605c72ef1532071f38c6726a",
    "timestamp": "2025-01-08T10:30:00.000Z"
  }
}
```

### 12. Verify Token

**Endpoint**: `GET /api/auth/verify`
**Method**: GET
**Headers**:

```
Authorization: Bearer <your_jwt_token>
```

**Expected Response**:

```json
{
  "success": true,
  "message": "Token is valid",
  "data": {
    "user": {
      "id": "605c72ef1532071f38c6726a",
      "role": "laborer",
      "accountStatus": "active"
    }
  }
}
```

### 13. Logout

**Endpoint**: `POST /api/auth/logout`
**Method**: POST
**Headers**:

```
Authorization: Bearer <your_jwt_token>
```

**Expected Response**:

```json
{
  "success": true,
  "message": "Logout successful"
}
```

## 🔒 Admin-Only Endpoint Testing

**Authentication Required**: Include JWT token with admin or employer role

```
Authorization: Bearer <admin_or_employer_jwt_token>
```

### 14. Get Users by IDs (Bulk)

**Endpoint**: `POST /api/auth/users/bulk`
**Method**: POST
**Headers**:

```
Content-Type: application/json
Authorization: Bearer <admin_or_employer_jwt_token>
```

**Body**:

```json
{
  "userIds": [
    "605c72ef1532071f38c6726a",
    "605c72ef1532071f38c6726b",
    "605c72ef1532071f38c6726c"
  ]
}
```

**Expected Response**:

```json
{
  "success": true,
  "message": "Users retrieved successfully",
  "data": {
    "users": [
      {
        "id": "605c72ef1532071f38c6726a",
        "name": "राजेश कुमार (Rajesh Kumar)",
        "phoneNumber": "9876543210",
        "role": "laborer",
        "accountStatus": "active",
        "isPhoneVerified": false,
        "createdAt": "2025-01-08T10:30:00.000Z"
      },
      {
        "id": "605c72ef1532071f38c6726b",
        "name": "प्रिया शर्मा (Priya Sharma)",
        "phoneNumber": "98****3211",
        "role": "employer",
        "accountStatus": "active",
        "isPhoneVerified": false,
        "createdAt": "2025-01-08T10:31:00.000Z"
      }
    ]
  }
}
```

**Note**: Admins see full phone numbers, employers see masked numbers.

## Error Handling

### Common Error Responses

**400 Bad Request** - Validation errors:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "phoneNumber",
      "message": "Phone number must be between 10 and 15 digits"
    },
    {
      "field": "password",
      "message": "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    }
  ],
  "timestamp": "2025-01-08T10:30:00.000Z"
}
```

**401 Unauthorized** - Authentication errors:

```json
{
  "success": false,
  "message": "Invalid credentials",
  "timestamp": "2025-01-08T10:30:00.000Z"
}
```

**403 Forbidden** - Insufficient permissions:

```json
{
  "success": false,
  "message": "Insufficient permissions",
  "timestamp": "2025-01-08T10:30:00.000Z"
}
```

**409 Conflict** - Duplicate registration:

```json
{
  "success": false,
  "message": "Phone number already registered",
  "timestamp": "2025-01-08T10:30:00.000Z"
}
```

**429 Too Many Requests** - Rate limit exceeded:

```json
{
  "success": false,
  "message": "Too many requests. Please try again later.",
  "retryAfter": 900,
  "timestamp": "2025-01-08T10:30:00.000Z"
}
```

### Account Security Errors

**Account Locked**:

```json
{
  "success": false,
  "message": "Account is temporarily locked due to too many failed login attempts",
  "timestamp": "2025-01-08T10:30:00.000Z"
}
```

**Account Suspended**:

```json
{
  "success": false,
  "message": "Account is suspended",
  "timestamp": "2025-01-08T10:30:00.000Z"
}
```

**Invalid Reset Token**:

```json
{
  "success": false,
  "message": "Invalid or expired reset token",
  "timestamp": "2025-01-08T10:30:00.000Z"
}
```

## Data Validation Rules

### User Registration

- **name**: Required, 2-100 characters, supports Unicode (Hindi/English names)
- **phoneNumber**: Required, 10-15 digits, automatically sanitized
- **password**: Required, minimum 8 characters, must contain:
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
  - At least one special character
- **role**: Required, one of: "laborer", "employer", "admin"
- **languagePreference**: Optional, one of: "en", "es", "fr", "de", "it", "pt", "zh", "ja", "ko", "ar", "hi"

### Phone Number Handling

- Automatically removes non-digit characters
- Handles country code (removes +91 or 91 prefix for Indian numbers)
- Validates final length (10 digits for Indian numbers)
- Ensures uniqueness across all users

### Password Security

- Minimum 8 characters, maximum 128 characters
- Must contain uppercase, lowercase, number, and special character
- Cannot be the same as current password when changing
- Automatically hashed using bcrypt with 12 salt rounds
- Account locks after 5 failed attempts for 2 hours

### Account Status Values

- **active**: Normal account, full access
- **inactive**: Temporary deactivation, no login allowed
- **suspended**: Administrative suspension, no login allowed
- **banned**: Permanent ban, no login allowed

## Security Features

### Token Management

- **Access Tokens**: 24-hour expiration, contains user ID, role, account status
- **Refresh Tokens**: 7-day expiration, used to get new access tokens
- **Token Blacklisting**: Logout invalidates all user sessions
- **Device Fingerprinting**: Enhanced security against token theft
- **Session Tracking**: Multiple login sessions supported with individual invalidation

### Rate Limiting

- **Authentication endpoints**: 50 requests per 15 minutes per IP
- **Sensitive operations**: 5 requests per 15 minutes per IP
- **User-specific limits**: Applied after authentication

### Password Security

- **Bcrypt hashing**: 12 salt rounds for strong password security
- **Account lockout**: 5 failed attempts locks account for 2 hours
- **Password reset**: 15-minute token expiration
- **Secure token generation**: Cryptographically secure random tokens

## Testing Workflow

### Standard User Flow

1. **Health Check**: Verify service is running
2. **Registration**: Create new laborer account
3. **Login**: Authenticate and get tokens
4. **Profile Management**: Update profile information
5. **Security Operations**: Change password, verify token
6. **Location Update**: Test location endpoints
7. **Logout**: Clean session termination

### Password Recovery Flow

1. **Forgot Password**: Request reset token with phone number
2. **Reset Password**: Use token to set new password
3. **Login**: Verify new password works
4. **Change Password**: Test authenticated password change

### Admin Flow

1. **Admin Registration**: Create admin account
2. **Bulk User Retrieval**: Test admin-only endpoints
3. **User Management**: Admin operations on user accounts

### Error Testing

1. **Invalid Credentials**: Test wrong password/phone
2. **Duplicate Registration**: Test phone number uniqueness
3. **Rate Limiting**: Test with rapid requests
4. **Token Expiration**: Test with expired tokens
5. **Validation Errors**: Test with invalid data formats

## Sample Test Data

### Indian Laborer Profiles

```json
{
  "name": "अमित पटेल (Amit Patel)",
  "phoneNumber": "9876543213",
  "password": "Amit@123",
  "role": "laborer",
  "languagePreference": "hi"
}
```

```json
{
  "name": "सुनीता देवी (Sunita Devi)",
  "phoneNumber": "9876543214",
  "password": "Sunita@456",
  "role": "laborer",
  "languagePreference": "hi"
}
```

```json
{
  "name": "मोहन लाल (Mohan Lal)",
  "phoneNumber": "9876543215",
  "password": "Mohan@789",
  "role": "laborer",
  "languagePreference": "hi"
}
```

### Employer Profiles

```json
{
  "name": "रोहित अग्रवाल (Rohit Agarwal)",
  "phoneNumber": "9876543216",
  "password": "Rohit@123",
  "role": "employer",
  "languagePreference": "en"
}
```

```json
{
  "name": "निकिता जैन (Nikita Jain)",
  "phoneNumber": "9876543217",
  "password": "Nikita@456",
  "role": "employer",
  "languagePreference": "hi"
}
```

## Troubleshooting

### Common Issues

1. **"Phone number already registered"**: Each phone number can only be used once
2. **"Invalid credentials"**: Check phone number format and password
3. **"Token has expired"**: Use refresh token to get new access token
4. **"Account is temporarily locked"**: Wait 2 hours or contact admin
5. **"Rate limit exceeded"**: Wait for rate limit window to reset

### Debug Tips

- Check phone number format (10 digits without country code)
- Verify password meets complexity requirements
- Ensure proper Content-Type headers for POST/PUT requests
- Use development endpoints to check user data
- Monitor server logs for detailed error information
- Test with different roles to understand permission levels

### Phone Number Formats

**Supported formats** (all converted to 10-digit format):

- `9876543210` ✅
- `+919876543210` ✅ (converted to 9876543210)
- `919876543210` ✅ (converted to 9876543210)
- `98765-43210` ✅ (converted to 9876543210)
- `+91 98765 43210` ✅ (converted to 9876543210)

**Invalid formats**:

- `123456789` ❌ (too short)
- `98765432101` ❌ (too long)
- `abcd1234567` ❌ (contains letters)

## Notes

- All timestamps are in ISO 8601 format
- Phone numbers are automatically masked in responses (showing only first 2 and last 2 digits)
- Passwords are never returned in any response
- Session cookies are httpOnly and secure in production
- All endpoints support CORS for web client testing
- Token JTI (JWT ID) is used for session tracking and invalidation
- Device fingerprinting helps detect token theft
- All user input is sanitized and validated
- Sensitive operations require additional rate limiting

## Development Mode Features

When `NODE_ENV=development`:

- Password reset tokens are included in forgot-password responses
- Additional development endpoints are available
- Enhanced error messages with stack traces
- Relaxed CORS policies
- Extended token expiration for testing
