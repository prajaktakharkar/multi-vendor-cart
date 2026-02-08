
# Comprehensive Security Review - Touchdown Travel Platform

## Executive Summary

This security review identified **8 findings** across authentication, database, and edge function layers. While the project has a solid foundation with proper RLS policies and role-based access control, there are several areas that require attention to ensure production readiness.

---

## Security Findings Summary

| Priority | Finding | Risk Level |
|----------|---------|------------|
| 1 | Leaked Password Protection Disabled | Warning |
| 2 | Transport Agent Missing Authentication | Error |
| 3 | API Credentials Stored in Database (Plaintext) | Error |
| 4 | Employees Cannot Update or Delete Own Bookings | Info |
| 5 | JSONB Fields May Store Sensitive Data Without Validation | Warning |
| 6 | Multi-Tenant Isolation Not Implemented | Warning |
| 7 | Admin Notes Visible to Employees | Info |
| 8 | Missing Rate Limiting on Edge Functions | Warning |

---

## Detailed Findings

### 1. Leaked Password Protection Disabled
**Risk Level:** Warning  
**Location:** Authentication configuration

**Issue:** The backend's leaked password protection is currently disabled. This feature checks passwords against known data breaches and prevents users from using compromised passwords.

**Remediation:**
- Enable leaked password protection in the backend authentication settings
- This is a one-click setting change with no code modifications required

---

### 2. Transport Agent Missing Authentication
**Risk Level:** Error  
**Location:** `supabase/functions/transport-agent/index.ts`

**Issue:** The transport-agent edge function does not validate authentication for chat interactions. While the `get_quotes` and `book` actions don't currently require auth, the function could be called by unauthenticated users, potentially allowing abuse of the AI gateway credits.

**Current Code:**
```typescript
// No auth check before AI chat processing
const { action, message, passengers, ... } = await req.json();
// Proceeds directly to AI gateway call
```

**Remediation:**
- Add authentication check at the start of the function
- Validate JWT token before processing any requests
- Fall back to limited functionality for unauthenticated users if needed

---

### 3. API Credentials Stored in Database (Plaintext)
**Risk Level:** Error  
**Location:** `flight_credentials` and `transport_credentials` tables

**Issue:** Third-party API keys and secrets (for Amadeus, Duffel, Uber, Lyft) are stored as plaintext in the database. While RLS restricts access to company admins, if an admin account is compromised, attackers could steal these credentials and make unauthorized bookings.

**Current Schema:**
```text
flight_credentials:
  - api_key (text, NOT NULL)
  - api_secret (text, nullable)

transport_credentials:
  - client_id (text, NOT NULL)
  - client_secret (text, NOT NULL)
```

**Remediation Options:**
1. **Preferred:** Store API credentials as Supabase Secrets (environment variables) rather than in database tables
2. **Alternative:** Implement encryption at rest using Supabase Vault or a custom encryption layer
3. Add audit logging for all credential access operations

---

### 4. Employees Cannot Manage Own Bookings
**Risk Level:** Info  
**Location:** `bookings` table RLS policies

**Issue:** Current RLS policies only allow employees to VIEW their own bookings. They cannot update or delete bookings assigned to them. This may be intentional for a managed travel system, but should be documented.

**Current Policies:**
- `Employees can view own bookings` (SELECT only)
- `Admins can manage all bookings` (ALL operations)

**Recommendation:**
- If intentional, document this as expected behavior
- If employees should be able to request changes, ensure the `change_requests` workflow is clearly communicated

---

### 5. JSONB Fields May Store Sensitive Data
**Risk Level:** Warning  
**Location:** `bookings.details`, `travel_requests.preferences`, `change_requests.requested_changes`

**Issue:** JSONB fields have flexible schemas, which means developers could inadvertently store sensitive information (passport numbers, credit cards, medical requirements) without proper validation or access controls.

**Affected Tables:**
- `bookings.details` - Could contain PII, payment info
- `travel_requests.preferences` - Could contain medical/dietary/accessibility needs
- `change_requests.requested_changes` - Could contain any type of data

**Remediation:**
1. Implement input validation on the client and edge functions to reject sensitive fields
2. Document allowed schema for each JSONB field
3. Consider adding database triggers to strip or reject sensitive patterns (credit card numbers, SSNs)
4. Review what data is currently being stored in these fields

---

### 6. Multi-Tenant Isolation Not Implemented
**Risk Level:** Warning  
**Location:** `companies` table and cross-company data access

**Issue:** The `companies` table exists but profiles/bookings are not linked to companies. Any company_admin can view ALL companies' data. If this system is intended to support multiple organizations, proper tenant isolation is missing.

**Current State:**
- `profiles` has `company_name` (text field, not a foreign key)
- No `company_id` linking users to companies
- Company admins can view all companies via RLS

**Remediation:**
- If single-tenant: Consider removing the `companies` table or documenting it as metadata only
- If multi-tenant: Add `company_id` foreign keys to all tables and update RLS policies accordingly

---

### 7. Admin Notes Visible to Employees
**Risk Level:** Info  
**Location:** `change_requests.admin_notes` and RLS policies

**Issue:** The `Employees can view own requests` policy includes the `admin_notes` column. This means employees can see internal notes left by administrators, which might contain confidential business reasoning or references to other employees.

**Remediation:**
- Create a view or database function that excludes `admin_notes` for non-admin access
- Or use column-level security (requires application-level implementation)
- Document that admin notes are visible to the requesting employee

---

### 8. Missing Rate Limiting on Edge Functions
**Risk Level:** Warning  
**Location:** All edge functions

**Issue:** Edge functions do not implement rate limiting. While the AI gateway has its own rate limits (handled with 429 responses), malicious actors could still flood the functions with requests, consuming resources.

**Remediation:**
1. Implement per-user rate limiting using a simple counter in the database
2. Add IP-based rate limiting for unauthenticated endpoints
3. Consider using Supabase's built-in rate limiting features when available

---

## What's Working Well

The project has several security best practices already implemented:

1. **Proper Role Architecture:** User roles are stored in a separate `user_roles` table with an enum type, preventing privilege escalation through direct profile modification

2. **Security Definer Function:** The `has_role()` function uses `SECURITY DEFINER` correctly to prevent infinite RLS recursion

3. **Restrictive RLS Policies:** All policies are RESTRICTIVE (not PERMISSIVE), providing defense-in-depth

4. **JWT Validation in Edge Functions:** Most authenticated edge functions properly validate JWTs using `getClaims()`

5. **Input Validation:** The Auth page uses Zod for email/password validation

6. **Proper Auth Flow:** Authentication implementation follows best practices with `onAuthStateChange` and proper session handling

7. **CORS Headers:** All edge functions include proper CORS headers

---

## Recommended Action Plan

### Immediate (High Priority)
1. Enable leaked password protection in backend settings
2. Add authentication to the transport-agent function
3. Migrate API credentials from database to Supabase Secrets

### Short-term (Medium Priority)  
4. Implement JSONB field validation
5. Add rate limiting to edge functions
6. Review and document admin notes visibility policy

### Long-term (Low Priority)
7. Implement multi-tenant isolation if needed
8. Add audit logging for sensitive operations
9. Consider column-level security for sensitive fields

---

## Technical Implementation Details

### Fix for Transport Agent Authentication

Add this code block at the start of the request handler:

```typescript
// Verify authentication for all requests
const authHeader = req.headers.get("Authorization");
if (!authHeader?.startsWith("Bearer ")) {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_ANON_KEY")!,
  { global: { headers: { Authorization: authHeader } } }
);

const token = authHeader.replace("Bearer ", "");
const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);

if (claimsError || !claimsData?.claims) {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
```

### JSONB Validation Example

Add validation before storing booking details:

```typescript
const sensitivePatterns = [
  /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/, // Credit card
  /\b\d{3}-\d{2}-\d{4}\b/, // SSN
  /passport/i,
];

function validateDetails(details: object): boolean {
  const json = JSON.stringify(details);
  return !sensitivePatterns.some(pattern => pattern.test(json));
}
```

---

## Files Requiring Changes

| File | Change Type | Priority |
|------|-------------|----------|
| `supabase/functions/transport-agent/index.ts` | Add authentication | High |
| Backend settings | Enable leaked password protection | High |
| `supabase/functions/search-flights/index.ts` | Move credentials to secrets | High |
| `supabase/functions/book-flight/index.ts` | Move credentials to secrets | High |
| All edge functions | Add rate limiting | Medium |
| `supabase/functions/travel-assistant/index.ts` | Add JSONB validation | Medium |

