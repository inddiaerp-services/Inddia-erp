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
  <div data-theme="landing" className="landing-shell">
    <Navbar />

    <section className="landing-hero-section">
      <div className="absolute inset-0 bg-hero-grid bg-[size:100%_100%,42px_42px,42px_42px] opacity-25" />
      <div className="absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-slate-900/85 via-slate-950/45 to-transparent" />
      <div className="relative mx-auto max-w-7xl px-6 pb-20 pt-14 lg:px-8 lg:pb-28 lg:pt-20">
        <div className="landing-hero-grid">
          <div className="landing-copy">
            <span className="landing-chip inline-flex rounded-full px-4 py-2 text-sm font-semibold tracking-[0.12em] shadow-sm">
              SCHOOL ERP PLATFORM
            </span>
            <h1 className="landing-title">
              A sharper digital front desk for modern school administration.
            </h1>
            <p className="landing-subtitle">
              INDDIA ERP brings admissions, academics, staff operations, finance workflows, and secure role-based access
              into one professional control center your institution can actually run on every day.
            </p>
            <div className="landing-actions">
              <Link to="/login">
                <Button className="landing-primary-button px-7 py-3.5 text-base">
                  Open Login Portal
                </Button>
              </Link>
              <a href="#features">
                <Button
                  variant="outline"
                  className="landing-outline-button min-w-[12rem] rounded-full px-7 py-3.5 text-base"
                >
                  Explore Platform
                </Button>
              </a>
            </div>
            <div className="landing-metric-grid">
              {metricCards.map((item) => (
                <div key={item.label} className="landing-metric-card">
                  <p className="landing-metric-value">{item.value}</p>
                  <p className="landing-metric-label">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="landing-preview-stage">
            <div className="absolute left-8 top-8 h-40 w-40 rounded-full bg-cyan-500/10" />
            <div className="absolute bottom-6 right-0 h-40 w-40 rounded-full bg-sky-500/10" />
            <Card className="landing-hero-panel relative overflow-hidden rounded-[2rem] p-0 text-white ring-1 ring-cyan-500/10">
              <div className="border-b border-white/8 bg-black/10 px-6 py-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-sky-100">Live command center</p>
                    <h2 className="mt-2 text-2xl font-semibold">Campus operations dashboard</h2>
                  </div>
                  <div className="landing-status-pill">
                    System active
                  </div>
                </div>
              </div>

              <div className="grid gap-4 p-6">
                <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
                  <div className="landing-chart-card">
                    <p className="text-sm text-slate-300">Operational readiness</p>
                    <div className="mt-5 flex items-end justify-between gap-4">
                      <div>
                        <p className="landing-chart-figure">94%</p>
                        <p className="mt-2 text-sm text-slate-200">Departments synced across academic, finance, and HR workflows</p>
                      </div>
                      <div className="landing-chart-bars">
                        {[38, 52, 46, 68, 74, 81].map((height) => (
                          <span
                            key={height}
                            className="landing-chart-bar"
                            style={{ height: `${height}px` }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="landing-mini-card">
                      <p className="text-sm text-slate-300">Admin access</p>
                      <p className="landing-mini-title mt-2 text-lg">Provisioned privately by leadership</p>
                    </div>
                    <div className="landing-mini-card">
                      <p className="text-sm text-slate-300">Stack foundation</p>
                      <p className="landing-mini-title mt-2 text-lg">React, TypeScript, Tailwind, Router, Supabase</p>
                    </div>
                  </div>
                </div>

                <div className="landing-insight-card">
                  <div className="landing-insight-grid">
                    <div>
                      <p className="text-sm text-slate-300">Student login</p>
                      <p className="landing-insight-title mt-2">Student ID mapped securely to linked records</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-300">Staff workflow</p>
                      <p className="landing-insight-title mt-2">Protected email-based authentication and role restoration</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-300">Oversight</p>
                      <p className="landing-insight-title mt-2">Notifications, departmental dashboards, and tracked activity</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>

    <section id="features" className="landing-section">
        <div className="landing-section-head">
          <div className="max-w-3xl">
          <p className="landing-eyebrow">Why it feels better</p>
          <h2 className="landing-section-title mt-3">
            A professional front layer for the system your school relies on daily.
          </h2>
        </div>
        <p className="landing-section-copy">
          The homepage now presents the product like a serious institutional platform, with cleaner hierarchy, stronger proof, and a far more polished first impression.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {featureCards.map((feature, index) => (
          <Card
            key={feature.title}
            className="landing-panel landing-feature-card"
          >
            <div className="landing-number-badge">
              0{index + 1}
            </div>
            <h3 className="mt-6 text-2xl font-semibold tracking-tight text-white">{feature.title}</h3>
            <p className="mt-3 leading-7 text-slate-300">{feature.description}</p>
          </Card>
        ))}
      </div>
    </section>

    <section id="security" className="landing-section">
      <div className="landing-security-grid">
        <Card className="landing-hero-panel rounded-[2rem] p-8 text-white ring-1 ring-cyan-500/10">
          <p className="landing-eyebrow">Security model</p>
          <h2 className="landing-section-title mt-4">Private access with predictable governance.</h2>
          <p className="mt-5 text-base leading-7 text-slate-200">
            The platform is designed for controlled institutional access, not open public registration, which makes the system feel safer and more credible from the first screen.
          </p>
        </Card>

        <div className="landing-insight-grid">
          {[
            "Staff authenticate through email and password with session restoration on reload.",
            "Students log in with Student ID and password after linked account resolution.",
            "Protected routes redirect visitors into the correct workflow instead of exposing internal screens.",
            "Admins provision users directly, preserving compliance and operational control.",
          ].map((item) => (
            <Card key={item} className="landing-panel rounded-[1.75rem] p-6">
              <div className="landing-check-item">
                <span className="landing-check-icon">
                  +
                </span>
                <p>{item}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>

    <section className="landing-section">
      <div className="landing-dual-grid">
        <Card className="landing-panel rounded-[2rem] p-8">
          <p className="landing-eyebrow">Platform modules</p>
          <h2 className="landing-section-title mt-4">Everything arranged around real school work.</h2>
          <div className="landing-module-list">
            {modules.map((module) => (
              <div key={module} className="landing-module-item">
                {module}
              </div>
            ))}
          </div>
        </Card>

        <Card className="landing-hero-panel rounded-[2rem] p-8">
          <p className="landing-eyebrow">Operating model</p>
          <h2 className="landing-section-title mt-4">A cleaner path from setup to daily execution.</h2>
          <div className="landing-flow-list">
            {workflow.map((item) => (
              <div key={item.step} className="landing-flow-item">
                <div className="landing-flow-step">
                  {item.step}
                </div>
                <div>
                  <h3 className="landing-flow-title text-xl">{item.title}</h3>
                  <p className="mt-2 leading-7 text-slate-300">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </section>

    <section id="launch" className="landing-section pb-24">
      <Card className="landing-cta-card md:p-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-3xl">
            <p className="landing-eyebrow">Launch confidently</p>
            <h2 className="landing-section-title mt-4 md:text-5xl">
              Give your homepage the same confidence your ERP needs behind the scenes.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-200">
              The page now reads like a real institutional product: cleaner navigation, stronger messaging, richer composition, and a more trustworthy first impression for admins, staff, and stakeholders.
            </p>
          </div>
          <Link to="/login">
            <Button className="landing-cta-button px-8 py-3.5 text-base">
              Enter ERP
            </Button>
          </Link>
        </div>
      </Card>
    </section>
  </div>
);

export default Home;
