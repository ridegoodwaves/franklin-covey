import {
  EngagementStatus,
  ProgramCode,
  UserRole,
  type Prisma,
} from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildNeedsAttentionWhere } from "@/lib/needs-attention";
import { resolveAdminOrgScope } from "@/lib/server/admin-scope";
import { readPortalSession } from "@/lib/server/session";

export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;
const CONTROL_CHARS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;
const FORMULA_PREFIX = /^\s*[=+\-@\t\r]/;
const EXPORT_ROW_LIMIT = 5000;

type ExportTab = "all" | "needs_attention";

function parseStatus(value: string | null): EngagementStatus | null {
  if (!value) return null;
  return Object.values(EngagementStatus).includes(value as EngagementStatus)
    ? (value as EngagementStatus)
    : null;
}

function parseTab(value: string | null): ExportTab {
  return value === "needs_attention" ? "needs_attention" : "all";
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function sanitizeCsvField(value: unknown): string {
  if (value === null || value === undefined) return "";

  let cleaned = String(value).replace(CONTROL_CHARS, "");
  if (FORMULA_PREFIX.test(cleaned)) {
    cleaned = `\t${cleaned}`;
  }

  const escaped = cleaned.replace(/"/g, "\"\"");
  return /[,"\n\r]/.test(escaped) ? `"${escaped}"` : escaped;
}

function daysSinceActivity(lastActivityAt: Date | null, now: Date): string {
  if (!lastActivityAt) return "";
  const days = Math.max(0, Math.floor((now.getTime() - lastActivityAt.getTime()) / DAY_MS));
  return String(days);
}

function splitCoachName(displayName: string | null, firstName: string | null, lastName: string | null): {
  first: string;
  last: string;
} {
  if (firstName || lastName) {
    return {
      first: firstName ?? "",
      last: lastName ?? "",
    };
  }

  if (!displayName) return { first: "", last: "" };
  const [first = "", ...rest] = displayName.trim().split(/\s+/);
  return {
    first,
    last: rest.join(" "),
  };
}

async function resolveProgramFilter(
  scopeOrgId: string,
  rawProgramId: string | null
): Promise<{ where?: Prisma.EngagementWhereInput; programCodeSegment?: string }> {
  const normalized = rawProgramId?.trim();
  if (!normalized) return {};

  if (Object.values(ProgramCode).includes(normalized as ProgramCode)) {
    return {
      where: {
        program: {
          code: normalized as ProgramCode,
        },
      },
      programCodeSegment: normalized,
    };
  }

  const program = await prisma.program.findFirst({
    where: {
      id: normalized,
      organizationId: scopeOrgId,
      archivedAt: null,
    },
    select: {
      id: true,
      code: true,
    },
  });

  if (!program) {
    return {
      where: { programId: "__no_matching_program__" },
      programCodeSegment: normalized,
    };
  }

  return {
    where: { programId: program.id },
    programCodeSegment: program.code,
  };
}

async function resolveCoachFilenameSegment(
  scopeOrgId: string,
  coachId: string | undefined
): Promise<string | undefined> {
  if (!coachId) return undefined;

  const coach = await prisma.organizationCoach.findFirst({
    where: {
      id: coachId,
      organizationId: scopeOrgId,
      archivedAt: null,
    },
    select: {
      coachProfile: {
        select: {
          displayName: true,
        },
      },
    },
  });

  const label = coach?.coachProfile.displayName || coachId;
  const slug = slugify(label);
  return slug ? `coach-${slug}` : "coach";
}

function buildFilename(params: {
  tab: ExportTab;
  programCodeSegment?: string;
  status?: EngagementStatus;
  coachSegment?: string;
}): string {
  const segments = ["fc"];

  if (params.tab === "needs_attention") {
    segments.push("needs-attention");
  }

  if (params.programCodeSegment) {
    segments.push(slugify(params.programCodeSegment));
  }

  if (params.status) {
    segments.push(slugify(params.status));
  }

  if (params.coachSegment) {
    segments.push(params.coachSegment);
  }

  if (segments.length === 1) {
    segments.push("all-engagements");
  }

  segments.push(new Date().toISOString().slice(0, 10));
  return `${segments.join("-")}.csv`;
}

export async function GET(request: NextRequest) {
  const session = readPortalSession(request);
  if (!session || session.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const format = request.nextUrl.searchParams.get("format")?.trim().toLowerCase();
  if (format && format !== "csv") {
    return NextResponse.json({ error: "Only format=csv is supported" }, { status: 400 });
  }

  const statusFilter = parseStatus(request.nextUrl.searchParams.get("status"));
  const coachId = request.nextUrl.searchParams.get("coachId")?.trim() || undefined;
  const search = request.nextUrl.searchParams.get("search")?.trim() || undefined;
  const tab = parseTab(request.nextUrl.searchParams.get("tab"));

  try {
    const scopeOrgId = await resolveAdminOrgScope(session);
    const now = new Date();

    const programFilter = await resolveProgramFilter(
      scopeOrgId,
      request.nextUrl.searchParams.get("programId")
    );

    const whereClauses: Prisma.EngagementWhereInput[] = [
      { organizationId: scopeOrgId, archivedAt: null },
    ];

    if (programFilter.where) {
      whereClauses.push(programFilter.where);
    }

    if (statusFilter) {
      whereClauses.push({ status: statusFilter });
    }

    if (coachId) {
      whereClauses.push({ organizationCoachId: coachId });
    }

    if (search) {
      whereClauses.push({
        participant: {
          email: {
            contains: search,
            mode: "insensitive",
          },
        },
      });
    }

    if (tab === "needs_attention") {
      whereClauses.push(buildNeedsAttentionWhere(now));
    }

    const where: Prisma.EngagementWhereInput = { AND: whereClauses };

    const [totalRows, rows] = await Promise.all([
      prisma.engagement.count({ where }),
      prisma.engagement.findMany({
        where,
        take: EXPORT_ROW_LIMIT,
        select: {
          status: true,
          totalSessions: true,
          lastActivityAt: true,
          participant: {
            select: {
              email: true,
            },
          },
          organization: {
            select: {
              code: true,
            },
          },
          program: {
            select: {
              code: true,
            },
          },
          cohort: {
            select: {
              code: true,
            },
          },
          organizationCoach: {
            select: {
              coachProfile: {
                select: {
                  displayName: true,
                  firstName: true,
                  lastName: true,
                  user: {
                    select: {
                      email: true,
                    },
                  },
                },
              },
            },
          },
          _count: {
            select: {
              sessions: {
                where: {
                  archivedAt: null,
                },
              },
            },
          },
        },
        orderBy: [
          {
            program: {
              code: "asc",
            },
          },
          {
            cohort: {
              code: "asc",
            },
          },
          {
            participant: {
              email: "asc",
            },
          },
        ],
      }),
    ]);
    const truncated = totalRows > EXPORT_ROW_LIMIT;

    const coachSegment = await resolveCoachFilenameSegment(scopeOrgId, coachId);
    const filename = buildFilename({
      tab,
      programCodeSegment: programFilter.programCodeSegment,
      status: statusFilter ?? undefined,
      coachSegment,
    });

    const header = [
      "firstName",
      "lastName",
      "email",
      "org",
      "programCode",
      "cohortCode",
      "status",
      "coachFirstName",
      "coachLastName",
      "coachEmail",
      "sessionsCompleted",
      "totalSessions",
      "lastActivityAt",
      "daysSinceActivity",
    ];

    const csvRows = rows.map((row) => {
      const coachProfile = row.organizationCoach?.coachProfile;
      const coachName = splitCoachName(
        coachProfile?.displayName ?? null,
        coachProfile?.firstName ?? null,
        coachProfile?.lastName ?? null
      );

      return [
        "",
        "",
        row.participant.email,
        row.organization.code,
        row.program.code,
        row.cohort.code,
        row.status,
        coachName.first,
        coachName.last,
        coachProfile?.user.email ?? "",
        row._count.sessions,
        row.totalSessions,
        row.lastActivityAt ? row.lastActivityAt.toISOString() : "",
        daysSinceActivity(row.lastActivityAt, now),
      ];
    });

    const csv = [header, ...csvRows]
      .map((line) => line.map((value) => sanitizeCsvField(value)).join(","))
      .join("\r\n");

    const responseHeaders: Record<string, string> = {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Export-Row-Limit": String(EXPORT_ROW_LIMIT),
      "X-Export-Total-Rows": String(totalRows),
      "X-Export-Truncated": String(truncated),
    };

    if (truncated) {
      responseHeaders["X-Export-Warning"] =
        `Truncated to ${EXPORT_ROW_LIMIT} rows (of ${totalRows} total)`;
    }

    return new NextResponse(csv, {
      status: 200,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("GET /api/export failed", error);
    return NextResponse.json({ error: "Failed to export CSV" }, { status: 500 });
  }
}
