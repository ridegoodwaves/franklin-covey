"use client";

import React, { useState, useCallback } from "react";
import { cn, getStatusLabel } from "@/lib/utils";
import { PortalShell } from "@/components/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function DashboardIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}

function CoachesIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function ImportIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function EngagementsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  );
}

function PortalIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}

function UploadCloudIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
      <path d="M12 12v9" />
      <path d="m16 16-4-4-4 4" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function FileTextIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M10 9H8" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
    </svg>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function XCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="m15 9-6 6" />
      <path d="m9 9 6 6" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </svg>
  );
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Nav items
// ---------------------------------------------------------------------------

const navItems = [
  { label: "Dashboard", href: "/admin/dashboard", icon: <DashboardIcon /> },
  { label: "Coaches", href: "/admin/coaches", icon: <CoachesIcon /> },
  { label: "Import", href: "/admin/import", icon: <ImportIcon />, active: true },
  { label: "Engagements", href: "/admin/engagements", icon: <EngagementsIcon />, badge: 12 },
];

// ---------------------------------------------------------------------------
// Sample parsed CSV data (for preview step)
// ---------------------------------------------------------------------------

interface ParsedRow {
  rowNum: number;
  firstName: string;
  lastName: string;
  email: string;
  org: string;
  programTrack: string;
  valid: boolean;
  errors: string[];
}

const sampleParsedData: ParsedRow[] = [
  { rowNum: 1, firstName: "Sarah", lastName: "Mitchell", email: "sarah.mitchell@gsa.gov", org: "GSA", programTrack: "FIVE_SESSION", valid: true, errors: [] },
  { rowNum: 2, firstName: "James", lastName: "Rodriguez", email: "j.rodriguez@doi.gov", org: "DOI", programTrack: "TWO_SESSION", valid: true, errors: [] },
  { rowNum: 3, firstName: "Emily", lastName: "Watkins", email: "emily.watkins@epa.gov", org: "EPA", programTrack: "FIVE_SESSION", valid: true, errors: [] },
  { rowNum: 4, firstName: "Robert", lastName: "", email: "r.kim@dod.gov", org: "DOD", programTrack: "FIVE_SESSION", valid: false, errors: ["Last name is required"] },
  { rowNum: 5, firstName: "Diana", lastName: "Brooks", email: "diana.brooks@hhs.gov", org: "HHS", programTrack: "TWO_SESSION", valid: true, errors: [] },
  { rowNum: 6, firstName: "Thomas", lastName: "Grant", email: "t.grant.usda.gov", org: "USDA", programTrack: "TWO_SESSION", valid: false, errors: ["Invalid email format"] },
  { rowNum: 7, firstName: "Michelle", lastName: "Alvarez", email: "m.alvarez@treasury.gov", org: "Treasury", programTrack: "FIVE_SESSION", valid: true, errors: [] },
  { rowNum: 8, firstName: "Kevin", lastName: "O'Brien", email: "kevin.obrien@va.gov", org: "VA", programTrack: "TWO_SESSION", valid: true, errors: [] },
  { rowNum: 9, firstName: "Patricia", lastName: "Nguyen", email: "p.nguyen@state.gov", org: "State", programTrack: "FIVE_SESSION", valid: true, errors: [] },
  { rowNum: 10, firstName: "Steven", lastName: "Clarke", email: "steven.clarke@dhs.gov", org: "DHS", programTrack: "THREE_SESSION", valid: false, errors: ["Invalid program_track: must be TWO_SESSION or FIVE_SESSION"] },
  { rowNum: 11, firstName: "Amanda", lastName: "Foster", email: "a.foster@ed.gov", org: "ED", programTrack: "FIVE_SESSION", valid: true, errors: [] },
  { rowNum: 12, firstName: "Daniel", lastName: "Martinez", email: "d.martinez@dot.gov", org: "DOT", programTrack: "TWO_SESSION", valid: true, errors: [] },
  { rowNum: 13, firstName: "Rachel", lastName: "Thompson", email: "r.thompson@commerce.gov", org: "Commerce", programTrack: "FIVE_SESSION", valid: true, errors: [] },
  { rowNum: 14, firstName: "Christopher", lastName: "Lee", email: "", org: "DOJ", programTrack: "TWO_SESSION", valid: false, errors: ["Email is required"] },
  { rowNum: 15, firstName: "Laura", lastName: "Henderson", email: "l.henderson@labor.gov", org: "Labor", programTrack: "FIVE_SESSION", valid: true, errors: [] },
];

// ---------------------------------------------------------------------------
// Step indicator component
// ---------------------------------------------------------------------------

function StepIndicator({ currentStep }: { currentStep: number }) {
  const steps = [
    { num: 1, label: "Upload CSV" },
    { num: 2, label: "Preview & Validate" },
    { num: 3, label: "Confirm & Send" },
  ];

  return (
    <div className="flex items-center justify-center mb-10">
      {steps.map((step, idx) => {
        const isActive = step.num === currentStep;
        const isComplete = step.num < currentStep;
        const isLast = idx === steps.length - 1;

        return (
          <React.Fragment key={step.num}>
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-all duration-500",
                  isComplete && "bg-navy-800 text-white",
                  isActive && "bg-gold-600 text-white shadow-lg shadow-gold-600/25",
                  !isActive && !isComplete && "border-2 border-border bg-white text-muted-foreground"
                )}
              >
                {isComplete ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  step.num
                )}
              </div>
              <span
                className={cn(
                  "text-sm font-medium transition-colors duration-300",
                  isActive && "text-navy-900",
                  isComplete && "text-navy-700",
                  !isActive && !isComplete && "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
            {!isLast && (
              <div className="mx-4 h-px w-16 sm:w-24">
                <div
                  className={cn(
                    "h-full transition-all duration-700",
                    step.num < currentStep ? "bg-navy-800" : "bg-border"
                  )}
                />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 1: Upload
// ---------------------------------------------------------------------------

function UploadStep({ onNext }: { onNext: () => void }) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setFileName("participants_q1_2026.csv");
  }, []);

  const handleFileSelect = useCallback(() => {
    setFileName("participants_q1_2026.csv");
  }, []);

  return (
    <Card className="mx-auto max-w-2xl opacity-0 animate-fade-in-up">
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-2xl">Upload Participant List</CardTitle>
        <CardDescription className="text-base">
          Import participants from a CSV file to create engagements and send invitations
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-4">
        {/* Drop zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleFileSelect}
          className={cn(
            "group relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 transition-all duration-300",
            isDragging
              ? "border-gold-500 bg-gold-50/60 shadow-inner"
              : fileName
                ? "border-sage-400 bg-sage-50/40"
                : "border-border hover:border-navy-300 hover:bg-navy-50/30"
          )}
        >
          {fileName ? (
            <>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sage-100">
                <FileTextIcon className="h-6 w-6 text-sage-700" />
              </div>
              <p className="mt-4 text-sm font-semibold text-navy-900">{fileName}</p>
              <p className="mt-1 text-xs text-muted-foreground">15 rows detected</p>
              <Button variant="ghost" size="sm" className="mt-3 text-xs" onClick={(e) => { e.stopPropagation(); setFileName(null); }}>
                Choose different file
              </Button>
            </>
          ) : (
            <>
              <div className={cn(
                "flex h-16 w-16 items-center justify-center rounded-2xl transition-colors duration-300",
                isDragging ? "bg-gold-100 text-gold-700" : "bg-navy-50 text-navy-400 group-hover:bg-navy-100 group-hover:text-navy-600"
              )}>
                <UploadCloudIcon />
              </div>
              <p className="mt-5 text-sm font-medium text-navy-800">
                {isDragging ? "Drop your file here" : "Drag and drop your CSV file here"}
              </p>
              <p className="mt-1.5 text-xs text-muted-foreground">
                or <span className="text-gold-700 font-medium underline underline-offset-2">browse to select</span>
              </p>
              <p className="mt-4 text-[11px] text-muted-foreground">
                Accepts .csv files up to 10MB
              </p>
            </>
          )}
        </div>

        {/* Template download */}
        <Separator className="my-6 opacity-50" />

        <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-4 py-3">
          <div className="flex items-center gap-3">
            <FileTextIcon className="text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-navy-800">CSV Template</p>
              <p className="text-[11px] text-muted-foreground">
                first_name, last_name, email, org, program_track
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            <DownloadIcon />
            Download
          </Button>
        </div>

        {/* Expected columns */}
        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Required Columns
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {["first_name", "last_name", "email", "org", "program_track"].map((col) => (
              <div key={col} className="rounded-md border border-border/60 bg-white px-3 py-2 text-center">
                <code className="text-[11px] font-mono text-navy-700">{col}</code>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            <span className="font-medium">program_track</span> accepts: <code className="text-navy-600">TWO_SESSION</code> or <code className="text-navy-600">FIVE_SESSION</code>
          </p>
        </div>
      </CardContent>

      <CardFooter className="justify-end pt-2">
        <Button
          onClick={onNext}
          disabled={!fileName}
          className="gap-2"
        >
          Continue to Preview
          <ArrowRightIcon />
        </Button>
      </CardFooter>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Step 2: Preview & Validate
// ---------------------------------------------------------------------------

function PreviewStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const validCount = sampleParsedData.filter((r) => r.valid).length;
  const errorCount = sampleParsedData.filter((r) => !r.valid).length;

  return (
    <div className="opacity-0 animate-fade-in-up">
      {/* Summary bar */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <CheckCircleIcon className="text-sage-600" />
          <span className="text-sm text-navy-800">
            <span className="font-semibold">{validCount}</span> valid rows
          </span>
        </div>
        {errorCount > 0 && (
          <div className="flex items-center gap-2">
            <XCircleIcon className="text-red-500" />
            <span className="text-sm text-red-700">
              <span className="font-semibold">{errorCount}</span> row{errorCount !== 1 ? "s" : ""} with errors
            </span>
          </div>
        )}
        <div className="flex-1" />
        <p className="text-xs text-muted-foreground">
          Errors must be fixed in your CSV and re-uploaded, or those rows will be skipped
        </p>
      </div>

      {/* Data table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30">
                  <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-10">#</th>
                  <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-12">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">First Name</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Last Name</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Email</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Org</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Program Track</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Errors</th>
                </tr>
              </thead>
              <tbody>
                {sampleParsedData.map((row) => (
                  <tr
                    key={row.rowNum}
                    className={cn(
                      "border-b border-border/30 transition-colors",
                      !row.valid && "bg-red-50/50"
                    )}
                  >
                    <td className="px-4 py-3 text-center text-xs text-muted-foreground font-mono">
                      {row.rowNum}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {row.valid ? (
                        <CheckCircleIcon className="mx-auto text-sage-600" />
                      ) : (
                        <XCircleIcon className="mx-auto text-red-500" />
                      )}
                    </td>
                    <td className={cn("px-4 py-3 text-sm", !row.valid && !row.firstName && "text-red-600 italic")}>
                      {row.firstName || "Missing"}
                    </td>
                    <td className={cn("px-4 py-3 text-sm", !row.valid && !row.lastName && "text-red-600 italic")}>
                      {row.lastName || <span className="text-red-600 italic">Missing</span>}
                    </td>
                    <td className={cn("px-4 py-3 text-sm font-mono text-xs", !row.valid && row.errors.some(e => e.toLowerCase().includes("email")) && "text-red-600")}>
                      {row.email || <span className="text-red-600 italic text-sm">Missing</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-navy-700">{row.org}</td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          row.programTrack === "FIVE_SESSION" ? "info" :
                          row.programTrack === "TWO_SESSION" ? "outline" : "destructive"
                        }
                        className="text-[10px]"
                      >
                        {row.programTrack === "TWO_SESSION" || row.programTrack === "FIVE_SESSION"
                          ? getStatusLabel(row.programTrack)
                          : row.programTrack}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {row.errors.length > 0 && (
                        <span className="text-xs text-red-600 font-medium">
                          {row.errors.join("; ")}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Action buttons */}
      <div className="flex items-center justify-between mt-6">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeftIcon />
          Back
        </Button>
        <div className="flex items-center gap-3">
          {errorCount > 0 && (
            <p className="text-xs text-muted-foreground">
              {errorCount} error row{errorCount !== 1 ? "s" : ""} will be skipped
            </p>
          )}
          <Button onClick={onNext} className="gap-2">
            Continue to Confirm
            <ArrowRightIcon />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 3: Confirm & Send
// ---------------------------------------------------------------------------

function ConfirmStep({ onBack, onSubmit, isSubmitting, isComplete }: {
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  isComplete: boolean;
}) {
  const validRows = sampleParsedData.filter((r) => r.valid);
  const twoSession = validRows.filter((r) => r.programTrack === "TWO_SESSION").length;
  const fiveSession = validRows.filter((r) => r.programTrack === "FIVE_SESSION").length;
  const errorRows = sampleParsedData.filter((r) => !r.valid).length;
  const orgs = [...new Set(validRows.map((r) => r.org))];

  if (isComplete) {
    return (
      <Card className="mx-auto max-w-lg opacity-0 animate-fade-in-up">
        <CardContent className="py-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-sage-100 opacity-0 animate-scale-in">
            <CheckCircleIcon className="h-8 w-8 text-sage-700" />
          </div>
          <h2 className="mt-6 font-display text-2xl font-semibold text-navy-900">
            Import Successful
          </h2>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            {validRows.length} participants have been imported and invitation
            emails are being sent.
          </p>

          <div className="mt-8 grid grid-cols-3 gap-4">
            <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
              <p className="font-display text-2xl font-semibold text-navy-900">{validRows.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Imported</p>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
              <p className="font-display text-2xl font-semibold text-navy-900">{validRows.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Emails Queued</p>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
              <p className="font-display text-2xl font-semibold text-red-600">{errorRows}</p>
              <p className="text-xs text-muted-foreground mt-1">Skipped</p>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button asChild>
              <a href="/admin/dashboard">View Dashboard</a>
            </Button>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Import Another File
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mx-auto max-w-2xl opacity-0 animate-fade-in-up">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gold-100">
          <SparklesIcon className="text-gold-700" />
        </div>
        <CardTitle className="text-2xl">Ready to Import</CardTitle>
        <CardDescription className="text-base">
          Review the summary below before sending invitations
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-4">
        {/* Summary grid */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-6">
          <div className="rounded-xl border border-border/60 bg-muted/20 p-4 text-center">
            <p className="font-display text-3xl font-semibold text-navy-900">{validRows.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Total Participants</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-muted/20 p-4 text-center">
            <p className="font-display text-3xl font-semibold text-navy-900">{twoSession}</p>
            <p className="text-xs text-muted-foreground mt-1">2-Session Track</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-muted/20 p-4 text-center">
            <p className="font-display text-3xl font-semibold text-navy-900">{fiveSession}</p>
            <p className="text-xs text-muted-foreground mt-1">5-Session Track</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-muted/20 p-4 text-center">
            <p className="font-display text-3xl font-semibold text-navy-900">{orgs.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Organizations</p>
          </div>
        </div>

        {errorRows > 0 && (
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50/60 px-4 py-3">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#B45309" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
            </svg>
            <div>
              <p className="text-sm font-medium text-amber-800">
                {errorRows} row{errorRows !== 1 ? "s" : ""} will be skipped
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                These rows had validation errors and will not be imported
              </p>
            </div>
          </div>
        )}

        <Separator className="my-6 opacity-50" />

        {/* What happens next */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            What happens next
          </p>
          <div className="space-y-3">
            {[
              { step: "1", text: "Engagement records are created for each participant" },
              { step: "2", text: "Each participant receives an email invitation with a unique link" },
              { step: "3", text: "Participants select their preferred coach from the available roster" },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy-100 text-[11px] font-semibold text-navy-700">
                  {item.step}
                </div>
                <p className="text-sm text-navy-700 leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex items-center justify-between pt-2">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeftIcon />
          Back
        </Button>
        <Button
          variant="gold"
          onClick={onSubmit}
          disabled={isSubmitting}
          className="gap-2 px-8"
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Importing...
            </>
          ) : (
            <>
              <SendIcon />
              Import & Send Invitations
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main Import Page
// ---------------------------------------------------------------------------

export default function ImportPage() {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const handleSubmit = () => {
    setIsSubmitting(true);
    // Simulate import
    setTimeout(() => {
      setIsSubmitting(false);
      setIsComplete(true);
    }, 2500);
  };

  return (
    <PortalShell
      portalName="Operations"
      portalIcon={<PortalIcon />}
      userName="Catherine Reynolds"
      userRole="Program Administrator"
      navItems={navItems}
      activeItem="/admin/import"
    >
      {/* Page header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-navy-900">
          Import Participants
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Bulk import participants from a CSV file
        </p>
      </div>

      {/* Step indicator */}
      <StepIndicator currentStep={step} />

      {/* Step content */}
      {step === 1 && (
        <UploadStep onNext={() => setStep(2)} />
      )}

      {step === 2 && (
        <PreviewStep onNext={() => setStep(3)} onBack={() => setStep(1)} />
      )}

      {step === 3 && (
        <ConfirmStep
          onBack={() => setStep(2)}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          isComplete={isComplete}
        />
      )}
    </PortalShell>
  );
}
