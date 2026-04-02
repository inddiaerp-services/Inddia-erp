import { Link } from "react-router-dom";
import Navbar from "../../components/layout/Navbar";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";

const featureCards = [
  {
    title: "Unified Campus Operations",
    description: "Admissions, attendance, academics, transport, payroll, and fee management in one connected system.",
  },
  {
    title: "Role-Aware Access",
    description: "Tailored workspaces for leadership, teachers, finance teams, parents, and students with protected routing.",
  },
  {
    title: "Decision-Ready Visibility",
    description: "A clearer command center for monitoring performance, compliance, staff activity, and student outcomes.",
  },
];

const metricCards = [
  { value: "8+", label: "core operations unified" },
  { value: "100%", label: "private access control" },
  { value: "24/7", label: "live campus visibility" },
];

const modules = [
  "Admissions and applicant review",
  "Attendance and timetable oversight",
  "Fees, reminders, and accounts visibility",
  "Staff records, payroll, and leave coordination",
  "Transport routing and vehicle management",
  "Profiles, settings, and secure role-based access",
];

const workflow = [
  {
    step: "01",
    title: "Set up your institution",
    text: "Configure the admin workspace, academic structure, and staff permissions from one place.",
  },
  {
    step: "02",
    title: "Onboard users securely",
    text: "Create staff and student records without public signup, keeping access controlled from day one.",
  },
  {
    step: "03",
    title: "Run daily operations",
    text: "Move through attendance, fees, classes, notifications, and departmental dashboards in a consistent flow.",
  },
];

export const Home = () => (
  <div className="public-shell min-h-screen text-white">
    <Navbar />

    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-hero-grid bg-[size:100%_100%,42px_42px,42px_42px] opacity-25" />
      <div className="absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-slate-900/85 via-slate-950/45 to-transparent" />
      <div className="relative mx-auto max-w-7xl px-6 pb-20 pt-14 lg:px-8 lg:pb-28 lg:pt-20">
        <div className="grid items-start gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="max-w-3xl">
            <span className="inline-flex rounded-full border border-cyan-400/25 bg-cyan-400/10 px-4 py-2 text-sm font-semibold tracking-[0.12em] text-cyan-100 shadow-sm backdrop-blur">
              SCHOOL ERP PLATFORM
            </span>
            <h1 className="mt-7 max-w-4xl font-serif text-5xl font-semibold leading-[1.03] tracking-tight text-white md:text-6xl xl:text-7xl">
              A sharper digital front desk for modern school administration.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300 md:text-xl">
              INDDIA ERP brings admissions, academics, staff operations, finance workflows, and secure role-based access
              into one professional control center your institution can actually run on every day.
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Link to="/login">
                <Button className="min-w-[12rem] rounded-full px-7 py-3.5 text-base shadow-soft">
                  Open Login Portal
                </Button>
              </Link>
              <a href="#features">
                <Button
                  variant="outline"
                  className="min-w-[12rem] rounded-full border-white/15 bg-white/5 px-7 py-3.5 text-base text-white backdrop-blur hover:bg-white/10"
                >
                  Explore Platform
                </Button>
              </a>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {metricCards.map((item) => (
                <div key={item.label} className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5 shadow-soft backdrop-blur">
                  <p className="text-3xl font-semibold text-white">{item.value}</p>
                  <p className="mt-2 text-sm uppercase tracking-[0.18em] text-slate-300">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute left-8 top-8 h-40 w-40 rounded-full bg-cyan-500/15 blur-3xl" />
            <div className="absolute bottom-6 right-0 h-40 w-40 rounded-full bg-sky-500/12 blur-3xl" />
            <Card className="relative overflow-hidden rounded-[2rem] border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-[#08111f] p-0 text-white shadow-[0_30px_80px_rgba(15,23,42,0.42)] ring-1 ring-cyan-500/10">
              <div className="border-b border-white/8 bg-black/10 px-6 py-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-sky-100">Live command center</p>
                    <h2 className="mt-2 text-2xl font-semibold">Campus operations dashboard</h2>
                  </div>
                  <div className="rounded-full border border-emerald-400/15 bg-emerald-400/8 px-3 py-1 text-xs font-semibold text-emerald-100">
                    System active
                  </div>
                </div>
              </div>

              <div className="grid gap-4 p-6">
                <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
                  <div className="rounded-[1.6rem] border border-white/8 bg-white/[0.03] p-5">
                    <p className="text-sm text-slate-300">Operational readiness</p>
                    <div className="mt-5 flex items-end justify-between gap-4">
                      <div>
                        <p className="text-4xl font-semibold text-white">94%</p>
                        <p className="mt-2 text-sm text-slate-200">Departments synced across academic, finance, and HR workflows</p>
                      </div>
                      <div className="flex h-24 items-end gap-2">
                        {[38, 52, 46, 68, 74, 81].map((height) => (
                          <span
                            key={height}
                            className="w-3 rounded-full bg-gradient-to-t from-sky-400 to-cyan-200"
                            style={{ height: `${height}px` }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-[1.6rem] border border-white/8 bg-white/[0.03] p-5">
                      <p className="text-sm text-slate-300">Admin access</p>
                      <p className="mt-2 text-lg font-medium text-white">Provisioned privately by leadership</p>
                    </div>
                    <div className="rounded-[1.6rem] border border-white/8 bg-white/[0.03] p-5">
                      <p className="text-sm text-slate-300">Stack foundation</p>
                      <p className="mt-2 text-lg font-medium text-white">React, TypeScript, Tailwind, Router, Supabase</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[1.6rem] border border-white/8 bg-gradient-to-r from-white/[0.04] to-white/[0.02] p-5">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <p className="text-sm text-slate-300">Student login</p>
                      <p className="mt-2 font-medium text-white">Student ID mapped securely to linked records</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-300">Staff workflow</p>
                      <p className="mt-2 font-medium text-white">Protected email-based authentication and role restoration</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-300">Oversight</p>
                      <p className="mt-2 font-medium text-white">Notifications, departmental dashboards, and tracked activity</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>

    <section id="features" className="mx-auto max-w-7xl px-6 py-8 lg:px-8 lg:py-12">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.26em] text-cyan-200">Why it feels better</p>
          <h2 className="mt-3 font-serif text-4xl font-semibold tracking-tight text-white">
            A professional front layer for the system your school relies on daily.
          </h2>
        </div>
        <p className="max-w-xl text-base leading-7 text-slate-300">
          The homepage now presents the product like a serious institutional platform, with cleaner hierarchy, stronger proof, and a far more polished first impression.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {featureCards.map((feature, index) => (
          <Card
            key={feature.title}
            className="rounded-[1.9rem] border-white/10 bg-white/[0.05] p-7 shadow-soft backdrop-blur transition duration-300 hover:-translate-y-1"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-sm font-semibold text-white">
              0{index + 1}
            </div>
            <h3 className="mt-6 text-2xl font-semibold tracking-tight text-white">{feature.title}</h3>
            <p className="mt-3 leading-7 text-slate-300">{feature.description}</p>
          </Card>
        ))}
      </div>
    </section>

    <section id="security" className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="rounded-[2rem] border-white/10 bg-gradient-to-br from-[#020617] via-[#0b1120] to-[#111827] p-8 text-white shadow-[0_24px_70px_rgba(15,23,42,0.4)] ring-1 ring-cyan-500/10">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan-200">Security model</p>
          <h2 className="mt-4 font-serif text-4xl font-semibold tracking-tight">Private access with predictable governance.</h2>
          <p className="mt-5 text-base leading-7 text-slate-200">
            The platform is designed for controlled institutional access, not open public registration, which makes the system feel safer and more credible from the first screen.
          </p>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2">
          {[
            "Staff authenticate through email and password with session restoration on reload.",
            "Students log in with Student ID and password after linked account resolution.",
            "Protected routes redirect visitors into the correct workflow instead of exposing internal screens.",
            "Admins provision users directly, preserving compliance and operational control.",
          ].map((item) => (
            <Card key={item} className="rounded-[1.75rem] border-white/10 bg-white/[0.05] p-6 shadow-soft backdrop-blur">
              <div className="flex items-start gap-4">
                <span className="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                  +
                </span>
                <p className="leading-7 text-slate-200">{item}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>

    <section className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Card className="rounded-[2rem] border-white/10 bg-white/[0.05] p-8 shadow-soft backdrop-blur">
          <p className="text-sm font-semibold uppercase tracking-[0.26em] text-cyan-200">Platform modules</p>
          <h2 className="mt-4 font-serif text-4xl font-semibold tracking-tight text-white">Everything arranged around real school work.</h2>
          <div className="mt-8 grid gap-4">
            {modules.map((module) => (
              <div key={module} className="rounded-[1.4rem] border border-white/10 bg-slate-900/70 px-5 py-4 text-slate-200">
                {module}
              </div>
            ))}
          </div>
        </Card>

        <Card className="rounded-[2rem] border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-sky-950/80 p-8 shadow-soft">
          <p className="text-sm font-semibold uppercase tracking-[0.26em] text-cyan-200">Operating model</p>
          <h2 className="mt-4 font-serif text-4xl font-semibold tracking-tight text-white">A cleaner path from setup to daily execution.</h2>
          <div className="mt-8 space-y-5">
            {workflow.map((item) => (
              <div key={item.step} className="flex gap-4 rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5 shadow-sm">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-sm font-semibold text-white">
                  {item.step}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">{item.title}</h3>
                  <p className="mt-2 leading-7 text-slate-300">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </section>

    <section id="launch" className="mx-auto max-w-7xl px-6 pb-24 pt-10 lg:px-8">
      <Card className="overflow-hidden rounded-[2.25rem] border-white/10 bg-gradient-to-r from-[#020617] via-[#0b1120] to-[#111827] p-8 text-white shadow-[0_26px_80px_rgba(15,23,42,0.4)] ring-1 ring-cyan-500/10 md:p-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-sky-200">Launch confidently</p>
            <h2 className="mt-4 font-serif text-4xl font-semibold tracking-tight md:text-5xl">
              Give your homepage the same confidence your ERP needs behind the scenes.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-200">
              The page now reads like a real institutional product: cleaner navigation, stronger messaging, richer composition, and a more trustworthy first impression for admins, staff, and stakeholders.
            </p>
          </div>
          <Link to="/login">
            <Button className="rounded-full bg-cyan-500 px-8 py-3.5 text-base text-slate-950 shadow-[0_18px_40px_rgba(6,182,212,0.28)] hover:bg-cyan-400">
              Enter ERP
            </Button>
          </Link>
        </div>
      </Card>
    </section>
  </div>
);

export default Home;
