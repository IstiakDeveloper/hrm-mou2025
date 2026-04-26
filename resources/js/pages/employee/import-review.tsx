import React, { useMemo, useState } from "react";
import { Head, Link, useForm } from "@inertiajs/react";
import Layout from "@/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Check, AlertCircle } from "lucide-react";
import InputError from "@/components/input-error";

type Status = "active" | "inactive" | "on_leave" | "terminated";

interface Option {
  id: number;
  name: string;
}

interface PreviewRow {
  source_row: number;
  pin: string;
  name_en: string;
  last_name?: string;
  email: string;
  joining_date: string;
  department: string;
  joining_designation: string;
  last_designation: string;
  current_branch: string;
  last_branch: string;
  status: string;
}

interface ImportReviewProps {
  importId: string;
  rows: PreviewRow[];
  issuesByRow?: Record<string, string[]>;
  debug?: Record<string, any> | null;
  departments: Option[];
  designations: Option[];
  branches: Option[];
  statuses: Status[];
  errors?: Record<string, string>;
}

function asIdOrEmpty(raw: string): string {
  const v = (raw || "").trim();
  return /^\d+$/.test(v) ? v : "";
}

function resolveOptionId(raw: string, options: Option[]): string {
  const v = (raw || "").trim();
  if (!v) return "";
  if (/^\d+$/.test(v)) return v;
  const lower = v.toLowerCase();
  const match = options.find((o) => o.name.trim().toLowerCase() === lower);
  return match ? String(match.id) : "";
}

export default function ImportReview({
  importId,
  rows,
  issuesByRow,
  debug,
  departments,
  designations,
  branches,
  statuses,
}: ImportReviewProps) {
  const initial = useMemo(() => {
    return rows.map((r) => {
      const deptId = resolveOptionId(r.department, departments);
      const joinDesigId = resolveOptionId(r.joining_designation, designations);
      const lastDesigId = resolveOptionId(r.last_designation, designations) || joinDesigId;
      const currentBranchId = resolveOptionId(r.current_branch, branches);
      const lastBranchId = resolveOptionId(r.last_branch, branches);

      return {
        source_row: r.source_row,
        pin: r.pin || "",
        name_en: r.name_en || "",
        last_name: r.last_name || "",
        email: r.email || "",
        joining_date: r.joining_date || "",
        department_id: deptId || asIdOrEmpty(r.department),
        joining_designation_id: joinDesigId || asIdOrEmpty(r.joining_designation),
        last_designation_id: lastDesigId || asIdOrEmpty(r.last_designation) || asIdOrEmpty(r.joining_designation),
        current_branch_id: currentBranchId || asIdOrEmpty(r.current_branch),
        last_branch_id: lastBranchId || asIdOrEmpty(r.last_branch),
        status: (r.status || "active").toLowerCase() as Status,
      };
    });
  }, [rows, departments, designations, branches]);

  const form = useForm<{
    importId: string;
    rows: Array<{
      source_row: number;
      pin: string;
      name_en: string;
      last_name: string;
      email: string;
      joining_date: string;
      department_id: string;
      joining_designation_id: string;
      last_designation_id: string;
      current_branch_id: string;
      last_branch_id: string;
      status: Status;
    }>;
  }>({
    importId,
    rows: initial,
  });

  const [onlyIncomplete, setOnlyIncomplete] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const isRowComplete = (r: (typeof form.data.rows)[number]) => {
    return (
      r.pin.trim() &&
      r.name_en.trim() &&
      r.email.trim() &&
      r.joining_date.trim() &&
      r.department_id &&
      r.joining_designation_id &&
      r.last_designation_id &&
      r.current_branch_id &&
      r.status
    );
  };

  const visibleRows = useMemo(() => {
    if (!onlyIncomplete) return form.data.rows;
    return form.data.rows.filter((r) => !isRowComplete(r));
  }, [form.data.rows, onlyIncomplete]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(visibleRows.length / pageSize));
  }, [visibleRows.length]);

  const currentPage = Math.min(page, totalPages);

  const pagedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return visibleRows.slice(start, end);
  }, [visibleRows, currentPage]);

  const bulk = {
    department_id: "",
    joining_designation_id: "",
    last_designation_id: "",
    current_branch_id: "",
    last_branch_id: "",
    status: "" as "" | Status,
  };

  const [bulkState, setBulkState] = useState(bulk);

  const applyBulk = () => {
    const next = form.data.rows.map((r) => ({
      ...r,
      department_id: bulkState.department_id || r.department_id,
      joining_designation_id: bulkState.joining_designation_id || r.joining_designation_id,
      last_designation_id: bulkState.last_designation_id || r.last_designation_id,
      current_branch_id: bulkState.current_branch_id || r.current_branch_id,
      last_branch_id: bulkState.last_branch_id || r.last_branch_id,
      status: (bulkState.status || r.status) as Status,
    }));
    form.setData("rows", next);
  };

  const incompleteCount = useMemo(() => {
    return form.data.rows.filter((r) => !isRowComplete(r)).length;
  }, [form.data.rows]);

  const issueCount = useMemo(() => {
    if (!issuesByRow) return 0;
    return Object.values(issuesByRow).filter((arr) => (arr || []).length > 0).length;
  }, [issuesByRow]);

  return (
    <Layout>
      <Head title="Import Employees - Review" />

      <div className="container mx-auto py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Review & Confirm Import</h1>
            <p className="mt-1 text-gray-500">
              Upload complete. Now select required fields per employee and confirm.
            </p>
          </div>
          <Link href={route("employees.index")} className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Employees
          </Link>
        </div>

        {incompleteCount > 0 ? (
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertCircle className="h-4 w-4 text-yellow-700" />
            <AlertDescription className="text-yellow-800">
              {incompleteCount} row(s) are incomplete. Fill required selections before confirming.
            </AlertDescription>
          </Alert>
        ) : issueCount > 0 ? (
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertCircle className="h-4 w-4 text-yellow-700" />
            <AlertDescription className="text-yellow-800">
              {issueCount} row(s) have detected issues (example: invalid email/date, duplicate PIN/email). Fix them before confirming.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="border-green-200 bg-green-50">
            <Check className="h-4 w-4 text-green-700" />
            <AlertDescription className="text-green-800">
              All rows look complete. You can confirm import.
            </AlertDescription>
          </Alert>
        )}

        <Card className="shadow-sm">
          <CardHeader className="bg-gray-50 border-b">
            <CardTitle>Bulk defaults (optional)</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            {debug && (
              <div className="rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground">
                <div className="font-medium text-gray-800">Processing log (debug)</div>
                <pre className="mt-2 whitespace-pre-wrap break-words">
                  {JSON.stringify(debug, null, 2)}
                </pre>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Department</Label>
                <Select
                  value={bulkState.department_id || "none"}
                  onValueChange={(v) => setBulkState((s) => ({ ...s, department_id: v === "none" ? "" : v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id.toString()}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Current Branch</Label>
                <Select
                  value={bulkState.current_branch_id || "none"}
                  onValueChange={(v) => setBulkState((s) => ({ ...s, current_branch_id: v === "none" ? "" : v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id.toString()}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={bulkState.status || "none"}
                  onValueChange={(v) =>
                    setBulkState((s) => ({ ...s, status: v === "none" ? "" : (v as Status) }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {statuses.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Joining Designation</Label>
                <Select
                  value={bulkState.joining_designation_id || "none"}
                  onValueChange={(v) => setBulkState((s) => ({ ...s, joining_designation_id: v === "none" ? "" : v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select designation" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {designations.map((d) => (
                      <SelectItem key={d.id} value={d.id.toString()}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Last Designation</Label>
                <Select
                  value={bulkState.last_designation_id || "none"}
                  onValueChange={(v) => setBulkState((s) => ({ ...s, last_designation_id: v === "none" ? "" : v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select designation" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {designations.map((d) => (
                      <SelectItem key={d.id} value={d.id.toString()}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Last Branch</Label>
                <Select
                  value={bulkState.last_branch_id || "none"}
                  onValueChange={(v) => setBulkState((s) => ({ ...s, last_branch_id: v === "none" ? "" : v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select last branch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id.toString()}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={onlyIncomplete}
                  onChange={(e) => setOnlyIncomplete(e.target.checked)}
                />
                Show only incomplete rows
              </label>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" onClick={applyBulk}>
                  Apply bulk to all rows
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="bg-gray-50 border-b">
            <CardTitle>Employees ({visibleRows.length})</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div>
                Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, visibleRows.length)} of{" "}
                {visibleRows.length}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                >
                  Prev
                </Button>
                <span className="text-xs">
                  Page {currentPage} / {totalPages}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                >
                  Next
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2 pr-3">Row</th>
                    <th className="py-2 pr-3">Issues</th>
                    <th className="py-2 pr-3">PIN</th>
                    <th className="py-2 pr-3">Name</th>
                    <th className="py-2 pr-3">Email</th>
                    <th className="py-2 pr-3">Joining</th>
                    <th className="py-2 pr-3">Dept</th>
                    <th className="py-2 pr-3">Join Desig</th>
                    <th className="py-2 pr-3">Last Desig</th>
                    <th className="py-2 pr-3">Current Branch</th>
                    <th className="py-2 pr-3">Last Branch</th>
                    <th className="py-2 pr-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedRows.map((r) => {
                    const idx = form.data.rows.findIndex((x) => x.source_row === r.source_row && x.pin === r.pin && x.email === r.email);
                    const realIndex = idx >= 0 ? idx : 0;
                    const row = form.data.rows[realIndex];
                    const complete = isRowComplete(row);
                    const issues = issuesByRow?.[String(row.source_row)] ?? [];

                    return (
                      <tr
                        key={`${r.source_row}-${r.pin}-${r.email}`}
                        className={`border-b ${complete && issues.length === 0 ? "" : "bg-yellow-50/40"}`}
                      >
                        <td className="py-2 pr-3 font-medium">{row.source_row}</td>
                        <td className="py-2 pr-3">
                          {issues.length === 0 ? (
                            <span className="text-xs text-muted-foreground">—</span>
                          ) : (
                            <div className="max-w-[260px] text-xs text-red-700">
                              {issues.slice(0, 3).join("; ")}
                              {issues.length > 3 ? ` (+${issues.length - 3} more)` : ""}
                            </div>
                          )}
                        </td>
                        <td className="py-2 pr-3">
                          <Input
                            value={row.pin}
                            onChange={(e) => {
                              const next = [...form.data.rows];
                              next[realIndex] = { ...row, pin: e.target.value };
                              form.setData("rows", next);
                            }}
                            className="w-28"
                          />
                        </td>
                        <td className="py-2 pr-3">
                          <Input
                            value={row.name_en}
                            onChange={(e) => {
                              const next = [...form.data.rows];
                              next[realIndex] = { ...row, name_en: e.target.value };
                              form.setData("rows", next);
                            }}
                            className="w-48"
                          />
                        </td>
                        <td className="py-2 pr-3">
                          <Input
                            value={row.email}
                            onChange={(e) => {
                              const next = [...form.data.rows];
                              next[realIndex] = { ...row, email: e.target.value };
                              form.setData("rows", next);
                            }}
                            className="w-56"
                          />
                        </td>
                        <td className="py-2 pr-3">
                          <Input
                            type="date"
                            value={row.joining_date}
                            onChange={(e) => {
                              const next = [...form.data.rows];
                              next[realIndex] = { ...row, joining_date: e.target.value };
                              form.setData("rows", next);
                            }}
                            className="w-40"
                          />
                        </td>
                        <td className="py-2 pr-3">
                          <Select
                            value={row.department_id || "none"}
                            onValueChange={(v) => {
                              const next = [...form.data.rows];
                              next[realIndex] = { ...row, department_id: v === "none" ? "" : v };
                              form.setData("rows", next);
                            }}
                          >
                            <SelectTrigger className="w-44">
                              <SelectValue placeholder="Dept" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Select</SelectItem>
                              {departments.map((d) => (
                                <SelectItem key={d.id} value={d.id.toString()}>
                                  {d.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-2 pr-3">
                          <Select
                            value={row.joining_designation_id || "none"}
                            onValueChange={(v) => {
                              const next = [...form.data.rows];
                              next[realIndex] = { ...row, joining_designation_id: v === "none" ? "" : v };
                              // if last empty, set to joining
                              if (!next[realIndex].last_designation_id && v !== "none") {
                                next[realIndex].last_designation_id = v;
                              }
                              form.setData("rows", next);
                            }}
                          >
                            <SelectTrigger className="w-44">
                              <SelectValue placeholder="Joining" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Select</SelectItem>
                              {designations.map((d) => (
                                <SelectItem key={d.id} value={d.id.toString()}>
                                  {d.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-2 pr-3">
                          <Select
                            value={row.last_designation_id || "none"}
                            onValueChange={(v) => {
                              const next = [...form.data.rows];
                              next[realIndex] = { ...row, last_designation_id: v === "none" ? "" : v };
                              form.setData("rows", next);
                            }}
                          >
                            <SelectTrigger className="w-44">
                              <SelectValue placeholder="Last" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Select</SelectItem>
                              {designations.map((d) => (
                                <SelectItem key={d.id} value={d.id.toString()}>
                                  {d.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-2 pr-3">
                          <Select
                            value={row.current_branch_id || "none"}
                            onValueChange={(v) => {
                              const next = [...form.data.rows];
                              next[realIndex] = { ...row, current_branch_id: v === "none" ? "" : v };
                              form.setData("rows", next);
                            }}
                          >
                            <SelectTrigger className="w-44">
                              <SelectValue placeholder="Branch" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Select</SelectItem>
                              {branches.map((b) => (
                                <SelectItem key={b.id} value={b.id.toString()}>
                                  {b.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-2 pr-3">
                          <Select
                            value={row.last_branch_id || "none"}
                            onValueChange={(v) => {
                              const next = [...form.data.rows];
                              next[realIndex] = { ...row, last_branch_id: v === "none" ? "" : v };
                              form.setData("rows", next);
                            }}
                          >
                            <SelectTrigger className="w-44">
                              <SelectValue placeholder="Last Branch" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">—</SelectItem>
                              {branches.map((b) => (
                                <SelectItem key={b.id} value={b.id.toString()}>
                                  {b.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-2 pr-3">
                          <Select
                            value={row.status || "active"}
                            onValueChange={(v) => {
                              const next = [...form.data.rows];
                              next[realIndex] = { ...row, status: v as Status };
                              form.setData("rows", next);
                            }}
                          >
                            <SelectTrigger className="w-36">
                              <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                              {statuses.map((s) => (
                                <SelectItem key={s} value={s}>
                                  {s.replace("_", " ")}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <InputError message={form.errors.importId as any} />
            <InputError message={form.errors.rows as any} />

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  window.location.href = route("employees.index");
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={form.processing || incompleteCount > 0 || issueCount > 0}
                onClick={() => {
                  form.post(route("employees.import.commit"), { preserveScroll: true });
                }}
              >
                {form.processing ? "Confirming..." : "Confirm Import"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

