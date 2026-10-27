# CTRL React

CTRL is the React productivity app. The original HTML/CSS/JavaScript prototype remains in `../signup-web`.

## Run locally

```bash
npm install
npm start
```

The app uses Firebase Authentication for sign-up/sign-in and Firestore for the signed-in user's `users/{uid}` document. Tasks and habits are saved to that document; completed focus sessions use atomic Firestore increments. Contact messages are written to the `messages` collection.

Firebase initialization is in `src/firebase.js`. Configure the Firebase web app there (or use your deployment's environment-based configuration) and enable Email/Password sign-in and Firestore in the Firebase console.

## Firestore security rules

The `firestore.rules` file limits user documents to their authenticated owner and permits only authenticated users to create their own contact messages. From this folder, deploy the rules with:

```bash
firebase deploy --only firestore:rules
```

## Deploy to Firebase Hosting

The Hosting configuration serves the production build and routes app URLs to React, so client-side navigation works when a page is opened directly.

1. Install the Firebase CLI if needed: `npm install -g firebase-tools`.
2. Sign in: `firebase login`.
3. Build and deploy from this folder:

   ```bash
   npm run build
   firebase deploy --only hosting
   ```

The project is configured to use the `ctrlwebapp` Firebase project. In the Firebase console, enable Email/Password sign-in and add the Hosting domain to Authentication's authorized domains. After deployment, open the Hosting URL on a phone; no separate mobile app install is required.

## Commands

- `npm start` — start the development server.
- `npm test -- --watchAll=false --runInBand` — run tests once.
- `npm run build` — create a production build.
