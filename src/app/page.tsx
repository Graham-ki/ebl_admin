"use client";

import Link from "next/link";
import Image from "next/image";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
const DashboardPage = () => {
  return (
    <div className="flex flex-col justify-center items-center min-h-screen bg-gray-100 p-6">
      
      {/* Logo and Welcome Text */}
      <div className="flex flex-col items-center mb-8">
        <Image src="/images/logo.png" alt="Company Logo" width={100} height={100} className="rounded-full border-2 border-gray-300 shadow-md"/>
        <h1 className="text-black font-bold ">Welcome to the Dashboard</h1>
        <p className="text-gray-600 text-center">Click to continue</p>
      </div>

      {/* Cards Container */}
      <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
        
        {/* Admin Card */}
        <Card className="w-80 shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader>
            <CardTitle className="text-center text-lg font-bold">Admin Panel</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600">Manage users, orders, and system settings.</p>
            <Link href="/admin">
              <Button className="mt-4 w-full">Go to Admin</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;
