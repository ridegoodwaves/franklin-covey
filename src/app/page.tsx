import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-background">
      {/* Content */}
      <div className="flex min-h-screen flex-col">
        {/* Header */}
        <header className="flex items-center justify-between px-8 py-6 lg:px-16">
          <div className="flex items-center gap-3">
            <img src="/fc-logo.svg" alt="FranklinCovey" className="h-7" />
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" className="text-fc-600 hover:text-fc-900 hover:bg-fc-50">
              Help
            </Button>
          </div>
        </header>

        {/* Hero */}
        <div className="flex flex-1 items-center justify-center px-8">
          <div className="w-full max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-fc-200 bg-fc-50 px-4 py-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-fc-600 animate-pulse-subtle" />
              <span className="text-sm font-medium text-fc-700">
                Government Leadership Coaching Program
              </span>
            </div>

            <h1 className="font-display text-5xl font-light leading-[1.1] tracking-tight text-fc-950 sm:text-6xl lg:text-7xl opacity-0 animate-fade-in-up">
              Your Path to{" "}
              <span className="font-medium italic text-fc-600">
                Exceptional
              </span>
              <br />
              Leadership
            </h1>

            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Connect with world-class coaches. Build the habits that drive
              lasting change. Transform your leadership, one session at a time.
            </p>

            {/* Portal Cards */}
            <div className="mt-16 grid gap-5 sm:grid-cols-3">
              {/* Participant */}
              <a
                href="/participant/"
                className="group relative overflow-hidden rounded-2xl border border-fc-100 bg-white p-8 text-left transition-all duration-300 hover:border-fc-200 hover:shadow-lg hover:shadow-fc-900/5 hover:-translate-y-0.5 opacity-0 animate-fade-in-up"
              >
                <div className="relative">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-fc-50 text-fc-600 transition-colors group-hover:bg-fc-100">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                  <h3 className="font-display text-xl font-semibold text-fc-900">
                    Participant
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Select your coach and book your first session.
                  </p>
                  <div className="mt-6 flex items-center gap-2 text-sm font-medium text-fc-600 transition-all group-hover:gap-3 group-hover:text-fc-800">
                    Enter Portal
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 12h14" />
                      <path d="m12 5 7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </a>

              {/* Coach */}
              <a
                href="/coach/dashboard"
                className="group relative overflow-hidden rounded-2xl border border-fc-100 bg-white p-8 text-left transition-all duration-300 hover:border-fc-200 hover:shadow-lg hover:shadow-fc-900/5 hover:-translate-y-0.5 opacity-0 animate-fade-in-up"
              >
                <div className="relative">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-fc-50 text-fc-600 transition-colors group-hover:bg-fc-100">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <h3 className="font-display text-xl font-semibold text-fc-900">
                    Coach
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Manage engagements, log sessions, and guide your
                    participants.
                  </p>
                  <div className="mt-6 flex items-center gap-2 text-sm font-medium text-fc-600 transition-all group-hover:gap-3 group-hover:text-fc-800">
                    Sign In
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 12h14" />
                      <path d="m12 5 7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </a>

              {/* Admin / Operations */}
              <a
                href="/admin/dashboard"
                className="group relative overflow-hidden rounded-2xl border border-fc-100 bg-white p-8 text-left transition-all duration-300 hover:border-fc-green/30 hover:shadow-lg hover:shadow-fc-green/5 hover:-translate-y-0.5 opacity-0 animate-fade-in-up"
              >
                <div className="relative">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-fc-green/10 text-fc-green transition-colors group-hover:bg-fc-green/20">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3" y="3" width="7" height="7" />
                      <rect x="14" y="3" width="7" height="7" />
                      <rect x="14" y="14" width="7" height="7" />
                      <rect x="3" y="14" width="7" height="7" />
                    </svg>
                  </div>
                  <h3 className="font-display text-xl font-semibold text-fc-900">
                    Operations
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Monitor all engagements, manage coaches, and track program
                    health.
                  </p>
                  <div className="mt-6 flex items-center gap-2 text-sm font-medium text-fc-green transition-all group-hover:gap-3 group-hover:text-fc-data-teal">
                    Sign In
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 12h14" />
                      <path d="m12 5 7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="flex items-center justify-between px-8 py-6 lg:px-16">
          <p className="text-xs text-muted-foreground">
            &copy; 2026 FranklinCovey. All rights reserved.
          </p>
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-fc-green" />
            <span className="text-xs text-muted-foreground">System Operational</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
