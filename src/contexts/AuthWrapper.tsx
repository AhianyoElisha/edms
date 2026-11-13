'use client'

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AppwriteProvider';
import { isCompanyUser, PORTAL_HOME } from '@/utils/companyAccess';
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

    // A company login only has the portal; anywhere else sends it back there
    const outsidePortal = isCompanyUser(user) && !pathname.startsWith('/portal');

    useEffect(() => {
      if (!isLoading && outsidePortal) router.replace(PORTAL_HOME);
    }, [isLoading, outsidePortal, router]);

if (isLoading || outsidePortal) {
   return <div className='fixed inset-0 flex items-center justify-center z-50 px-[50%]'>
     <LoaderDark />
   </div>; // Or your custom loading component
 }


  return <>{children}</>;
};

// Helper functions to determine route types
