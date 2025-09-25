'use client'

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AppwriteProvider';
import LoaderDark from '@/components/layout/shared/LoaderDark'; // Adjust the import path as needed

export default function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

    useEffect(() => {
      if (!isLoading && !user && pathname !== '/') {
        router.push('/');
      } else if (isLoading || user && pathname === '/') {
        router.push(`${pathname}`);
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
