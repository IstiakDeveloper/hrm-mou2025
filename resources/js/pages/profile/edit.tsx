import React from 'react';
import { Head } from '@inertiajs/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Layout from '@/layouts/AdminLayout';
import ProfileForm from '@/components/profile/profile-form';
import PasswordForm from '@/components/profile/password-form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle } from 'lucide-react';
<<<<<<< HEAD
import AppearanceToggleTab from '@/components/appearance-tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
=======
import AppearanceLightOnly from '@/components/appearance-light-only';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { type EmployeeNameFields } from '@/lib/employee-name';
import SignatureCard from '@/components/profile/signature-card';
>>>>>>> feature/flutter-mobile-app

interface User {
  id: number;
  name: string;
  email: string;
<<<<<<< HEAD
  role?: {
    name: string;
  };
  employee?: {
    first_name: string;
    last_name: string;
    employee_id: string;
=======
  signature?: string | null;
  role?: {
    name: string;
  };
  employee?: EmployeeNameFields & {
    employee_id: string;
    signature?: string | null;
>>>>>>> feature/flutter-mobile-app
  };
}

interface ProfileEditProps {
  user: User;
<<<<<<< HEAD
=======
  signature?: string | null;
>>>>>>> feature/flutter-mobile-app
  success?: string;
  errors: {
    [key: string]: string;
  };
}

<<<<<<< HEAD
export default function ProfileEdit({ user, success, errors }: ProfileEditProps) {
=======
export default function ProfileEdit({ user, signature, success, errors }: ProfileEditProps) {
>>>>>>> feature/flutter-mobile-app
  return (
    <Layout>
      <Head title="Profile" />

      <div className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
          <p className="mt-1 text-gray-500">
            Manage your account settings and preferences
          </p>
        </div>

        {success && (
          <Alert className="mb-6 bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700">{success}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="mb-8 w-full max-w-md">
            <TabsTrigger value="profile" className="w-1/3">Profile</TabsTrigger>
            <TabsTrigger value="password" className="w-1/3">Password</TabsTrigger>
            <TabsTrigger value="appearance" className="w-1/3">Appearance</TabsTrigger>
          </TabsList>

<<<<<<< HEAD
          <TabsContent value="profile" className="w-full max-w-3xl">
=======
          <TabsContent value="profile" className="w-full max-w-3xl space-y-6">
>>>>>>> feature/flutter-mobile-app
            <ProfileForm
              user={user}
              errors={errors}
            />
<<<<<<< HEAD
=======
            <SignatureCard
              currentSignature={signature ?? user.signature ?? user.employee?.signature}
              actionRoute="profile.signature"
              destroyRoute="profile.signature.destroy"
            />
>>>>>>> feature/flutter-mobile-app
          </TabsContent>

          <TabsContent value="password" className="w-full max-w-3xl">
            <PasswordForm
              errors={errors}
            />
          </TabsContent>

          <TabsContent value="appearance" className="w-full max-w-3xl">
            <Card>
              <CardHeader>
                <CardTitle>Appearance</CardTitle>
<<<<<<< HEAD
                <CardDescription>
                  Customize how the application looks for you
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium">Theme Preference</h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Select your preferred theme mode
                    </p>
                    <AppearanceToggleTab />
                  </div>
                </div>
=======
                <CardDescription>The application uses one light theme for all users.</CardDescription>
              </CardHeader>
              <CardContent>
                <AppearanceLightOnly />
>>>>>>> feature/flutter-mobile-app
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
