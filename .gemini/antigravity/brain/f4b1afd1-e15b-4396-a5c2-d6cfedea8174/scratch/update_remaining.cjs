const fs = require('fs');

const filePath = 'c:\\\\Code\\\\hrm-mou\\\\resources\\\\js\\\\pages\\\\attendance\\\\daily-branch-summary.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Overall Summary Ribbon Card replacement
const cardTarget = `<span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Leaves & Duty</span>
                        <div className="text-2xl font-black text-slate-900 tracking-tight mt-1">
                            {overallLeaveCount} <span className="text-xs text-slate-400 font-medium">Leave</span>
                        </div>`;

const cardReplacement = `<span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Leaves & Duty</span>
                        <div className="text-2xl font-black text-slate-900 tracking-tight mt-1 flex items-baseline gap-1.5">
                            <span>{overallLeaveCount}</span>
                            <span className="text-xs text-slate-400 font-bold uppercase">Leave</span>
                            <span className="text-slate-300 mx-1">|</span>
                            <span>{derived.reduce((sum, r) => sum + (r.branch.counts?.on_duty ?? 0), 0)}</span>
                            <span className="text-xs text-amber-500 font-bold uppercase">On Duty</span>
                        </div>`;

if (content.includes(cardTarget)) {
    content = content.replace(cardTarget, cardReplacement);
    console.log('Successfully updated Leaves & Duty card in ribbon!');
} else {
    // Try with different line endings
    const cardTargetLF = cardTarget.replace(/\r\n/g, '\n');
    if (content.includes(cardTargetLF)) {
        content = content.replace(cardTargetLF, cardReplacement);
        console.log('Successfully updated Leaves & Duty card (LF)!');
    } else {
        console.error('Leaves & Duty card target not found!');
    }
}

// 2. Print KPIs Ribbon replacement
const printKpiTarget = `<div className="border border-slate-300 p-2 rounded-lg bg-slate-50 print-color-exact">
                        <span className="text-[8px] font-bold uppercase tracking-wider text-slate-455 block leading-none">Leaves & Duty</span>
                        <div className="text-base font-black text-blue-650 mt-1 leading-none">{overallLeaveCount}</div>
                    </div>`;

const printKpiReplacement = `<div className="border border-slate-300 p-2 rounded-lg bg-slate-50 print-color-exact">
                        <span className="text-[8px] font-bold uppercase tracking-wider text-slate-455 block leading-none">Leaves & Duty</span>
                        <div className="text-sm font-black text-slate-800 mt-1 leading-none flex items-baseline gap-1">
                            <span>{overallLeaveCount} L</span>
                            <span className="text-slate-300 font-normal">|</span>
                            <span className="text-amber-600">{derived.reduce((sum, r) => sum + (r.branch.counts?.on_duty ?? 0), 0)} OD</span>
                        </div>
                    </div>`;

if (content.includes(printKpiTarget)) {
    content = content.replace(printKpiTarget, printKpiReplacement);
    console.log('Successfully updated Print KPIs ribbon!');
} else {
    const printKpiTargetLF = printKpiTarget.replace(/\r\n/g, '\n');
    if (content.includes(printKpiTargetLF)) {
        content = content.replace(printKpiTargetLF, printKpiReplacement);
        console.log('Successfully updated Print KPIs ribbon (LF)!');
    } else {
        console.error('Print KPIs ribbon target not found!');
    }
}

// 3. MiniStackBar segments in grid cards replacement
const gridMiniStackTarget = `                                                    <MiniStackBar
                                                         ariaLabel={\`\${b.name} Present / Absent / Leave\`}
                                                         segments={[
                                                             { key: 'present', label: 'Present', value: row.present, className: 'bg-emerald-500' },
                                                             { key: 'absent', label: 'Absent', value: row.absent, className: 'bg-rose-500' },
                                                             { key: 'leave', label: 'Leave', value: row.leave, className: 'bg-blue-500' },
                                                         ]}
                                                     />`;

const gridMiniStackReplacement = `                                                    <MiniStackBar
                                                         ariaLabel={\`\${b.name} Present / On Duty / Absent / Leave\`}
                                                         segments={[
                                                             { key: 'present', label: 'Present', value: row.present - (b.counts?.on_duty ?? 0), className: 'bg-emerald-500' },
                                                             { key: 'on_duty', label: 'On Duty', value: b.counts?.on_duty ?? 0, className: 'bg-amber-500' },
                                                             { key: 'absent', label: 'Absent', value: row.absent, className: 'bg-rose-500' },
                                                             { key: 'leave', label: 'Leave', value: row.leave, className: 'bg-blue-500' },
                                                         ]}
                                                     />`;

if (content.includes(gridMiniStackTarget)) {
    content = content.replace(gridMiniStackTarget, gridMiniStackReplacement);
    console.log('Successfully updated grid MiniStackBar!');
} else {
    // Let's do a regex replace to be completely safe from indentation and newlines
    const regexGrid = /<MiniStackBar\s+ariaLabel=\{\`\$\{b\.name\} Present \/ Absent \/ Leave\`\}\s+segments=\{\[\s*\{\s*key:\s*'present',\s*label:\s*'Present',\s*value:\s*row\.present,\s*className:\s*'bg-emerald-500'\s*\},\s*\{\s*key:\s*'absent',\s*label:\s*'Absent',\s*value:\s*row\.absent,\s*className:\s*'bg-rose-500'\s*\},\s*\{\s*key:\s*'leave',\s*label:\s*'Leave',\s*value:\s*row\.leave,\s*className:\s*'bg-blue-500'\s*\}\s*\]\}\s*\/>/g;
    if (regexGrid.test(content)) {
        content = content.replace(regexGrid, `<MiniStackBar
                                                         ariaLabel={\`\${b.name} Present / On Duty / Absent / Leave\`}
                                                         segments={[
                                                             { key: 'present', label: 'Present', value: row.present - (b.counts?.on_duty ?? 0), className: 'bg-emerald-500' },
                                                             { key: 'on_duty', label: 'On Duty', value: b.counts?.on_duty ?? 0, className: 'bg-amber-500' },
                                                             { key: 'absent', label: 'Absent', value: row.absent, className: 'bg-rose-500' },
                                                             { key: 'leave', label: 'Leave', value: row.leave, className: 'bg-blue-500' },
                                                         ]}
                                                     />`);
        console.log('Successfully updated grid MiniStackBar using regex!');
    } else {
        console.error('Grid MiniStackBar target not found!');
    }
}

// 4. MiniStackBar segments in table view replacement
const tableMiniStackTarget = `                                                         <MiniStackBar
                                                              ariaLabel={\`\${b.name} distribution\`}
                                                              segments={[
                                                                  { key: 'present', label: 'Present', value: row.present, className: 'bg-emerald-500' },
                                                                  { key: 'absent', label: 'Absent', value: row.absent, className: 'bg-rose-500' },
                                                                  { key: 'leave', label: 'Leave', value: row.leave, className: 'bg-blue-500' },
                                                              ]}
                                                         />`;

if (content.includes(tableMiniStackTarget)) {
    content = content.replace(tableMiniStackTarget, `                                                         <MiniStackBar
                                                              ariaLabel={\`\${b.name} distribution\`}
                                                              segments={[
                                                                  { key: 'present', label: 'Present', value: row.present - (b.counts?.on_duty ?? 0), className: 'bg-emerald-500' },
                                                                  { key: 'on_duty', label: 'On Duty', value: b.counts?.on_duty ?? 0, className: 'bg-amber-500' },
                                                                  { key: 'absent', label: 'Absent', value: row.absent, className: 'bg-rose-500' },
                                                                  { key: 'leave', label: 'Leave', value: row.leave, className: 'bg-blue-500' },
                                                              ]}
                                                         />`);
    console.log('Successfully updated table MiniStackBar!');
} else {
    const regexTable = /<MiniStackBar\s+ariaLabel=\{\`\$\{b\.name\} distribution\`\}\s+segments=\{\[\s*\{\s*key:\s*'present',\s*label:\s*'Present',\s*value:\s*row\.present,\s*className:\s*'bg-emerald-500'\s*\},\s*\{\s*key:\s*'absent',\s*label:\s*'Absent',\s*value:\s*row\.absent,\s*className:\s*'bg-rose-500'\s*\},\s*\{\s*key:\s*'leave',\s*label:\s*'Leave',\s*value:\s*row\.leave,\s*className:\s*'bg-blue-500'\s*\}\s*\]\}\s*\/>/g;
    if (regexTable.test(content)) {
        content = content.replace(regexTable, `<MiniStackBar
                                                             ariaLabel={\`\${b.name} distribution\`}
                                                             segments={[
                                                                 { key: 'present', label: 'Present', value: row.present - (b.counts?.on_duty ?? 0), className: 'bg-emerald-500' },
                                                                 { key: 'on_duty', label: 'On Duty', value: b.counts?.on_duty ?? 0, className: 'bg-amber-500' },
                                                                 { key: 'absent', label: 'Absent', value: row.absent, className: 'bg-rose-500' },
                                                                 { key: 'leave', label: 'Leave', value: row.leave, className: 'bg-blue-500' },
                                                             ]}
                                                         />`);
        console.log('Successfully updated table MiniStackBar using regex!');
    } else {
        console.error('Table MiniStackBar target not found!');
    }
}

// 5. Employee card name tag replacement for "No Movement" badge
const employeeNameTarget = `<div className="text-xs font-bold text-slate-800 truncate" title={r.name}>{r.name}</div>`;
const employeeNameReplacement = `<div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                                                <span className="truncate" title={r.name}>{r.name}</span>
                                                                {(!r.movements || r.movements.length === 0) && (
                                                                    <span className="text-[8px] font-medium text-slate-400 bg-slate-100 px-1 py-0.5 rounded leading-none shrink-0">
                                                                        No Movement
                                                                    </span>
                                                                )}
                                                            </div>`;

if (content.includes(employeeNameTarget)) {
    content = content.replace(employeeNameTarget, employeeNameReplacement);
    console.log('Successfully updated employee card name tag!');
} else {
    const employeeNameTargetLF = employeeNameTarget.replace(/\r\n/g, '\n');
    if (content.includes(employeeNameTargetLF)) {
        content = content.replace(employeeNameTargetLF, employeeNameReplacement);
        console.log('Successfully updated employee card name tag (LF)!');
    } else {
        console.error('Employee card name tag target not found!');
    }
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Done!');
