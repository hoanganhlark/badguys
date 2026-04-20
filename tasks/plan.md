# Plan: Rankings Feature — Category Management + Snapshot Trends

## Context

The badminton club app has a fully-working Glicko-2 ranking system, but ranking levels ("Yo", "Lo", "Nè") are hardcoded in TypeScript types and helper files. There is no way to manage them from the UI or persist them in Firestore. There is also no snapshot/history system, so there is no way to show rank movement (▲ / ▼ / NEW) between sessions.

This plan adds:
1. A **CategoryManagementPage** (admin-only, mirrors UserManagementPage pattern) to CRUD ranking categories in Firestore
2. A **ranking snapshots** system so rank trends can be computed and displayed
3. An **enhanced RankingPanel** with category tabs, trend indicators, and auto-colored avatars

---

## Critical Files

| File | Role |
|---|---|
| `src/types.ts` | Add `RankingCategory`, `RankingSnapshot` types |
| `src/lib/firebase.ts` | Add service functions for categories + snapshots |
| `src/lib/rankingLevel.ts` | Unchanged — still used for legacy normalization |
| `src/components/CategoryManagementPage.tsx` | **New** admin page |
| `src/components/ranking/RankingSidebar.tsx` | Add "Categories" menu item (admin) |
| `src/components/ranking/RankingPanel.tsx` | Add tabs, avatars, trend indicators |
| `src/App.tsx` | Add `/dashboard/categories` route |
| `src/i18n/resources.ts` | Add translation strings |

---

## Firestore Schema (New Collections)

### `ranking-categories` — individual documents (not single-doc array)
```
/{id}: {
  name: string           // canonical key e.g. "Yo", "Lo", "Nè"
  displayName: string    // label shown in UI (can differ from name)
  order: number          // sort position (ascending)
  createdAt: Timestamp
  clientCreatedAt: string
}
```

Uses `addDoc` / `deleteDoc` / `updateDoc` — **same pattern as the `users` collection**, not the single-doc array pattern used by members/matches. Auto-generates dev-prefix via `getCollectionPath()`.

### `ranking-snapshots` — individual documents
```
/{id}: {
  createdAt: Timestamp
  clientCreatedAt: string
  ranks: [
    { memberId: number, memberName: string, rank: number, rankScore: number }
  ]
}
```

A snapshot is saved **before** clearing match history. Only the latest snapshot is needed for trend computation (query limit 1, orderBy createdAt desc).

---

## Dependency Order

```
Task 1 (types + firebase)
  └─► Task 2 (CategoryManagementPage)
  └─► Task 5 (snapshots logic in RankingPage)
        └─► Task 4 (trend indicators in RankingPanel)
Task 3 (routing + sidebar) — depends on Task 2
Task 6 (i18n) — can be done alongside any task
```

---

## Verification

1. `npm run build` — TypeScript must compile with no errors
2. Start dev server `npm run dev` and navigate to `/dashboard/categories` as admin → can CRUD categories
3. Navigate to `/dashboard/ranking` → category tabs appear, filtering works per level
4. Clear match history as admin → snapshot is saved to `dev-ranking-snapshots` in Firestore
5. Re-enter ranking page → trend indicators show (▲/▼/NEW/-) based on saved snapshot
6. Avatar shows correct first letter, consistent color per name
7. Non-admin users: Categories menu item not shown in sidebar; `/dashboard/categories` redirected by `<AdminRoute>`
8. Public `/ranking` route: no category management UI, tabs still visible for filtering
