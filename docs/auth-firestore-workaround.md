# Auth + Authorization (Firestore Direct)

## Firestore schema (prefixed with dev-)

### dev-users

- `username` (string, unique via `usernameKey`)
- `usernameKey` (string, lowercase)
- `password` (MD5 hash)
- `role` (`admin` | `member`)
- `createdAt` (server timestamp)
- `clientCreatedAt` (ISO string)

### dev-matches

- `playerA` (string)
- `playerB` (string)
- `score` (string)
- `createdBy` (user id string)
- `createdAt` (server timestamp)
- `clientCreatedAt` (ISO string)

## Suggested security rules (workaround only)

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Direct client auth workaround: use custom headers is not available in rules.
    // Without Firebase Auth, request.auth == null always.

    // Hard lock everything by default.
    match /{document=**} {
      allow read, write: if false;
    }

    // Optional soft-open for dev only (NOT secure in production):
    // match /dev-matches/{matchId} {
    //   allow read: if true;
    //   allow create: if true;
    //   allow delete: if true; // cannot verify createdBy without request.auth
    // }
    //
    // match /dev-users/{userId} {
    //   allow read, write: if false;
    // }
  }
}
```

## Limitations (important)

- Không dùng Firebase Auth thì Firestore Rules không biết "current user" là ai (`request.auth == null`).
- Vì vậy rule kiểu "member chỉ delete match của mình" **không thể enforce thật sự** bằng rules.
- Mọi kiểm tra role/ownership hiện tại chỉ là **frontend enforcement**, có thể bị bypass nếu ai đó gọi Firestore API trực tiếp.

## Recommended safer path

- Dùng Firebase Auth (email/password hoặc custom token) để có `request.auth.uid` trong rules.
- Hoặc dùng backend (Cloud Functions/Server) làm gatekeeper cho CRUD nhạy cảm (users, delete match).
