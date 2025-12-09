'use client';

import Link from 'next/link';
import { Button } from '@/app/components/Button';
import { Card, CardBody } from '@/app/components/Card';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-100/50 blur-3xl"></div>
        <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] rounded-full bg-indigo-100/50 blur-3xl"></div>
      </div>

      <div className="w-full max-w-md z-10">
        <Card className="shadow-xl border-slate-200/60 backdrop-blur-sm bg-white/90">
          <CardBody className="p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-50 rounded-2xl mb-6 shadow-sm border border-amber-100">
                <ShieldAlert className="w-8 h-8 text-amber-600" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Registration Disabled</h1>
              <p className="text-slate-500">Public registration is not available</p>
            </div>

            <div className="space-y-6">
              <div className="p-6 bg-amber-50/50 border border-amber-100 rounded-xl">
                <h3 className="font-semibold text-slate-900 mb-2">Admin-Only Registration</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  For security reasons, only administrators can create new user accounts. 
                  If you need access to the system, please contact your administrator.
                </p>
              </div>

              <div className="p-6 bg-blue-50/50 border border-blue-100 rounded-xl">
                <h3 className="font-semibold text-slate-900 mb-3">For Administrators</h3>
                <ul className="text-sm text-slate-600 space-y-2">
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                    <span>Log in to your admin account</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                    <span>Navigate to the Users section</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                    <span>Create user accounts with appropriate roles</span>
                  </li>
                </ul>
              </div>

              <div className="pt-2">
                <Link href="/login">
                  <Button className="w-full py-3 text-base shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/30 transition-all">
                    <span className="flex items-center justify-center gap-2">
                      <ArrowLeft className="w-4 h-4" />
                      Back to Login
                    </span>
                  </Button>
                </Link>
              </div>
            </div>
          </CardBody>
        </Card>
        
        <div className="mt-8 text-center text-slate-400 text-sm">
          &copy; {new Date().getFullYear()} Ticket System. All rights reserved.
        </div>
      </div>
    </div>
  );
}
