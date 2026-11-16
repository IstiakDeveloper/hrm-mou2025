#!/usr/bin/env python3
"""Generate planning coverage CSVs from repo evidence + checklist metadata.

Read-only toward application state. Writes only under docs/mobile-app/evidence/.

Usage:
  python scripts/build_mobile_plan.py
  python scripts/build_mobile_plan.py --refresh-only
"""
from __future__ import annotations

import argparse
import csv
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = ROOT / "docs" / "mobile-app" / "evidence"
CHECKLIST = ROOT / "docs" / "mobile-app" / "05-TASK-CHECKLIST.md"
PAGES = ROOT / "resources" / "js" / "pages"
ROUTES_CSV = EVIDENCE / "route-declarations.csv"
PAGES_CSV = EVIDENCE / "web-page-inventory.csv"
CONFIG = ROOT / "config"

# Heuristic: path/uri fragment → primary task phase prefix
ROUTE_RULES: list[tuple[str, str, str]] = [
    (r"auth|login|password|pin", "P03", "api_or_screen"),
    (r"bootstrap|dashboard|notification|setting|profile|/me", "P04", "shell_or_profile"),
    (r"employee|nominee|guarantor|disciplinary", "P05", "native_feature"),
    (r"organization|branch|region|zone|department|designation|program|project|organogram", "P05", "native_feature"),
    (r"attendance|geofence|guard.?shift|zk|iclock|holiday|weekend", "P06", "native_feature"),
    (r"leave", "P07", "native_feature"),
    (r"movement|log.?book|penalty|fine", "P08", "native_feature"),
    (r"transfer|confirmation|promotion|demotion|redesignation|separation|salary.?increment", "P09", "native_feature"),
    (r"appraisal|evaluation|resignation|final.?clearance|clearance", "P10", "native_feature"),
    (r"loan|motorcycle|provident.?loan", "P11", "native_feature"),
    (r"payroll|payslip|payscale|bonus|withhold|arrear|tax", "P12", "native_feature"),
    (r"provident|pf-|gratuity|final.?payment|staff.?fund|settlement", "P13", "native_feature"),
    (r"fixed.?asset|asset|depreciation|disposal|custodian|vendor", "P14", "native_feature"),
    (r"inventory|stock", "P15", "native_feature"),
    (r"document|notice|office.?map", "P16", "native_feature"),
    (r"admin|role|permission|session|activity|bulk.?email|user", "P17", "native_feature"),
    (r"report", "P18", "report_flow"),
    (r"api/zkteco|api/sync|api/employees/sync|api/branch|api/device", "P19", "backend_integration_not_flutter"),
    (r"training|store|recruit", "P01", "discovery_placeholder"),
]

SCREEN_RULES: list[tuple[str, str, str]] = [
    (r"^auth/", "P03", "native_screen"),
    (r"^profile/|^settings/", "P04", "native_screen"),
    (r"^dashboard|^employee-dashboard|^welcome|^sections/", "P04", "shell_adapt"),
    (r"^employee/|^disciplinary", "P05", "native_screen"),
    (r"^branch/|^branch-portal/|^department/|^designation/|^organization/|^regional-office/|^zone/", "P05", "native_screen"),
    (r"^attendance/|^holiday/|^zk-teco/", "P06", "native_screen"),
    (r"^leave/", "P07", "native_screen"),
    (r"^movement/", "P08", "native_screen"),
    (r"^transfer/|^confirmation/|^promotion/|^demotion/|^redesignation/|^separation/|^salary-increments/", "P09", "native_screen"),
    (r"^final-clearances/", "P10", "native_screen"),
    (r"^employee-loan/", "P11", "native_screen"),
    (r"^payroll/", "P12", "native_screen"),
    (r"^fixed-asset/", "P14", "native_screen"),
    (r"^inventory/", "P15", "native_screen"),
    (r"^documents/|^notices/|^notifications/|^office-map/", "P16", "native_screen"),
    (r"^admin/", "P17", "native_screen"),
    (r"^report/", "P18", "report_flow"),
    (r"^Errors/", "P04", "system_state"),
]


def write_csv(name: str, rows: list[dict], fields: list[str]) -> None:
    EVIDENCE.mkdir(parents=True, exist_ok=True)
    with (EVIDENCE / name).open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)


def match_rule(text: str, rules: list[tuple[str, str, str]]) -> tuple[str, str]:
    lowered = text.lower().replace("\\", "/")
    for pattern, task, treatment in rules:
        if re.search(pattern, lowered):
            return task, treatment
    return "P19", "review_manual"


def parse_checklist_tasks() -> list[dict]:
    rows: list[dict] = []
    if not CHECKLIST.exists():
        return rows
    phase = ""
    text = CHECKLIST.read_text(encoding="utf-8")
    for line in text.splitlines():
        phase_match = re.match(r"^##\s+(P\d+)\b", line)
        if phase_match:
            phase = phase_match.group(1)
            continue
        item = re.match(r"^- \[([ xX])\]\s+\*\*(P\d+\.\d+)\*\*\s+(.+)$", line)
        if item:
            mark, task_id, title = item.group(1), item.group(2), item.group(3).strip()
            # Strip trailing done-condition lines handled separately
            rows.append(
                {
                    "task_id": task_id,
                    "phase": phase or task_id.split(".")[0],
                    "title": title,
                    "status": "done" if mark.lower() == "x" else "pending",
                    "assignee": "",
                    "started": "",
                    "evidence": "",
                    "blocked_reason": "",
                }
            )
    return rows


def build_task_register() -> None:
    rows = parse_checklist_tasks()
    write_csv(
        "task-register.csv",
        rows,
        ["task_id", "phase", "title", "status", "assignee", "started", "evidence", "blocked_reason"],
    )


def build_route_coverage() -> None:
    rows: list[dict] = []
    if not ROUTES_CSV.exists():
        write_csv(
            "route-task-coverage.csv",
            rows,
            [
                "source_path",
                "line",
                "verb",
                "declared_uri",
                "controller",
                "action",
                "local_name",
                "primary_task",
                "mobile_treatment",
                "verification",
            ],
        )
        return
    with ROUTES_CSV.open(encoding="utf-8-sig", newline="") as handle:
        for row in csv.DictReader(handle):
            blob = " ".join(
                [
                    row.get("path", ""),
                    row.get("declared_uri", ""),
                    row.get("controller", ""),
                    row.get("action", ""),
                    row.get("local_name", ""),
                ]
            )
            task, treatment = match_rule(blob, ROUTE_RULES)
            rows.append(
                {
                    "source_path": row.get("path", ""),
                    "line": row.get("line", ""),
                    "verb": row.get("verb", ""),
                    "declared_uri": row.get("declared_uri", ""),
                    "controller": row.get("controller", ""),
                    "action": row.get("action", ""),
                    "local_name": row.get("local_name", ""),
                    "primary_task": task,
                    "mobile_treatment": treatment,
                    "verification": "mapped; runtime verification pending",
                }
            )
    write_csv(
        "route-task-coverage.csv",
        rows,
        [
            "source_path",
            "line",
            "verb",
            "declared_uri",
            "controller",
            "action",
            "local_name",
            "primary_task",
            "mobile_treatment",
            "verification",
        ],
    )


def build_screen_coverage() -> None:
    rows: list[dict] = []
    source_rows: list[dict] = []
    if PAGES_CSV.exists():
        with PAGES_CSV.open(encoding="utf-8-sig", newline="") as handle:
            source_rows = list(csv.DictReader(handle))
    else:
        for file in sorted(PAGES.rglob("*.tsx")):
            rel = file.relative_to(ROOT).as_posix()
            source_rows.append({"path": rel, "renderable_candidate": "unknown", "route_calls": ""})

    for row in source_rows:
        path = row.get("path", "")
        rel = path.replace("resources/js/pages/", "")
        task, treatment = match_rule(rel, SCREEN_RULES)
        disposition = treatment
        if row.get("renderable_candidate") in {"no/helper", "no"}:
            disposition = "shared_component_or_helper"
        rows.append(
            {
                "path": path,
                "renderable_candidate": row.get("renderable_candidate", ""),
                "route_calls": row.get("route_calls", ""),
                "primary_task": task,
                "migration_disposition": disposition,
                "states_required": "loading|empty|error|success|forbidden|offline|stale|submitting",
                "verification": "mapped; runtime verification pending",
            }
        )
    write_csv(
        "screen-task-coverage.csv",
        rows,
        [
            "path",
            "renderable_candidate",
            "route_calls",
            "primary_task",
            "migration_disposition",
            "states_required",
            "verification",
        ],
    )


def php_report_keys(path: Path) -> list[tuple[str, str, str]]:
    """Extract 'slug' => [ 'title' => '...', 'filters' => [...] ] loosely from PHP config."""
    if not path.exists():
        return []
    text = path.read_text(encoding="utf-8", errors="replace")
    results: list[tuple[str, str, str]] = []
    # Match top-level report entries under 'reports' => [
    for match in re.finditer(
        r"['\"]([a-z0-9\-]+)['\"]\s*=>\s*\[(.*?)\n\s*\],",
        text,
        flags=re.S,
    ):
        slug, body = match.group(1), match.group(2)
        if slug in {"print", "signature_blocks", "company_name", "company_address"}:
            continue
        title_m = re.search(r"['\"]title['\"]\s*=>\s*['\"]([^'\"]+)['\"]", body)
        filters_m = re.search(r"['\"]filters['\"]\s*=>\s*\[([^\]]*)\]", body)
        title = title_m.group(1) if title_m else slug
        filters = ""
        if filters_m:
            filters = ",".join(re.findall(r"['\"]([^'\"]+)['\"]", filters_m.group(1)))
        if title_m or "template" in body or "report" in body:
            results.append((slug, title, filters))
    return results


def build_report_catalog() -> None:
    rows: list[dict] = []
    configs = [
        ("payroll", CONFIG / "payroll_reports.php", "P18"),
        ("pf", CONFIG / "pf_reports.php", "P18"),
        ("gratuity", CONFIG / "gratuity_reports.php", "P18"),
        ("employee_loan", CONFIG / "employee_loan_reports.php", "P18"),
        ("fixed_asset", CONFIG / "fixed_asset_reports.php", "P18"),
        ("inventory", CONFIG / "inventory_reports.php", "P18"),
    ]
    for family, path, task in configs:
        entries = php_report_keys(path)
        if not entries and path.exists():
            rows.append(
                {
                    "family": family,
                    "slug": "(see routes/controllers)",
                    "title": f"{family} reports — config has no keyed reports list or uses controllers",
                    "filters": "",
                    "source_config": path.relative_to(ROOT).as_posix(),
                    "primary_task": task,
                    "verification": "mapped; runtime verification pending",
                }
            )
        for slug, title, filters in entries:
            rows.append(
                {
                    "family": family,
                    "slug": slug,
                    "title": title,
                    "filters": filters,
                    "source_config": path.relative_to(ROOT).as_posix(),
                    "primary_task": task,
                    "verification": "mapped; runtime verification pending",
                }
            )

    # HR report pages not fully driven by the PHP report config files
    for slug, title in [
        ("attendance", "Attendance report"),
        ("leave", "Leave report"),
        ("movement", "Movement report"),
        ("transfer", "Transfer report"),
        ("employee", "Employee report"),
    ]:
        rows.append(
            {
                "family": "hr_web",
                "slug": slug,
                "title": title,
                "filters": "see ReportController / pages/report",
                "source_config": "routes/web/holiday-reports.php + ReportController",
                "primary_task": "P18",
                "verification": "mapped; runtime verification pending",
            }
        )

    write_csv(
        "report-catalog.csv",
        rows,
        ["family", "slug", "title", "filters", "source_config", "primary_task", "verification"],
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--refresh-only",
        action="store_true",
        help="Only refresh derived CSVs from existing evidence + checklist (default behavior).",
    )
    args = parser.parse_args()
    _ = args  # reserved for future inventory+refresh combined mode
    build_task_register()
    build_route_coverage()
    build_screen_coverage()
    build_report_catalog()
    print("Wrote:")
    for name in [
        "task-register.csv",
        "route-task-coverage.csv",
        "screen-task-coverage.csv",
        "report-catalog.csv",
    ]:
        path = EVIDENCE / name
        lines = sum(1 for _ in path.open(encoding="utf-8-sig")) - 1
        print(f"  {path.relative_to(ROOT)} ({lines} data rows)")


if __name__ == "__main__":
    main()
