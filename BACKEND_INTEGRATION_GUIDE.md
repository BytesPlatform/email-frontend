# Backend API Integration Guide

## Overview
Your email frontend application has been updated to integrate with your NestJS backend API for authentication. The system now uses HTTP-only cookies for secure authentication instead of localStorage-based authentication.

## What's Been Updated

### 1. API Client Service (`src/services/apiClient.ts`)
- Created a comprehensive API client for backend communication
- Handles HTTP-only cookies automatically with `credentials: 'include'`
- Includes timeout and error handling
- Supports all CRUD operations

### 2. Authentication Service (`src/services/authService.ts`)
- Updated to use backend API with HTTP-only cookies
- Maintains localStorage for client data persistence (UI state only)
- Includes fallback mechanisms for offline scenarios
- Proper error handling and user feedback

### 3. Next.js API Routes
- `/api/auth/login` - Proxies login requests to backend
- `/api/auth/signup` - Proxies signup requests to backend
- `/api/auth/logout` - Proxies logout requests to backend
- `/api/auth/profile` - Proxies profile requests to backend
- `/api/auth/verify` - Proxies token verification requests to backend

### 4. Configuration (`src/lib/constants.ts`)
- Backend API URL configuration
- Storage keys for consistent localStorage usage
- API timeout and retry settings

### 5. Type Definitions (`src/types/auth.ts`)
- Updated to match your backend `Client` structure
- Includes optional fields: phone, city, country, address
- Maintains backward compatibility

## Your Backend API Structure

Based on your provided backend code, the frontend now integrates with:

### Authentication Endpoints

#### POST `/auth/signup`
**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe",
  "phone": "+1234567890",
  "city": "New York",
  "country": "USA",
  "address": "123 Main St"
}
```

**Response (Success):**
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "user@example.com",
  "phone": "+1234567890",
  "city": "New York",
  "country": "USA",
  "address": "123 Main St",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

#### POST `/auth/login`
**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (Success):**
```json
{
  "message": "Login successful",
  "client": {
    "id": 1,
    "name": "John Doe",
    "email": "user@example.com",
    "phone": "+1234567890",
    "city": "New York",
    "country": "USA",
    "address": "123 Main St"
  }
}
```

**Note:** The backend sets an HTTP-only cookie (`access_token`) automatically.

#### POST `/auth/logout`
**Headers:** Cookie with `access_token`
**Response:**
```json
{
  "message": "Logout successful"
}
```

#### GET `/auth/profile`
**Headers:** Cookie with `access_token`
**Response:**
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "user@example.com",
  "phone": "+1234567890",
  "city": "New York",
  "country": "USA",
  "address": "123 Main St",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

#### GET `/auth/verify`
**Headers:** Cookie with `access_token`
**Response:**
```json
{
  "valid": true,
  "client": {
    "id": 1,
    "name": "John Doe",
    "email": "user@example.com",
    "phone": "+1234567890",
    "city": "New York",
    "country": "USA",
    "address": "123 Main St"
  }
}
```

## Environment Configuration

Create a `.env.local` file in your project root:

```env
# Backend API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3000
# For production, replace with your actual backend URL
# NEXT_PUBLIC_API_URL=https://your-backend-domain.com

# API Configuration
API_TIMEOUT=10000
API_RETRY_ATTEMPTS=3
```

## Testing the Integration

### 1. Start Your Backend Server
Make sure your NestJS backend is running on the configured port (default: 3000)

### 2. Start the Frontend
```bash
npm run dev
```

### 3. Test Authentication Flow
1. Navigate to `/auth/register`
2. Create a new account with optional fields (phone, city, country, address)
3. Login with the created account
4. Verify you're redirected to `/dashboard`
5. Test logout functionality
6. Test profile verification

## Security Features

### Current Implementation
- ✅ HTTP-only cookie authentication (more secure than localStorage)
- ✅ Automatic cookie handling in API requests
- ✅ Proper error handling
- ✅ Request timeout protection
- ✅ Cookie forwarding in Next.js API routes

### Backend Security (Your Implementation)
- ✅ Password hashing with bcrypt
- ✅ JWT token-based authentication
- ✅ HTTP-only cookies for token storage
- ✅ Secure cookie settings (httpOnly, secure in production, sameSite: strict)
- ✅ Input validation with DTOs
- ✅ Prisma ORM for database operations

## Key Differences from Previous Implementation

1. **Authentication Method**: Now uses HTTP-only cookies instead of localStorage tokens
2. **User Model**: Changed from `User` to `Client` to match your backend
3. **Additional Fields**: Supports phone, city, country, address fields
4. **Endpoint Names**: Uses `/auth/signup` instead of `/auth/register`
5. **Response Structure**: Matches your backend's response format exactly

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Ensure your NestJS backend has proper CORS configuration
   - Allow credentials: `cors({ credentials: true })`

2. **Cookie Issues**
   - Check if cookies are being set properly in browser dev tools
   - Verify cookie domain and path settings
   - Ensure `credentials: 'include'` is set in fetch requests

3. **API Connection Issues**
   - Check if backend server is running
   - Verify the API URL in constants.ts
   - Check network connectivity

4. **Authentication Failures**
   - Verify JWT token format in backend
   - Check cookie expiration settings
   - Ensure proper cookie forwarding in Next.js API routes

### Debug Mode
Add this to your browser console to debug API calls:
```javascript
// Monitor API requests
window.addEventListener('unhandledrejection', event => {
  console.error('API Error:', event.reason);
});

// Check cookies
console.log('Cookies:', document.cookie);
```

## Next Steps

1. **Test the integration** thoroughly with your backend
2. **Add additional features** like password reset, email verification
3. **Implement refresh tokens** for better security
4. **Add API rate limiting** and monitoring
5. **Update UI components** to use the new Client type if needed

## Migration Notes

- The demo account (`bytes@test.com` / `Aq123456`) is no longer available
- All authentication now goes through your NestJS backend API
- localStorage is still used for client data persistence (UI state only)
- The UI remains mostly the same - no major changes needed to components
- Authentication is now more secure with HTTP-only cookies
