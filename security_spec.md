# Security Specification & Test Payloads (Phase 0)

## 1. Data Invariants
- Teachers must be authenticated with verified email (or admin) to create/update classrooms, students, subjects, score items, and scores.
- Students and parents can query student records and scores via student code lookup.
- Teachers can only write to their own documents (`ownerId == request.auth.uid`) or if admin.
- Users cannot manipulate other users' profile documents (`users/{userId}` where `userId != request.auth.uid`).
- Scores cannot have negative values or exceed maximum allowed score for the score item.
- Document IDs must conform to regex `^[a-zA-Z0-9_\-]+$` and size <= 128 chars.

## 2. The "Dirty Dozen" Payloads
1. **Unauthenticated Profile Overwrite**: Anonymous user attempts to write to `/users/victim_user`. Expected: `PERMISSION_DENIED`.
2. **Ghost Field Injection**: Authenticated user attempts to write `{ isSuperAdmin: true }` in user document. Expected: `PERMISSION_DENIED`.
3. **Owner Spoofing**: User A creates a score document setting `ownerId: "user_B"`. Expected: `PERMISSION_DENIED`.
4. **Junk ID Poisoning**: Document write using 10KB string ID to cause resource exhaustion. Expected: `PERMISSION_DENIED`.
5. **Score Item Negative Max**: ScoreItem created with `max_score: -50`. Expected: `PERMISSION_DENIED`.
6. **Classroom Name Overflow**: Classroom creation with `name` exceeding 100 characters. Expected: `PERMISSION_DENIED`.
7. **Cross-User Student Deletion**: User A tries to delete Student owned by User B. Expected: `PERMISSION_DENIED`.
8. **Unverified Email Mutation**: User with unverified email attempts write operation. Expected: `PERMISSION_DENIED`.
9. **Invalid Score Status**: Score document with status `hacked_status`. Expected: `PERMISSION_DENIED`.
10. **Admin Escalation**: Normal user writing to `/admins/{uid}`. Expected: `PERMISSION_DENIED`.
11. **Score Value Overflow**: Score exceeding 10,000 points. Expected: `PERMISSION_DENIED`.
12. **Foreign Collection Creation**: Writing to an arbitrary collection like `/secret_backdoor`. Expected: `PERMISSION_DENIED`.
