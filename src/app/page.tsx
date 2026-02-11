import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-navy-950">
      {/* Ambient background */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 h-[600px] w-[600px] rounded-full bg-navy-800/30 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 h-[500px] w-[500px] rounded-full bg-gold-600/10 blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[800px] w-[800px] rounded-full bg-navy-900/20 blur-[150px]" />
      </div>

      {/* Grain overlay */}
      <div className="grain absolute inset-0" />

      {/* Content */}
      <div className="relative z-10 flex min-h-screen flex-col">
        {/* Header */}
        <header className="flex items-center justify-between px-8 py-6 lg:px-16">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-600">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
            </div>
            <span className="font-display text-xl font-semibold text-white">
              FranklinCovey
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" className="text-navy-200 hover:text-white hover:bg-white/10">
              Help
            </Button>
          </div>
        </header>

        {/* Hero */}
        <div className="flex flex-1 items-center justify-center px-8">
          <div className="w-full max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-gold-600/30 bg-gold-600/10 px-4 py-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-gold-400 animate-pulse-subtle" />
              <span className="text-sm font-medium text-gold-300">
                Government Leadership Coaching Program
              </span>
            </div>

            <h1 className="font-display text-5xl font-light leading-[1.1] tracking-tight text-white sm:text-6xl lg:text-7xl opacity-0 animate-fade-in-up">
              Your Path to{" "}
              <span className="font-medium italic text-gold-400">
                Exceptional
              </span>
              <br />
              Leadership
            </h1>

            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-navy-300 opacity-0 animate-fade-in-up stagger-2">
              Connect with world-class coaches. Build the habits that drive
              lasting change. Transform your leadership, one session at a time.
            </p>

            {/* Portal Cards */}
            <div className="mt-16 grid gap-5 sm:grid-cols-3">
              {/* Participant */}
              <a
                href="/participant/select-coach"
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-8 text-left backdrop-blur-sm transition-all duration-500 hover:border-gold-500/30 hover:bg-white/10 hover:shadow-2xl hover:shadow-gold-500/5 opacity-0 animate-fade-in-up stagger-3"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-gold-500/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                <div className="relative">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gold-600/20 text-gold-400 transition-colors group-hover:bg-gold-600/30">
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
                  <h3 className="font-display text-xl font-semibold text-white">
                    Participant
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-navy-300">
                    Select your coach, book sessions, and track your coaching
                    journey.
                  </p>
                  <div className="mt-6 flex items-center gap-2 text-sm font-medium text-gold-400 transition-all group-hover:gap-3">
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
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-8 text-left backdrop-blur-sm transition-all duration-500 hover:border-navy-400/30 hover:bg-white/10 hover:shadow-2xl hover:shadow-navy-400/5 opacity-0 animate-fade-in-up stagger-4"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-navy-400/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                <div className="relative">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-navy-600/20 text-navy-300 transition-colors group-hover:bg-navy-600/30">
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
                  <h3 className="font-display text-xl font-semibold text-white">
                    Coach
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-navy-300">
                    Manage engagements, log sessions, and guide your
                    participants.
                  </p>
                  <div className="mt-6 flex items-center gap-2 text-sm font-medium text-navy-300 transition-all group-hover:gap-3 group-hover:text-white">
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

              {/* Admin */}
              <a
                href="/admin/dashboard"
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-8 text-left backdrop-blur-sm transition-all duration-500 hover:border-sage-400/30 hover:bg-white/10 hover:shadow-2xl hover:shadow-sage-400/5 opacity-0 animate-fade-in-up stagger-5"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-sage-500/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                <div className="relative">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-sage-600/20 text-sage-300 transition-colors group-hover:bg-sage-600/30">
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
                  <h3 className="font-display text-xl font-semibold text-white">
                    Operations
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-navy-300">
                    Monitor all engagements, manage coaches, and track program
                    health.
                  </p>
                  <div className="mt-6 flex items-center gap-2 text-sm font-medium text-sage-300 transition-all group-hover:gap-3 group-hover:text-white">
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
          <p className="text-xs text-navy-500">
            &copy; 2026 FranklinCovey. All rights reserved.
          </p>
          <div className="flex items-center gap-1">
            <div className="h-1 w-1 rounded-full bg-sage-500" />
            <span className="text-xs text-navy-500">System Operational</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
