"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * Legacy route compatibility redirect.
 * Redirects /coach/engagement?id=<id> → /coach/engagements/<id>
 * Keep this in place until old links/bookmarks are retired.
 */
function RedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const id = searchParams.get("id");
    if (id) {
      router.replace(`/coach/engagements/${id}`);
    } else {
      router.replace("/coach/dashboard");
    }
  }, [router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-muted-foreground">Redirecting...</p>
    </div>
  );
}

export default function CoachEngagementLegacyRedirect() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-sm text-muted-foreground">Redirecting...</p>
        </div>
      }
    >
      <RedirectContent />
    </Suspense>
  );
}
