import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Download, Filter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// Leave PDF Export Component with Filter Options and Safety Checks
export default function LeavePdfExport({ leaveData, leaveSummary, employee }) {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedLeaveTypes, setSelectedLeaveTypes] = useState([]);
    const [filterMode, setFilterMode] = useState('all'); // 'all', 'specific', 'exclude'
    const [isGenerating, setIsGenerating] = useState(false);

    // ✅ Safety check - Don't render if employee data is missing
    if (!employee || !employee.id) {
        console.warn('LeavePdfExport: Employee data is missing or invalid', employee);
        return null;
    }

    // Get unique leave types from the data
    const availableLeaveTypes = React.useMemo(() => {
        const types = new Set();

        // From leave applications
        if (Array.isArray(leaveData)) {
            leaveData.forEach(leave => {
                if (leave.type) {
                    types.add(leave.type);
                }
            });
        }

        // From leave balances
        if (leaveSummary?.balances && Array.isArray(leaveSummary.balances)) {
            leaveSummary.balances.forEach(balance => {
                if (balance.type) {
                    types.add(balance.type);
                }
            });
        }

        return Array.from(types).sort();
    }, [leaveData, leaveSummary]);

    const handleLeaveTypeToggle = (leaveType, checked) => {
        if (checked) {
            setSelectedLeaveTypes(prev => [...prev, leaveType]);
        } else {
            setSelectedLeaveTypes(prev => prev.filter(type => type !== leaveType));
        }
    };

    const handleSelectAll = () => {
        setSelectedLeaveTypes(availableLeaveTypes);
    };

    const handleDeselectAll = () => {
        setSelectedLeaveTypes([]);
    };

    const handleFilterModeChange = (mode) => {
        setFilterMode(mode);
        setSelectedLeaveTypes([]); // Reset selections when mode changes
    };

    const generatePdf = () => {
        setIsGenerating(true);

        try {
            // Prepare parameters
            const params = new URLSearchParams({
                employee_id: employee.id.toString(),
                from_date: employee.report_from_date || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
                to_date: employee.report_to_date || new Date().toISOString().split('T')[0],
                filter_mode: filterMode
            });

            // Add selected leave types based on filter mode
            if (filterMode === 'specific' && selectedLeaveTypes.length > 0) {
                selectedLeaveTypes.forEach(type => {
                    params.append('include_leave_types[]', type);
                });
            } else if (filterMode === 'exclude' && selectedLeaveTypes.length > 0) {
                selectedLeaveTypes.forEach(type => {
                    params.append('exclude_leave_types[]', type);
                });
            }

            // Create the URL - with fallback for route helper
            let url;
            try {
                if (typeof route === 'function') {
                    url = route('employee.dashboard.leave.pdf') + '?' + params.toString();
                } else {
                    url = '/employee/dashboard/leave/pdf?' + params.toString();
                }
            } catch (error) {
                console.warn('Route helper not available, using fallback URL');
                url = '/employee/dashboard/leave/pdf?' + params.toString();
            }

            // Open PDF in new tab
            window.open(url, '_blank');

        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Error generating PDF. Please try again.');
        } finally {
            setIsGenerating(false);
            setIsOpen(false);
        }
    };

    const getFilterDescription = () => {
        if (filterMode === 'all') {
            return 'All leave types will be included';
        } else if (filterMode === 'specific') {
            if (selectedLeaveTypes.length === 0) {
                return 'No leave types selected';
            }
            return `Only ${selectedLeaveTypes.length} selected leave type(s) will be included`;
        } else if (filterMode === 'exclude') {
            if (selectedLeaveTypes.length === 0) {
                return 'All leave types will be included';
            }
            return `${selectedLeaveTypes.length} leave type(s) will be excluded`;
        }
    };

    const isGenerateDisabled = () => {
        if (filterMode === 'specific' && selectedLeaveTypes.length === 0) {
            return true;
        }
        if (filterMode === 'exclude' && selectedLeaveTypes.length === availableLeaveTypes.length) {
            return true;
        }
        return isGenerating;
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center">
                    <Download className="mr-1 h-4 w-4" />
                    Export PDF
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Filter className="h-5 w-5" />
                        Export Leave Report
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Filter Mode Selection */}
                    <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">
                            Filter Options
                        </label>
                        <Select value={filterMode} onValueChange={handleFilterModeChange}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Leave Types</SelectItem>
                                <SelectItem value="specific">Specific Leave Types Only</SelectItem>
                                <SelectItem value="exclude">Exclude Specific Leave Types</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Leave Type Selection (only show when not 'all') */}
                    {(filterMode === 'specific' || filterMode === 'exclude') && (
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <label className="text-sm font-medium text-gray-700">
                                    {filterMode === 'specific' ? 'Select Leave Types to Include' : 'Select Leave Types to Exclude'}
                                </label>
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleSelectAll}
                                        className="text-xs"
                                    >
                                        Select All
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleDeselectAll}
                                        className="text-xs"
                                    >
                                        Clear All
                                    </Button>
                                </div>
                            </div>

                            {/* Selected Leave Types Display */}
                            {selectedLeaveTypes.length > 0 && (
                                <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                                    <p className="text-xs text-gray-600 mb-2">
                                        {filterMode === 'specific' ? 'Selected:' : 'Excluded:'}
                                    </p>
                                    <div className="flex flex-wrap gap-1">
                                        {selectedLeaveTypes.map(type => (
                                            <Badge
                                                key={type}
                                                variant="secondary"
                                                className={filterMode === 'exclude' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}
                                            >
                                                {type}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Leave Type Checkboxes */}
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                                {availableLeaveTypes.map(leaveType => (
                                    <div key={leaveType} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`leave-type-${leaveType}`}
                                            checked={selectedLeaveTypes.includes(leaveType)}
                                            onCheckedChange={(checked) =>
                                                handleLeaveTypeToggle(leaveType, checked)
                                            }
                                        />
                                        <label
                                            htmlFor={`leave-type-${leaveType}`}
                                            className="text-sm cursor-pointer flex-1"
                                        >
                                            {leaveType}
                                        </label>
                                    </div>
                                ))}
                            </div>

                            {availableLeaveTypes.length === 0 && (
                                <p className="text-sm text-gray-500 text-center py-4">
                                    No leave types available
                                </p>
                            )}
                        </div>
                    )}

                    {/* Filter Description */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm text-blue-800">
                            <strong>Note:</strong> {getFilterDescription()}
                        </p>
                    </div>

                    {/* Generate Button */}
                    <div className="flex justify-end gap-3">
                        <Button
                            variant="outline"
                            onClick={() => setIsOpen(false)}
                            disabled={isGenerating}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={generatePdf}
                            disabled={isGenerateDisabled()}
                            className="min-w-[120px]"
                        >
                            {isGenerating ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Generating...
                                </div>
                            ) : (
                                <>
                                    <Download className="mr-2 h-4 w-4" />
                                    Generate PDF
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
