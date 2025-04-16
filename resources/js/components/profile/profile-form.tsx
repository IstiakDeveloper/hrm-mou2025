import React from 'react';
import { useForm } from '@inertiajs/react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  User,
  UserIcon,
  AtSign,
  Briefcase,
  Building,
  Shield
} from 'lucide-react';

interface ProfileFormProps {
  user: {
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
  };
  errors: {
    [key: string]: string;
  };
}

export default function ProfileForm({ user, errors }: ProfileFormProps) {
  const { data, setData, patch, processing, reset } = useForm({
    name: user.name || '',
    email: user.email || '',
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    patch(route('profile.update'));
  };

  // Get user's initials for avatar
  const getInitials = () => {
    if (user.employee) {
      return `${user.employee.first_name.charAt(0)}${user.employee.last_name.charAt(0)}`;
    }
    return user.name.charAt(0);
  };

  return (
    <Card className="shadow-md border border-gray-200">
      <CardHeader className="pb-6 bg-gray-50 border-b">
        <div className="flex items-center space-x-4">
          <Avatar className="h-16 w-16 border-2 border-primary/25">
            <AvatarFallback className="bg-primary/10 text-primary text-lg font-medium">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-xl">Profile Information</CardTitle>
            <CardDescription className="mt-1.5">
              Update your account's profile information and email address
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <form onSubmit={submit}>
        <CardContent className="space-y-8 p-6">
          {/* User Information Section */}
          <div className="rounded-md border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center">
              <div className="mr-3 rounded-full bg-primary/10 p-2">
                <UserIcon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-lg font-medium text-gray-800">User Information</h3>
            </div>
            <Separator className="mb-6" />

            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-x-6 gap-y-6 md:grid-cols-2">
                <div className="space-y-2.5">
                  <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                    <span className="flex items-center">
                      <User className="mr-1.5 h-4 w-4 text-gray-500" />
                      Full Name
                    </span>
                  </Label>
                  <Input
                    id="name"
                    value={data.name}
                    onChange={(e) => setData('name', e.target.value)}
                    className="mt-1.5 h-10"
                    placeholder="Enter your full name"
                    required
                  />
                  {errors.name && (
                    <p className="mt-1.5 text-sm font-medium text-destructive">{errors.name}</p>
                  )}
                </div>

                <div className="space-y-2.5">
                  <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                    <span className="flex items-center">
                      <AtSign className="mr-1.5 h-4 w-4 text-gray-500" />
                      Email Address
                    </span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={data.email}
                    onChange={(e) => setData('email', e.target.value)}
                    className="mt-1.5 h-10"
                    placeholder="Enter your email address"
                    required
                  />
                  {errors.email && (
                    <p className="mt-1.5 text-sm font-medium text-destructive">{errors.email}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Employee Information Section (Read Only) */}
          {user.employee && (
            <div className="rounded-md border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-5 flex items-center">
                <div className="mr-3 rounded-full bg-blue-50 p-2">
                  <Briefcase className="h-5 w-5 text-blue-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-800">Employee Information</h3>
                <span className="ml-3 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                  Read Only
                </span>
              </div>
              <Separator className="mb-6" />

              <div className="grid grid-cols-1 gap-x-6 gap-y-6 md:grid-cols-2">
                <div className="space-y-2.5">
                  <Label htmlFor="employee_id" className="text-sm font-medium text-gray-700">
                    Employee ID
                  </Label>
                  <Input
                    id="employee_id"
                    value={user.employee.employee_id}
                    disabled
                    className="mt-1.5 bg-gray-50 text-gray-600"
                  />
                  <p className="mt-1 text-xs text-gray-500">Unique identifier in the system</p>
                </div>

                <div className="space-y-2.5">
                  <Label htmlFor="full_name" className="text-sm font-medium text-gray-700">
                    Full Name (Official)
                  </Label>
                  <Input
                    id="full_name"
                    value={`${user.employee.first_name} ${user.employee.last_name}`}
                    disabled
                    className="mt-1.5 bg-gray-50 text-gray-600"
                  />
                  <p className="mt-1 text-xs text-gray-500">As registered in employee records</p>
                </div>
              </div>
            </div>
          )}

          {/* Role Information Section (Read Only) */}
          {user.role && (
            <div className="rounded-md border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-5 flex items-center">
                <div className="mr-3 rounded-full bg-purple-50 p-2">
                  <Shield className="h-5 w-5 text-purple-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-800">System Role</h3>
                <span className="ml-3 rounded-full bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700">
                  Read Only
                </span>
              </div>
              <Separator className="mb-6" />

              <div className="space-y-2.5">
                <Label htmlFor="role" className="text-sm font-medium text-gray-700">
                  Assigned User Role
                </Label>
                <Input
                  id="role"
                  value={user.role.name}
                  disabled
                  className="mt-1.5 bg-gray-50 text-gray-600 max-w-md"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Determines your access permissions in the system
                </p>
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-end gap-3 border-t bg-gray-50 px-6 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => reset()}
            disabled={processing}
            className="border-gray-300"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={processing}
            className="min-w-[120px]"
          >
            {processing ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
