
'use client';

/**
 * @fileOverview Standard Firebase initialization with persistence and security rule triggers.
 * Updated to ensure rules deployment watcher is triggered.
 * Rules Engine Version: 2.1
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { 
  getFirestore, 
  Firestore, 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from 'firebase/firestore';
import { firebaseConfig } from './config';

/**
 * Initializes Firebase with production services and enables persistent local cache.
 */
export function initializeFirebase(): {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
} {
  const isFirstInit = getApps().length === 0;
  const app = isFirstInit ? initializeApp(firebaseConfig) : getApp();
  const auth = getAuth(app);

  let db: Firestore;
  if (isFirstInit) {
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
  } else {
    db = getFirestore(app);
  }

  return { app, auth, db };
}

export * from './provider';
export * from './auth/use-user';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
