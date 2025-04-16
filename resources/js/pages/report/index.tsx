import React from 'react';
import { Head, Link } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  FileBarChart,
  FileText,
  Calendar,
  UsersRound,
  ArrowLeftRight,
  LogOut,
  Download,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ReportType {
  id: string;
  name: string;
}

interface ReportIndexProps {
  reportTypes: ReportType[];
}

export default function ReportIndex({ reportTypes }: ReportIndexProps) {
  // Function to get the appropriate icon for each report type
  const getReportIcon = (reportType: string) => {
    switch (reportType) {
      case 'attendance':
        return <Calendar className="h-12 w-12 text-blue-500" />;
      case 'leave':
        return <LogOut className="h-12 w-12 text-purple-500" />;
      case 'movement':
        return <ArrowLeftRight className="h-12 w-12 text-green-500" />;
      case 'transfer':
        return <UsersRound className="h-12 w-12 text-orange-500" />;
      case 'employee':
        return <FileText className="h-12 w-12 text-red-500" />;
      default:
        return <FileBarChart className="h-12 w-12 text-gray-500" />;
    }
  };

  // Function to get description for each report type
  const getReportDescription = (reportType: string) => {
    switch (reportType) {
      case 'attendance':
        return 'View and analyze employee attendance records, including present, absent, late, and half-day statistics.';
      case 'leave':
        return 'Track employee leave applications and approvals across departments and leave types.';
      case 'movement':
        return 'Monitor employee movements during work hours for official and personal purposes.';
      case 'transfer':
        return 'Track employee transfers between departments, branches, and positions.';
      case 'employee':
        return 'Comprehensive employee data including demographics, positions, and status.';
      default:
        return 'Generate detailed reports for analysis and decision making.';
    }
  };

  return (
    <Layout>
      <Head title="Reports Dashboard" />

      <div className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Reports Dashboard</h1>
          <p className="mt-1 text-gray-500">
            Generate and view comprehensive reports for all HR operations
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reportTypes.map((reportType) => (
            <Card key={reportType.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl">{reportType.name}</CardTitle>
                <CardDescription>
                  {getReportDescription(reportType.id)}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 flex justify-center">
                {getReportIcon(reportType.id)}
              </CardContent>
              <CardFooter className="bg-gray-50 px-6 py-4">
                <Link href={route(`reports.${reportType.id}`)} className="w-full">
                  <Button className="w-full">
                    <FileBarChart className="mr-2 h-4 w-4" />
                    View Report
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>

        <div className="mt-10 p-6 bg-gray-50 rounded-lg border border-gray-100">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Additional Features</h2>

          <div className="flex flex-wrap gap-4">
            <Card className="w-full md:w-64">
              <CardHeader className="pb-2">
                <CardTitle className="text-md">Export Reports</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 pb-4">
                <p className="text-sm text-gray-500">
                  Export any report to PDF or Excel format for offline analysis
                </p>
              </CardContent>
              <CardFooter className="pt-0 flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  <Download className="mr-1 h-4 w-4" />
                  PDF
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  <Download className="mr-1 h-4 w-4" />
                  Excel
                </Button>
              </CardFooter>
            </Card>

            <Card className="w-full md:w-64">
              <CardHeader className="pb-2">
                <CardTitle className="text-md">Scheduled Reports</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 pb-4">
                <p className="text-sm text-gray-500">
                  Set up automated reports to be sent to your email periodically
                </p>
              </CardContent>
              <CardFooter className="pt-0">
                <Button variant="outline" size="sm" className="w-full">
                  <Calendar className="mr-1 h-4 w-4" />
                  Schedule
                </Button>
              </CardFooter>
            </Card>

            <Card className="w-full md:w-64">
              <CardHeader className="pb-2">
                <CardTitle className="text-md">Custom Reports</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 pb-4">
                <p className="text-sm text-gray-500">
                  Create and save custom reports with specific parameters
                </p>
              </CardContent>
              <CardFooter className="pt-0">
                <Button variant="outline" size="sm" className="w-full">
                  <Check className="mr-1 h-4 w-4" />
                  Customize
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
