'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function RequestRedirectPage() {
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    if (params.id) {
      router.replace(`/admin?tab=requests&requestId=${params.id}`);
    } else {
      router.replace('/admin?tab=requests');
    }
  }, [params, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );
}
