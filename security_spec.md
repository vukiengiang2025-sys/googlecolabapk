# Elite OS Security Specification

## 1. Data Invariants
- Each `Task` must have a valid `ownerId` matching the authenticated user.
- `Log` entries are immutable once created and must belong to a user.
- `Snippet` objects can only be edited or deleted by their original creator (`ownerId`).
- All timestamps must be verified against `request.time`.
- String lengths are strictly capped to prevent resource exhaustion.

## 2. The "Dirty Dozen" Payloads

### P1: Identity Spoofing (Tasks)
```json
{
  "id": "J-FAKE",
  "name": "Malicious Task",
  "status": "XẾP_HÀNG",
  "ownerId": "ANOTHER_USER_ID",
  "createdAt": "2026-05-03T10:00:00Z"
}
```
*Expected: PERMISSION_DENIED (ownerId mismatch).*

### P2: State Shortcutting (Update Status to Success)
```json
{
  "status": "THÀNH_CÔNG"
}
```
*Expected: PERMISSION_DENIED (Missing validation helper and affectedKeys check).*

### P3: Resource Poisoning (Giant Document ID)
`POST /tasks/a_very_long_string_exceeding_128_chars_...`
*Expected: PERMISSION_DENIED (isValidId check failure).*

### P4: Immutable Field Breach (Task createdAt)
```json
{
  "createdAt": "2000-01-01T00:00:00Z"
}
```
*Expected: PERMISSION_DENIED (createdAt must be immutable).*

### P5: Unauthorized Log Injection
```json
{
  "msg": "I am an admin now",
  "level": "NGHIÊM_TRỌNG",
  "ownerId": "attacker_id"
}
```
*Expected: PERMISSION_DENIED (if trying to write to another user's stream or if level values are constrained).*

### P6: Shadow Field Attack (Tasks)
```json
{
  "id": "J-123",
  "name": "Normal",
  "status": "XẾP_HÀNG",
  "ownerId": "my_id",
  "createdAt": "SERVER_TIME",
  "isAdmin": true
}
```
*Expected: PERMISSION_DENIED (Extra fields not allowed in schema).*

### P7: Negative VRAM Value
```json
{
  "requirements": { "vram": -100 }
}
```
*Expected: PERMISSION_DENIED (vram must be > 0).*

### P8: Email Spoofing (Admin Simulation)
*User with unverified email tries to access admin-only pathways if they existed.*
*Expected: PERMISSION_DENIED (email_verified must be true).*

### P9: PII Leak Attempt
`GET /tasks/user_b_task_id` (by User A)
*Expected: PERMISSION_DENIED (Task access limited to owner).*

### P10: Terminal State Bypass
*Try to update a task that is already 'THÀNH_CÔNG' or 'LỖI'.*
*Expected: PERMISSION_DENIED (Status locking).*

### P11: Query Scraping (List Tasks)
`GET /tasks where ownerId != my_id`
*Expected: PERMISSION_DENIED (Rule enforces ownerId check on list).*

### P12: Invalid Timestamp (Future Creation)
```json
{
  "createdAt": "2099-01-01T00:00:00Z"
}
```
*Expected: PERMISSION_DENIED (Must match request.time).*

## 3. Test Runner (Conceptual Pattern)
*I will implement the rules to pass these tests.*
