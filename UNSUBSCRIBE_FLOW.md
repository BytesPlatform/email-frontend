# 🚫 Frontend Unsubscribe Flow

## Overview

The frontend provides API methods for handling unsubscribe functionality, which integrates with the backend's unsubscribe system.

---

## 🔑 Token System

### Two Separate Tokens
When an email is sent, the backend generates **two separate tokens**:

1. **`trackingPixelToken`** - Used for tracking pixel (1x1 image)
   - Stored in: `EmailLog.trackingPixelToken`
   - Used for: Email open tracking via custom pixel

2. **`unsubscribeToken`** - Used for unsubscribe link
   - Stored in: `EmailLog.unsubscribeToken`
   - Used for: Unsubscribe functionality

### Important Notes
- **DO NOT** use `trackingPixelToken` for unsubscribe links
- **ALWAYS** use `unsubscribeToken` for unsubscribe functionality
- The backend looks up by `unsubscribeToken` first, with `trackingPixelToken` as fallback for backward compatibility

---

## 📡 API Methods

### 1. Get Unsubscribe History
```typescript
unsubscribeApi.getUnsubscribeHistory(token: string)
```
- **Endpoint:** `GET /emails/unsubscribe/history/:token`
- **Purpose:** Check if a contact is already unsubscribed
- **Returns:** `UnsubscribeHistory` with subscription status

### 2. Process Unsubscribe
```typescript
unsubscribeApi.processUnsubscribe(token: string, reason?: string)
```
- **Endpoint:** `POST /emails/unsubscribe/:token`
- **Purpose:** Unsubscribe a contact from emails
- **Note:** Backend returns HTML confirmation page by default

### 3. Resubscribe
```typescript
unsubscribeApi.resubscribe(token: string)
```
- **Endpoint:** `POST /emails/unsubscribe/resubscribe/:token`
- **Purpose:** Resubscribe a previously unsubscribed contact

### 4. Get Unsubscribe Page URL
```typescript
unsubscribeApi.getUnsubscribePageUrl(token: string)
```
- **Returns:** Full URL to backend unsubscribe page
- **Format:** `${BASE_URL}/emails/unsubscribe/${token}`
- **Use Case:** Redirect users to unsubscribe page

### 5. Get Unsubscribe History Page URL
```typescript
unsubscribeApi.getUnsubscribeHistoryPageUrl(token: string)
```
- **Returns:** Full URL to backend unsubscribe history page
- **Format:** `${BASE_URL}/emails/unsubscribe/history/${token}`

---

## 🔄 Unsubscribe Flow

### Email Sent
1. Backend generates `unsubscribeToken` and `trackingPixelToken`
2. Unsubscribe link injected: `${BASE_URL}/emails/unsubscribe/${unsubscribeToken}`
3. Both tokens stored in `EmailLog` table

### User Clicks Unsubscribe
1. User clicks unsubscribe link in email
2. Redirected to: `/emails/unsubscribe/${unsubscribeToken}`
3. Backend looks up `EmailLog` by `unsubscribeToken`
4. Creates `EmailUnsubscribe` record
5. Shows confirmation page

### Future Emails
1. Before sending, backend checks `isUnsubscribed(contactId)`
2. If unsubscribed, email sending is blocked
3. Returns error: "Contact has unsubscribed from emails"

---

## 🌐 Environment Variables

### Required
```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

This should match the backend's `BASE_URL` environment variable to ensure unsubscribe links work correctly.

---

## 📝 TypeScript Types

### UnsubscribeResponse
```typescript
interface UnsubscribeResponse {
  success: boolean
  contactId: number
  message: string
}
```

### UnsubscribeHistory
```typescript
interface UnsubscribeHistory {
  contactId: number
  contactEmail: string
  isUnsubscribed: boolean
  unsubscribeRecord?: {
    id: number
    unsubscribedAt: string
    reason: string | null
  }
}
```

### UnsubscribeDto
```typescript
interface UnsubscribeDto {
  reason?: string
}
```

---

## ⚠️ Common Issues

### Issue: Token Mismatch
**Problem:** Frontend redirects with wrong token
**Solution:** Ensure you're using `unsubscribeToken` (not `trackingPixelToken`)

### Issue: Unsubscribe Link Not Working
**Check:**
1. Is `NEXT_PUBLIC_API_URL` set correctly?
2. Does the token match `EmailLog.unsubscribeToken` in database?
3. Is the backend endpoint accessible?

### Issue: Two Unsubscribe Links
**Fixed:** Backend now prevents duplicate injection
- Checks for existing `/emails/unsubscribe/` in HTML before injecting
- Uses `lastIndexOf()` for proper placement

---

## 🔗 Related Files

- **API:** `src/api/unsubscribe.ts`
- **Types:** `src/types/unsubscribe.ts`
- **Backend Controller:** `email-backend/src/modules/emails/unsubscribe/unsubscribe.controller.ts`
- **Backend Service:** `email-backend/src/modules/emails/unsubscribe/unsubscribe.service.ts`

---

## 📚 Additional Resources

- See `email-backend/EMAIL_TRACKING_FLOW.md` for complete tracking flow
- See backend API documentation for endpoint details

