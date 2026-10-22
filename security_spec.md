# Security Specification (`security_spec.md`)

## 1. Data Invariants
1. **Path ID Integrity**: Every `/registrations/{registrationId}` document ID must match `^[a-zA-Z0-9_\-]+$` with maximum length 128 (`isValidId(registrationId)`), and `incoming().id == registrationId`.
2. **Strict Schema Enforcement**: Every write to `/registrations/{registrationId}` must strictly match the 29 allowed keys defined in `firebase-blueprint.json` (`hasAll` and `hasOnly`). Shadow fields are strictly rejected.
3. **Bounded Participant Arrays**: `pesertaPutra`, `tempatLahirPutra`, `tanggalLahirPutra`, `pesertaPutri`, `tempatLahirPutri`, and `tanggalLahirPutri` must each be a list of exactly 8 elements (`size() == 8`) where the first element is a bounded string.
4. **Temporal Integrity**: On `create`, `createdAt == request.time` and `updatedAt == request.time`. On `update`, `createdAt == existing().createdAt` (immortal field) and `updatedAt == request.time`.
5. **Action-Based Update Isolation**: Updates to `/registrations/{registrationId}` may only modify `statusVerifikasi` and `updatedAt` (`affectedKeys().hasOnly(['statusVerifikasi', 'updatedAt'])`), with `statusVerifikasi` strictly constrained to `'Menunggu Verifikasi'` or `'Terverifikasi'`. All other fields are immutable after creation.

## 2. The "Dirty Dozen" Payloads
1. **Payload 1 (Shadow Field Injection on Create)**: Includes `"isSuperAdmin": true` in `/registrations/reg-1001`. Rejected by `.keys().hasOnly(...)`.
2. **Payload 2 (ID Poisoning Attack)**: Document path `/registrations/invalid$id!@#` or >128 chars. Rejected by `isValidId(registrationId)`.
3. **Payload 3 (Mismatched Body ID)**: Document path `/registrations/reg-1001` with body `id: "reg-9999"`. Rejected by `data.id == registrationId`.
4. **Payload 4 (Oversized String Denial-of-Wallet)**: `namaSekolah` with 5,000 characters. Rejected by `data.namaSekolah.size() <= 200`.
5. **Payload 5 (Unbounded Participant Array)**: `pesertaPutra` with 50 items. Rejected by `data.pesertaPutra.size() == 8`.
6. **Payload 6 (Forged Creation Timestamp)**: `createdAt` set to a past/future client timestamp instead of `request.time`. Rejected by `incoming().createdAt == request.time`.
7. **Payload 7 (Invalid Verification Status Enum)**: `statusVerifikasi: "HackedStatus"`. Rejected by `data.statusVerifikasi in ['Menunggu Verifikasi', 'Terverifikasi']`.
8. **Payload 8 (Immutable Field Tampering on Update)**: Updating `namaSekolah` or `totalBiaya` on an existing registration. Rejected by `incoming().diff(existing()).affectedKeys().hasOnly(['statusVerifikasi', 'updatedAt'])`.
9. **Payload 9 (Immortal `createdAt` Mutation on Update)**: Changing `createdAt` during an update. Rejected by `incoming().createdAt == existing().createdAt` and `affectedKeys()`.
10. **Payload 10 (Invalid `jumlahRegu` or `totalBiaya` Type/Range)**: Setting `jumlahRegu: -5` or `"dua"`. Rejected by `data.jumlahRegu is int && data.jumlahRegu >= 1 && data.jumlahRegu <= 10`.
11. **Payload 11 (Shadow Field Injection on Update)**: Updating `statusVerifikasi` while injecting `extraField: "malicious"`. Rejected by `affectedKeys().hasOnly(['statusVerifikasi', 'updatedAt'])` and `isValidRegistration(incoming())`.
12. **Payload 12 (Unprotected Collection Write)**: Writing to `/unprotected_collection/doc1`. Rejected by default-deny catch-all `match /{document=**} { allow read, write: if false; }`.
