# Firebase Quota-Safe Architecture

This project is optimized to stay within Firebase Spark plan limits during normal usage.

## Rules

- All Firestore access must go through service files in `src/services/`.
- Prefer `getDocs()` over `onSnapshot()` unless real-time updates are truly required.
- Always scope queries by `schoolId`.
- Always apply `limit()` for list queries.
- Never fetch full collections for dashboards, profile lookups, or route guards.
- Reuse cached results before issuing another Firestore read.
- Use manual refresh buttons instead of interval-based polling.

## Core Service

Use [`src/services/firebaseService.ts`](./src/services/firebaseService.ts) for:

- cached document reads
- cached filtered queries
- deduplicated in-flight requests
- debug logging of Firestore reads
- single global Firebase auth subscription

## Example Query Patterns

```ts
const students = await queryFirestoreCollectionCached({
  collectionName: "students",
  filters: [{ field: "schoolId", value: currentSchoolId }],
  limitCount: 20,
  cacheKey: `students:${currentSchoolId}:page-1`,
});
```

```ts
const matchingUsers = await queryFirestoreCollectionCached({
  collectionName: "users",
  filters: [{ field: "email", value: email.trim().toLowerCase() }],
  limitCount: 1,
  cacheKey: `users:email:${email.trim().toLowerCase()}`,
});
```

```ts
const school = await getFirestoreDocumentCached({
  collectionName: "schools",
  id: schoolId,
  cacheKey: `school:${schoolId}`,
});
```

## Component Rules

- Fetch only on page load or when the true dependency changes.
- Use stable dependency arrays in every `useEffect`.
- Do not call Firestore directly inside components.
- Do not re-fetch on every route change if the data itself did not change.

## Recommended Pagination

- Students: 20-50 per page
- Staff: 20-50 per page
- Notifications: 10-20 per page
- Attendance history: filter by date range and class before fetching

## Debugging

In development, `firebaseService.ts` logs:

- fresh reads
- cache hits
- in-flight request dedupes

Use those logs to confirm that each user action triggers only the expected queries.
