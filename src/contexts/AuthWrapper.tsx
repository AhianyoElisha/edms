'use client'

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AppwriteProvider';
import LoaderDark from '@/components/layout/shared/LoaderDark'; // Adjust the import path as needed

export default function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

    // Only bounce signed-out users to the login page. Re-pushing the current
    // pathname while the session loads used to strip the query string, which
    // dropped filters (?status=, ?tripId=...) on every page load.
    useEffect(() => {
      if (!isLoading && !user && pathname !== '/') {
        router.push('/');
      }
  }, [user, isLoading, router, pathname]);

if (isLoading) {
   return <div className='fixed inset-0 flex items-center justify-center z-50 px-[50%]'>
     <LoaderDark />
   </div>; // Or your custom loading component
 }


  return <>{children}</>;
};

// Helper functions to determine route types
