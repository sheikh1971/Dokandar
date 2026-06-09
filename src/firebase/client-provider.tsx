'use client';

import React, { useEffect, useState } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore } from 'firebase/firestore';
import { Auth } from 'firebase/auth';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { initializeFirebase } from './index';
import { FirebaseProvider } from './provider';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { OfflineBanner } from '@/components/OfflineBanner';

export function FirebaseClientProvider({ children }: { children: React.ReactNode }) {
  const [firebase, setFirebase] = useState<{
    app: FirebaseApp;
    db: Firestore;
    auth: Auth;
  } | null>(null);

  useEffect(() => {
    const { app, db, auth } = initializeFirebase();
    setFirebase({ app, db, auth });

    // Pre-fetch products into the local Firestore cache while online
    // so the seller can browse the catalog even without internet later.
    if (navigator.onLine) {
      getDocs(query(collection(db, 'products'), orderBy('name', 'asc'))).catch(() => {});
    }
  }, []);

  if (!firebase) return null;

  return (
    <FirebaseProvider app={firebase.app} firestore={firebase.db} auth={firebase.auth}>
      <OfflineBanner />
      <FirebaseErrorListener />
      {children}
    </FirebaseProvider>
  );
}
