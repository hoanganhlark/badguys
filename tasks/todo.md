# Task List: Rankings Feature

## Task 1 — Types + Firestore service layer
**Status:** pending  
**Files:** `src/types.ts`, `src/lib/firebase.ts`  
**Depends on:** None  
**Blocks:** Task 2, Task 5

Add `RankingCategory`, `RankingSnapshotEntry`, `RankingSnapshot` types to `src/types.ts`
Add Firebase service functions:
- `subscribeRankingCategories(onData, onError): () => void`
- `createRankingCategory(input: { name, displayName, order }): Promise<RankingCategory>`
- `updateRankingCategory(id, patch: Partial<{displayName, order}>): Promise<void>`
- `deleteRankingCategory(id): Promise<void>`
- `saveRankingSnapshot(ranks: RankingSnapshotEntry[]): Promise<void>`
- `getLatestRankingSnapshot(): Promise<RankingSnapshot | null>`

**Acceptance criteria:**
- [ ] Functions exported and TypeScript compiles
- [ ] Functions use `getCollectionPath()` for collection names
- [ ] Handle missing Firebase gracefully

---

## Task 2 — CategoryManagementPage component
**Status:** pending  
**Files:** `src/components/CategoryManagementPage.tsx`  
**Depends on:** Task 1  
**Blocks:** Task 3

Create new admin page mirroring UserManagementPage pattern:
- Copy `DASHBOARD_APPBAR_STYLE` from UserManagementPage
- Import RankingSidebar with `categoriesActive` flag
- Subscribe to categories with `subscribeRankingCategories`
- Form: displayName + order inputs
- Ant Design Table listing categories
- Inline edit: click row to edit displayName/order
- Delete with Popconfirm
- Loading/error states with Spin/Alert

**Acceptance criteria:**
- [ ] Page loads categories from Firestore
- [ ] Admin can create new category
- [ ] Admin can edit displayName and order
- [ ] Admin can delete category
- [ ] Page has loading + error states

---

## Task 3 — Wire into routing + sidebar
**Status:** pending  
**Files:** `src/App.tsx`, `src/components/ranking/RankingSidebar.tsx`, `src/components/RankingPage.tsx`  
**Depends on:** Task 2  
**Blocks:** None

In App.tsx:
- [ ] Add route: `/dashboard/categories` → `<AdminRoute><CategoryManagementPage /></AdminRoute>`

In RankingSidebar.tsx:
- [ ] Add prop: `onGoCategories?: () => void`
- [ ] Add prop: `categoriesActive?: boolean`
- [ ] Add menu item (admin-only): key="categories", icon=<AppstoreOutlined />, label=t("rankingSidebar.categories")
- [ ] Handle "categories" in handleMenuSelect

In RankingPage.tsx:
- [ ] Pass `onGoCategories={() => navigate("/dashboard/categories")}`
- [ ] Pass `categoriesActive={location.pathname === "/dashboard/categories"}`

**Acceptance criteria:**
- [ ] Sidebar menu item appears only for admins
- [ ] Clicking "Categories" navigates to `/dashboard/categories`
- [ ] Non-admins cannot access `/dashboard/categories` (redirected by AdminRoute)

---

## Task 4 — Enhanced RankingPanel: category tabs + avatars
**Status:** pending  
**Files:** `src/components/ranking/RankingPanel.tsx`, `src/components/RankingPage.tsx`  
**Depends on:** Task 5 (for trend indicators)  
**Blocks:** None

In RankingPage.tsx:
- [ ] Subscribe to categories with `subscribeRankingCategories`
- [ ] Store in state: `categories`, `selectedCategoryId`
- [ ] Pass to RankingPanel: `categories`, `selectedCategoryId`, `onSelectCategory`

In RankingPanel.tsx:
- [ ] Add category tab bar above table
  - [ ] "All" tab as first (unfiltered)
  - [ ] One tab per category, sorted by order
  - [ ] Active: primary color, white text, rounded
  - [ ] Inactive: gray text
- [ ] Filter rankings by `member.level === selectedCategory.name`
- [ ] Add Avatar column (before Name)
  - [ ] Show first letter of first name
  - [ ] Auto-color from name hash (9-color palette)
  - [ ] Consistent color per name
- [ ] Update Name column: first name normal, LAST NAME bold uppercase
- [ ] Update Points column: format with `toLocaleString()` commas, right-aligned
- [ ] Rank column: add trend indicator below rank number (from Task 5)

**Avatar color hash function:**
```ts
const AVATAR_COLORS = [
  "#ef5350","#ec407a","#ab47bc","#7e57c2",
  "#42a5f5","#26a69a","#66bb6a","#ffa726","#ff7043",
];
function getAvatarColor(name: string): string {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
```

**Acceptance criteria:**
- [ ] Category tabs appear and filter rankings correctly
- [ ] Avatar shows correct first letter + consistent color
- [ ] Name displays first/last name formatting
- [ ] Points are comma-formatted and right-aligned

---

## Task 5 — Ranking snapshots + trend indicators
**Status:** pending  
**Files:** `src/components/RankingPage.tsx`, `src/components/ranking/RankingPanel.tsx`  
**Depends on:** Task 1  
**Blocks:** Task 4 (for the UI)

In RankingPage.tsx:
- [ ] Load latest snapshot on mount: `getLatestRankingSnapshot()` → store in state
- [ ] When clearing history:
  - [ ] Before clearing, call `saveRankingSnapshot(currentRankings.map((r, i) => ...))`
  - [ ] Then clear matches as before
  - [ ] Reload snapshot after clear
- [ ] Compute `rankTrends: Record<number, number | "NEW">`
  - [ ] For each member: if not in snapshot → "NEW"
  - [ ] If in snapshot: previousRank - currentRank
- [ ] Pass `rankTrends` to RankingPanel

In RankingPanel.tsx:
- [ ] In rank column, render trend indicator below rank number
  - [ ] `change > 0`: `▲{change}` in green (`text-green-600`)
  - [ ] `change < 0`: `▼{Math.abs(change)}` in red (`text-red-500`)
  - [ ] `change === 0`: `-` in gray (`text-slate-400`)
  - [ ] `"NEW"`: blue badge `NEW` (`text-blue-600`)

**Acceptance criteria:**
- [ ] After clearing history, snapshot is saved to Firestore
- [ ] Re-entering ranking page shows trend indicators
- [ ] Members not in previous snapshot show "NEW"
- [ ] Rank changes (▲/▼/-) display correctly

---

## Task 6 — i18n strings
**Status:** pending  
**Files:** `src/i18n/resources.ts`  
**Depends on:** None (can do anytime)  
**Blocks:** None

Add Vietnamese translations:
- [ ] `categoryPage.title`: "Quản lý hạng"
- [ ] `categoryPage.subtitle`: "Quản lý các hạng đấu trong hệ thống xếp hạng."
- [ ] `categoryPage.createTitle`: "Thêm hạng mới"
- [ ] `categoryPage.name`: "Tên hạng (key)"
- [ ] `categoryPage.displayName`: "Tên hiển thị"
- [ ] `categoryPage.order`: "Thứ tự"
- [ ] `categoryPage.createButton`: "Thêm hạng"
- [ ] `categoryPage.creating`: "Đang thêm..."
- [ ] `categoryPage.delete`: "Xóa"
- [ ] `categoryPage.menu`: "Mở menu bảng điều khiển"
- [ ] `categoryPage.loadFailed`: "Không tải được danh sách hạng."
- [ ] `categoryPage.createFailed`: "Thêm hạng thất bại."
- [ ] `categoryPage.deleteFailed`: "Xóa hạng thất bại."
- [ ] `categoryPage.noCategories`: "Chưa có hạng nào."
- [ ] `rankingSidebar.categories`: "Quản lý hạng"
- [ ] `rankingPanel.allCategories`: "Tất cả"
- [ ] `rankingPanel.rankTrend`: "Xu hướng"
- [ ] `rankingPanel.noRankings`: "Chưa có dữ liệu xếp hạng."

**Acceptance criteria:**
- [ ] All strings added to i18n resources
- [ ] App compiles with no missing translation warnings

---

## Summary

| Task | Status | Depends | Blocks |
|------|--------|---------|--------|
| 1. Types + Firebase | pending | — | 2, 5 |
| 2. CategoryManagementPage | pending | 1 | 3 |
| 3. Routing + Sidebar | pending | 2 | — |
| 4. RankingPanel Tabs + Avatars | pending | 5 | — |
| 5. Snapshots + Trends | pending | 1 | 4 |
| 6. i18n Strings | pending | — | — |

**Critical path:** 1 → 2 → 3 (and 1 → 5 → 4)  
**Parallel work:** 6 can be done alongside any task
