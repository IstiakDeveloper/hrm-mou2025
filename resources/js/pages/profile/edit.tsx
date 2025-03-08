import React from 'react';
import { Head } from '@inertiajs/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Layout from '@/layouts/AdminLayout';
import ProfileForm from '@/components/profile/profile-form';
import PasswordForm from '@/components/profile/password-form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle } from 'lucide-react';
import AppearanceToggleTab from '@/components/appearance-tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface User {
  id: number;
  name: string;
  email: string;
  role?: {
    name: string;
  };
  employee?: {
    first_name: string;
    last_name: string;
    employee_id: string;
  };
}

interface ProfileEditProps {
  user: User;
  success?: string;
  errors: {
    [key: string]: string;
  };
}

export default function ProfileEdit({ user, success, errors }: ProfileEditProps) {
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

          <TabsContent value="profile" className="w-full max-w-3xl">
            <ProfileForm
              user={user}
              errors={errors}
            />
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
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
