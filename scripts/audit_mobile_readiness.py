"""Read-only repository inventory for the Flutter planning documents.

Run from the repository root. This is a structural inventory, not a proof of
runtime correctness or a substitute for authorization / business-rule tests.
No employee records or secret values are copied into the output.
"""
import csv
import hashlib
import json
import re
import shutil
import subprocess
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "mobile-app" / "evidence"
SKIP_DIRS = {".git", "vendor", "node_modules", "build", "dist", ".next", "__pycache__"}
TEXT_EXT = {".php", ".tsx", ".ts", ".jsx", ".js", ".mjs", ".cjs", ".css", ".json", ".md", ".py", ".yml", ".yaml", ".xml", ".txt", ".sql", ".conf"}


def category(path):
    for prefix, label in [
        ("app/Http/Controllers/", "controller"), ("app/Models/", "model"),
        ("app/Services/", "service"), ("app/Support/", "support"),
        ("app/Http/Middleware/", "middleware"), ("app/", "backend-other"),
        ("routes/", "route"), ("database/migrations/", "migration"),
        ("database/", "database-other"), ("resources/js/pages/", "web-page"),
        ("resources/js/", "web-component-or-infrastructure"),
        ("resources/views/", "blade-template"), ("resources/", "web-other"),
        ("tests/", "test"), ("config/", "config"), ("data/", "data-asset"),
        ("public/", "public-asset"), ("storage/", "runtime-storage"),
        ("docs/", "existing-document"), ("deploy/", "deployment"),
    ]:
        if path.startswith(prefix):
            return label
    return "project-tooling-or-metadata"


def write_csv(name, rows, fields):
    with (OUT / name).open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    inventory, routes, symbols, schema, pages, tests, lint = [], [], [], [], [], [], []
    php = shutil.which("php")
    for file in sorted(ROOT.rglob("*")):
        relative = file.relative_to(ROOT)
        path = relative.as_posix()
        if not file.is_file() or any(part in SKIP_DIRS for part in relative.parts):
            continue
        if path.startswith("docs/mobile-app/") or path == "scripts/audit_mobile_readiness.py":
            continue
        raw = file.read_bytes()
        kind = category(path)
        # Operational storage and record-bearing data are metadata-only.
        sensitive = kind in {"data-asset", "runtime-storage"} or file.name == ".env" or file.name.startswith(".env.") and file.name != ".env.example"
        is_text = not sensitive and (file.suffix.lower() in TEXT_EXT or file.name in {"artisan", ".env.example", ".gitignore", ".gitattributes", ".editorconfig"})
        content = raw.decode("utf-8-sig", errors="replace") if is_text else ""
        inventory.append({"path": path, "category": kind, "bytes": len(raw), "lines": len(content.splitlines()) if is_text else "", "sha256": hashlib.sha256(raw).hexdigest(), "inspection": "structural-text-scan" if is_text else "metadata-only", "runtime_verified": "no"})
        if not is_text:
            continue
        lines = content.splitlines()
        for number, line in enumerate(lines, 1):
            method = re.search(r"(?:public|protected|private)\s+(?:static\s+)?function\s+([\w]+)\s*\(", line)
            if method and kind in {"controller", "model", "service", "support", "middleware", "backend-other"}:
                symbols.append({"path": path, "line": number, "kind": kind, "method": method.group(1), "signature": line.strip()})
            table = re.search(r"Schema::(create|table)\(\s*['\"]([^'\"]+)", line)
            if table:
                schema.append({"path": path, "line": number, "operation": table.group(1), "table": table.group(2)})
        if kind == "route":
            starts = list(re.finditer(r"Route::(get|post|put|patch|delete|match|any|resource|apiResource|redirect|view)\s*\(", content))
            for index, match in enumerate(starts):
                end = starts[index + 1].start() if index + 1 < len(starts) else len(content)
                chunk = content[match.start():end].split(";", 1)[0]
                uri = re.search(r"^Route::\w+\(\s*['\"]([^'\"]*)", chunk)
                if match.group(1) == "match":
                    uri = re.search(r"\],\s*['\"]([^'\"]*)", chunk)
                target = re.search(r"\[([\w\\]+)::class,\s*['\"]([^'\"]+)", chunk)
                name = re.search(r"->name\(\s*['\"]([^'\"]+)", chunk)
                routes.append({"path": path, "line": content[:match.start()].count("\n") + 1, "verb": match.group(1).upper(), "declared_uri": uri.group(1) if uri else "<dynamic>", "controller": target.group(1) if target else "closure/invokable/redirect/resource", "action": target.group(2) if target else "", "local_name": name.group(1) if name else "", "local_permissions": " | ".join(re.findall(r"permission:([\w.\-,]+)", chunk)), "scope_note": "Group prefixes, inherited middleware and resource expansion require runtime route:list"})
        if kind == "web-page":
            pages.append({"path": path, "lines": len(lines), "renderable_candidate": "yes" if re.search(r"export\s+default", content) else "no/helper", "route_calls": " | ".join(sorted(set(re.findall(r"\broute\(\s*['\"]([^'\"]+)", content)))), "states_to_design": "loading | empty | error | success | forbidden | offline | stale | submitting"})
        if kind == "test":
            titles = re.findall(r"\b(?:it|test)\(\s*['\"]([^'\"]+)", content)
            titles += re.findall(r"function\s+(test_\w+)\s*\(", content)
            tests.append({"path": path, "declared_test_titles": len(titles), "titles": " | ".join(titles), "execution": "not run: vendor/autoload.php absent"})
        if php and file.suffix == ".php" and not file.name.endswith(".blade.php"):
            result = subprocess.run([php, "-l", str(file)], capture_output=True, text=True, encoding="utf-8", errors="replace")
            lint.append({"path": path, "result": "pass" if result.returncode == 0 else "fail", "detail": "syntax only" if result.returncode == 0 else (result.stdout + result.stderr).strip()})
    write_csv("file-inventory.csv", inventory, ["path", "category", "bytes", "lines", "sha256", "inspection", "runtime_verified"])
    write_csv("route-declarations.csv", routes, ["path", "line", "verb", "declared_uri", "controller", "action", "local_name", "local_permissions", "scope_note"])
    write_csv("backend-methods.csv", symbols, ["path", "line", "kind", "method", "signature"])
    write_csv("schema-operations.csv", schema, ["path", "line", "operation", "table"])
    write_csv("web-page-inventory.csv", pages, ["path", "lines", "renderable_candidate", "route_calls", "states_to_design"])
    write_csv("test-inventory.csv", tests, ["path", "declared_test_titles", "titles", "execution"])
    write_csv("php-syntax.csv", lint, ["path", "result", "detail"])
    summary = {
        "client_date": "2026-11-13", "timezone": "Asia/Dhaka",
        "method": "static structural scan + PHP syntax; selected manual source review; no runtime certification",
        "files": len(inventory), "categories": dict(Counter(row["category"] for row in inventory)),
        "text_lines": sum(row["lines"] for row in inventory if isinstance(row["lines"], int)),
        "route_declarations": len(routes), "route_files": dict(Counter(row["path"] for row in routes)),
        "backend_methods": len(symbols), "schema_operations": len(schema),
        "distinct_created_tables": len({row["table"] for row in schema if row["operation"] == "create"}),
        "web_page_files": len(pages), "renderable_page_candidates": sum(row["renderable_candidate"] == "yes" for row in pages),
        "test_files": len(tests), "declared_test_titles": sum(row["declared_test_titles"] for row in tests),
        "php_syntax": dict(Counter(row["result"] for row in lint)),
        "vendor_installed": (ROOT / "vendor/autoload.php").exists(), "node_modules_installed": (ROOT / "node_modules").exists(),
        "environment_file_present": (ROOT / ".env").exists(),
        "exclusions": [".git internals", "installed dependencies / generated build trees", "this planning output and its generator"],
        "metadata_only": "Record-bearing data/, operational storage/, binary files; no employee data copied",
    }
    (OUT / "summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=True, indent=2))


if __name__ == "__main__":
    main()
