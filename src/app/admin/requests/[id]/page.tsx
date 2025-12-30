'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { RequestDetail } from '@/app/components/RequestDetail';
import { useToast } from '@/app/components/ToastContainer';

export default function RequestPage() {
  const router = useRouter();
  const params = useParams();
  const toast = useToast();
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRequest = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/login');
            return;
        }

        const res = await fetch(`/api/requests/${params.id}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!res.ok) {
            if (res.status === 404) throw new Error('Request not found');
            throw new Error('Failed to fetch request');
        }
        
        const data = await res.json();
        setRequest(data.request);
      } catch (error: any) {
        console.error('Error fetching request:', error);
        toast.error(error.message || 'Failed to load request');
        router.push('/admin?tab=requests');
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchRequest();
    }
  }, [params.id, router, toast]);

  const handleStatusChange = async (requestId: string, status: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/requests/${requestId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      
      if (!res.ok) throw new Error('Failed to update status');
      
      const data = await res.json();
      setRequest(data.request);
      toast.success('Status updated successfully');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (requestId: string) => {
      if (!confirm('Are you sure you want to delete this request?')) return;
      
      try {
          const token = localStorage.getItem('token');
          const res = await fetch('/api/requests', {
              method: 'DELETE',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({ ids: [requestId] })
          });

          if (!res.ok) throw new Error('Failed to delete request');
          
          toast.success('Request deleted');
          router.push('/admin?tab=requests');
      } catch (error) {
          console.error('Error deleting request:', error);
          toast.error('Failed to delete request');
      }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!request) return null;

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-h-[600px] flex flex-col">
        <RequestDetail
          request={request}
          onClose={() => router.push('/admin?tab=requests')}
          isAdmin={true}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
}
