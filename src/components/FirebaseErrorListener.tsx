'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useToast } from '@/hooks/use-toast';

export function FirebaseErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handleError = (error: FirestorePermissionError) => {
      // Silently log permission errors without showing to avoid spamming user
      if (process.env.NODE_ENV === 'development') {
        console.warn('Firebase Permission Error:', error.context);
      }
      
      // Only show toast for critical operations (create, update, delete)
      // Skip for read operations (list, get) to avoid UI spam
      const criticalOps = ['create', 'update', 'delete'];
      if (criticalOps.includes(error.context.operation)) {
        toast({
          variant: 'destructive',
          title: 'Operation Failed',
          description: `Unable to ${error.context.operation} data. Please try again.`,
          duration: 3000,
        });
      }
    };

    errorEmitter.on('permission-error', handleError);
    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, [toast]);

  return null;
}
