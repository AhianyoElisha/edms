'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AppwriteProvider';

export function withAuth<T extends React.PropsWithChildren<unknown>>(WrappedComponent: React.ComponentType<T>) {
  return function WithAuth(props: T) {
    const { user, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!isLoading && !user) {
        router.push('/');
      }
    }, [user, isLoading, router]);

    if (isLoading) {
      return <div>Loading...</div>; // Or your custom loading component
    }

    if (!user) {
      return null; // Or a custom unauthorized component
    }

    return <WrappedComponent {...props} />;
  };
}