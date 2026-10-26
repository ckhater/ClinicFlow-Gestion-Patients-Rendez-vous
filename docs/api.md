# ClinicFlow API Reference

Base URL: `http://localhost:4000/api`

All responses are JSON. Every request receives an `X-Request-Id` header; include it in bug reports. All timestamps are ISO-8601 UTC strings. Clinic-local dates are computed in `CLINIC_TIMEZONE` (default `Africa/Casablanca`).

## Authentication and CSRF

ClinicFlow uses a short-lived JWT stored in an **HttpOnly** cookie (`clinic_token`) and a double-submit CSRF token stored in a readable cookie (`clinic_csrf`). There is no public registration.

1. `GET /auth/csrf` sets the CSRF cookie and returns the token.
2. Send the token as `X-CSRF-Token` on every `POST`, `PUT`, `PATCH`, and `DELETE`.
3. Call `POST /auth/login` with email and password. The API sets the HttpOnly auth cookie.
4. Browser requests must use `credentials: "include"`. The frontend does this automatically.

The API also accepts `Authorization: Bearer <jwt>` for non-browser clients. Bearer requests are exempt from CSRF because browsers do not attach bearer tokens automatically.

```bash
# 1. Establish a CSRF cookie and capture the token
CSRF=$(curl -s -c cookies.txt http://localhost:4000/api/auth/csrf | jq -r .data.csrfToken)

# 2. Sign in
curl -s -b cookies.txt -c cookies.txt \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF" \
  -d '{"email":"admin@clinicflow.dev","password":"Admin123!"}' \
  http://localhost:4000/api/auth/login

# 3. Call an authenticated endpoint
curl -s -b cookies.txt http://localhost:4000/api/dashboard/stats
```

Development credentials are documented in the [README](../README.md#development-credentials).

## Response envelopes

```jsonc
// Single resource
{ "data": { "id": "…" } }

// List
{
  "data": [],
  "pagination": { "page": 1, "limit": 10, "total": 0, "totalPages": 0 }
}

// Error
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request contains invalid data",
    "details": [{ "path": "cin", "message": "CIN must be at least 5 characters" }],
    "requestId": "9a4f…"
  }
}
```

Common error codes: `VALIDATION_ERROR` (400), `UNAUTHORIZED` (401), `SESSION_EXPIRED` (401), `CSRF_TOKEN_MISSING` / `CSRF_TOKEN_INVALID` (403), `FORBIDDEN` (403), `NOT_FOUND` (404), `CONFLICT` (409), `UNPROCESSABLE_ENTITY` (422), `RATE_LIMITED` (429), `INTERNAL_ERROR` (500).

## Role matrix

| Capability | Admin | Staff |
| --- | :---: | :---: |
| Sign in, view dashboard | ✓ | ✓ |
| List/search/view patients | ✓ | ✓ |
| Create/update patients | ✓ | ✓ |
| Deactivate patients | ✓ | — |
| List/view/create appointments | ✓ | ✓ |
| Update appointments | ✓ | ✓ |
| Confirm/cancel appointments | ✓ | ✓ |
| Archive appointments | ✓ | — |
| List/create/update/deactivate team members | ✓ | — |

Permissions are enforced by the API; hiding a control in the UI is not a security boundary.

---

## Health

### `GET /health`

Public. Returns `200` when PostgreSQL is reachable, `503` otherwise.

```json
{
  "data": {
    "status": "ok",
    "database": "up",
    "uptime": 42,
    "timestamp": "2026-10-27T09:00:00.000Z"
  }
}
```

---

## Auth

### `GET /auth/csrf`

Public. Sets `clinic_csrf` and returns:

```json
{ "data": { "csrfToken": "64-hex-character-token" } }
```

### `POST /auth/login`

Public. Rate limited (10 failed attempts per 15 minutes per IP).

Body:

```json
{ "email": "admin@clinicflow.dev", "password": "Admin123!" }
```

Email is normalized to lowercase. Returns `200` with the public user and sets the auth cookie. Invalid credentials return `401` with the same message for unknown emails and wrong passwords.

### `GET /auth/me`

Authenticated. Returns the current user.

```json
{
  "data": {
    "id": "11111111-1111-4111-8111-111111111111",
    "fullName": "Amina Benali",
    "email": "admin@clinicflow.dev",
    "role": "admin",
    "createdAt": "2026-10-26T15:00:00.000Z",
    "updatedAt": "2026-10-26T15:00:00.000Z"
  }
}
```

### `POST /auth/logout`

Clears both cookies. Returns `204` with no body. Requires a valid CSRF token.

---

## Patients

### `GET /patients`

Authenticated. Paginated, case-insensitive search across name and CIN.

| Query | Type | Default | Notes |
| --- | --- | --- | --- |
| `page` | integer ≥ 1 | `1` | |
| `limit` | integer 1–100 | `10` | |
| `search` | string | — | At least 2 characters when supplied. CIN is normalized. |
| `sortBy` | `createdAt` \| `fullName` \| `birthDate` | `createdAt` | |
| `sortOrder` | `asc` \| `desc` | `desc` | |

```bash
curl -s -b cookies.txt "http://localhost:4000/api/patients?search=fatima&page=1&limit=10"
```

### `POST /patients`

Authenticated. Creates a patient. CIN is uppercased and whitespace-stripped; `birthDate` is `YYYY-MM-DD` and cannot be in the future.

```json
{
  "fullName": "Fatima Zahra El Fassi",
  "cin": "AB123456",
  "phone": "+212 661 234 567",
  "birthDate": "1988-03-14",
  "address": "12 Rue des Orangers, Casablanca"
}
```

`address` may be `null` or omitted. Duplicate CIN returns `409`.

### `GET /patients/:id`

Authenticated. Returns the patient plus all non-deleted appointments, newest first.

```json
{
  "data": {
    "id": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
    "fullName": "Fatima Zahra El Fassi",
    "cin": "AB123456",
    "phone": "+212 661 234 567",
    "birthDate": "1988-03-14",
    "address": "12 Rue des Orangers, Casablanca",
    "createdAt": "…",
    "updatedAt": "…",
    "appointments": []
  }
}
```

Returns `404` for unknown or soft-deleted patients.

### `PUT /patients/:id`

Authenticated. Partial update; at least one field is required. Accepted fields: `fullName`, `cin`, `phone`, `birthDate`, `address`.

### `DELETE /patients/:id`

**Admin only.** Soft-deletes the patient and, in the same transaction, cancels future `pending`/`confirmed` appointments. History is retained.

```json
{ "data": { "id": "…", "deletedAt": "2026-10-27T09:00:00.000Z" } }
```

---

## Appointments

### `GET /appointments`

Authenticated. Paginated and sorted by appointment date ascending.

| Query | Type | Notes |
| --- | --- | --- |
| `page` / `limit` | integers | Same pagination rules as patients. |
| `date` | `YYYY-MM-DD` | Filters to one clinic-local calendar day. |
| `status` | `pending` \| `confirmed` \| `cancelled` | |
| `patientId` | UUID | |
| `search` | string | Patient name or CIN. |

### `POST /appointments`

Authenticated. New appointments always start as `pending`. The patient must exist and be active. The appointment must be in the future.

```json
{
  "patientId": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
  "appointmentDate": "2026-10-28T08:00:00.000Z",
  "reason": "Annual check-up",
  "notes": "Patient requested a morning slot."
}
```

`appointmentDate` must be an ISO-8601 instant with an offset (`Z` is accepted). The frontend converts the clinic-local `datetime-local` input to UTC before sending it.

### `GET /appointments/:id`

Authenticated. Returns the appointment with patient and creator summaries. Archived appointments return `404`.

### `PUT /appointments/:id`

Authenticated. Updates the patient, date, reason, or notes. The appointment must be `pending` or `confirmed`; cancelled appointments return `422`. A new date must be in the future, and a new patient must exist and be active. At least one field is required.

```json
{
  "appointmentDate": "2026-10-29T09:30:00.000Z",
  "reason": "Follow-up consultation"
}
```

The status is intentionally not editable here — use the status endpoint so transition rules stay authoritative.

### `PATCH /appointments/:id/status`

Authenticated. Changes only the status; other fields in the body are ignored.

```json
{ "status": "confirmed" }
```

| From | To | Allowed |
| --- | --- | --- |
| `pending` | `confirmed` | ✓ |
| `pending` | `cancelled` | ✓ |
| `confirmed` | `cancelled` | ✓ |
| `confirmed` | `pending` | — |
| `cancelled` | any | — |
| same status | same status | — |

Invalid transitions return `422`.

### `DELETE /appointments/:id`

**Admin only.** Soft-archives the appointment: the row is retained with `deletedAt`, but it disappears from lists, detail lookups, dashboards, and patient timelines. Staff receive `403`.

```json
{ "data": { "id": "…", "deletedAt": "2026-10-27T09:00:00.000Z" } }
```

---

## Dashboard

### `GET /dashboard/stats`

Authenticated. Returns the dashboard payload:

```json
{
  "data": {
    "summary": {
      "totalActivePatients": 5,
      "todayAppointments": 4,
      "pendingAppointments": 3,
      "confirmedAppointments": 4
    },
    "todaySchedule": [],
    "upcoming": [],
    "statusBreakdown": [
      { "status": "pending", "count": 3 },
      { "status": "confirmed", "count": 4 },
      { "status": "cancelled", "count": 3 }
    ],
    "weeklyTrend": [{ "date": "2026-10-21", "count": 2 }],
    "generatedAt": "2026-10-27T09:00:00.000Z",
    "timezone": "Africa/Casablanca"
  }
}
```

- `todayAppointments` counts `pending + confirmed` on the current clinic day.
- `pendingAppointments` and `confirmedAppointments` are all-time active counts.
- `weeklyTrend` covers the last 7 clinic-local days, including cancelled appointments.
- `todaySchedule` and `upcoming` include patient/creator summaries.

---

## Users (admin only)

All `/users` endpoints require an active admin. Non-admins receive `403`.

### `GET /users`

Paginated. Query: `page`, `limit`, `search` (name/email), `role`, `sortBy` (`createdAt` \| `fullName` \| `role`), `sortOrder`.

### `POST /users`

```json
{
  "fullName": "Salma Idrissi",
  "email": "salma@clinicflow.dev",
  "password": "Staff123!",
  "role": "staff"
}
```

Password: 8–72 characters, at least one letter and one digit. Duplicate email returns `409`.

### `GET /users/:id`

Returns a public user. Password hashes are never returned.

### `PATCH /users/:id`

Partial update: `fullName`, `email`, `password`, `role`. Password is optional. An admin cannot change their own role. The last active admin cannot be demoted.

### `DELETE /users/:id`

Soft-deactivates a user. An admin cannot deactivate themselves. The last active admin cannot be deactivated. Existing sessions are rejected because the auth middleware checks the user on every request.

---

## Pagination and limits

- Default page size: `10`; maximum `100`.
- `totalPages` is `0` when there are no results.
- General API rate limit: 500 requests per 15 minutes per IP.
- Login rate limit: 10 failed attempts per 15 minutes per IP.
- JSON bodies are limited to `100kb`.
