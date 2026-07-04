# Firebase Setup For MergeGuard AI

## Completed In Code

- Login and signup panel added to the website
- Firebase Auth connected with your web app config
- Firestore connected for saved review history
- Guest users still use browser localStorage
- Logged-in users save reviews to:

```text
users/{userId}/reviews/{reviewId}
```

## Finish These In Firebase Console

1. Go to Authentication.
2. Click Get started.
3. Open Sign-in method.
4. Enable Email/Password.
5. Go to Firestore Database.
6. Open Rules.
7. Replace the rules with the contents of `firestore.rules`.
8. Click Publish.

## Important

Firebase Auth stores and validates passwords securely. The app never stores passwords in Firestore.

## Testing

1. Refresh the local website.
2. Enter an email and a password with at least 6 characters.
3. Click Signup.
4. Create a sample review.
5. Check Firestore. A document should appear under:

```text
users / your-user-id / reviews / review-id
```
