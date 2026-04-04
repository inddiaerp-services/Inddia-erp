import { useEffect } from "react";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import Home from "./pages/home/Home";
import Login from "./pages/auth/Login";
import DashboardHome from "./pages/dashboard/Home";
import ChildPage from "./pages/dashboard/Child";
import { authStore } from "./store/authStore";
import { hydrateAuthSession, restoreSession } from "./services/authService";
import { firebaseAuth } from "./services/firebaseClient";
import DashboardLayout from "./components/layout/DashboardLayout";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import RoleProtectedRoute from "./components/layout/RoleProtectedRoute";
import StudentsPage from "./pages/dashboard/Students";
import ClassesPage from "./pages/dashboard/Classes";
import HolidaysPage from "./pages/dashboard/Holidays";
import StaffPage from "./pages/dashboard/Staff";
import SubjectsPage from "./pages/dashboard/Subjects";
import TimetableLandingPage, {
  CoordinatorTimetablePage,
  MyTeachingTimetablePage,
} from "./pages/dashboard/Timetable";
import EmployeesPage from "./pages/dashboard/Employees";
import StaffAttendancePage from "./pages/dashboard/StaffAttendance";
import FeesPage from "./pages/dashboard/Fees";
import VehiclesPage from "./pages/dashboard/Vehicles";
import ApplicantsPage from "./pages/dashboard/Applicants";
import AnalyticsPage from "./pages/dashboard/Analytics";
import {
  ApplicantDetailPage,
  AttendanceDetailPage,
  EmployeeDetailPage,
  ExamDetailPage,
  ExamGroupDetailPage,
  ExamMarksPage,
  ExamSubjectsPage,
  FeeDetailPage,
  LeaveImpactPage,
  LeaveDetailPage,
  LeavesPage,
  NotificationsPage,
  ResultDetailPage,
  RouteDetailPage,
  RoutesPage,
  SalaryDetailPage,
  SalaryPage,
  VehicleDetailPage,
} from "./pages/dashboard/AdvancedModules";
import {
  RoleAttendancePage,
  RoleExamsPage,
  RoleFeesPage,
  RoleResultsPage,
} from "./pages/dashboard/RoleModules";
import { ROLES } from "./config/roles";
import SubjectDetailPage from "./pages/dashboard/SubjectDetail";
import StaffDetailPage from "./pages/dashboard/StaffDetail";
import StudentDetailPage from "./pages/dashboard/StudentDetail";
import ClassDetailPage from "./pages/dashboard/ClassDetail";
import ProfilePage from "./pages/dashboard/Profile";
import SettingsPage from "./pages/dashboard/Settings";
import AuditLogsPage from "./pages/dashboard/AuditLogs";
import {
  AccountsDashboardPage,
  AdmissionDashboardPage,
  HrDashboardPage,
  TransportDashboardPage,
} from "./pages/dashboard/DepartmentDashboards";
import type { AuthUser, AppSession, CurrentSchool } from "./store/authStore";
import type { AppRole } from "./config/roles";
import { STAFF_WORKSPACES } from "./config/staffWorkspaces";
import SubscriptionExpiredPage from "./pages/auth/SubscriptionExpired";
import ConnectivityBanner from "./components/mobile/ConnectivityBanner";
import SuperAdminDashboardPage from "./pages/superAdmin/SuperAdminDashboard";
import SuperAdminSchoolsPage from "./pages/superAdmin/SuperAdminSchools";
import SuperAdminSchoolCreatePage from "./pages/superAdmin/SuperAdminSchoolCreate";
import SuperAdminBillingPage from "./pages/superAdmin/SuperAdminBilling";
import SuperAdminBillingCreatePage from "./pages/superAdmin/SuperAdminBillingCreate";
import SuperAdminBillingEditPage from "./pages/superAdmin/SuperAdminBillingEdit";
import SuperAdminPaymentsPage from "./pages/superAdmin/SuperAdminPayments";
import SuperAdminPaymentEditPage from "./pages/superAdmin/SuperAdminPaymentEdit";
import SuperAdminStoragePage from "./pages/superAdmin/SuperAdminStorage";
import SuperAdminAuditLogsPage from "./pages/superAdmin/SuperAdminAuditLogs";
import SuperAdminSchoolProfilePage from "./pages/superAdmin/SuperAdminSchoolProfile";
import SuperAdminSchoolEditPage from "./pages/superAdmin/SuperAdminSchoolEdit";
import SuperAdminStorageEditPage from "./pages/superAdmin/SuperAdminStorageEdit";
import {
  SchoolBillingHistoryPage,
  SchoolBillingProfilePage,
  SchoolInvoicesPage,
  SchoolPaySuperAdminPage,
  SchoolPlanUpgradePage,
  SchoolRenewalRemindersPage,
  SchoolSubscriptionPage,
  SchoolUsageDashboardPage,
  SuperAdminBillingRequestsPage,
} from "./pages/dashboard/SchoolBilling";

const PublicRoute = () => {
  const { user, loading } = authStore();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">
        Loading portal...
      </div>
    );
  }

  return user ? <Navigate to={user.role === ROLES.SUPER_ADMIN ? "/super-admin/dashboard" : "/dashboard/home"} replace /> : <Outlet />;
};

function App() {
  const { setAuth, setLoading, logout } = authStore();

  useEffect(() => {
    let mounted = true;
    let initializing = true;

    const safelyApplyAuth = (payload: {
      user: AuthUser | null;
      role: AppRole | null;
      school?: CurrentSchool | null;
      session: AppSession | null;
    }) => {
      const currentState = authStore.getState();

      if (currentState.user && !payload.user) {
        return;
      }

      setAuth(payload);
    };

    const initialize = async () => {
      try {
        const restored = await Promise.race([
          restoreSession(),
          new Promise<Awaited<ReturnType<typeof restoreSession>>>((resolve) => {
            window.setTimeout(
              () => resolve({ user: null, role: null, school: null, session: null }),
              3000,
            );
          }),
        ]);

        if (mounted) {
          safelyApplyAuth(restored);
        }
      } catch (error) {
        if (mounted) {
          console.error(error);
          const currentState = authStore.getState();
          if (!currentState.user) {
            safelyApplyAuth({ user: null, role: null, school: null, session: null });
          }
        }
      } finally {
        if (mounted) {
          initializing = false;
          setLoading(false);
        }
      }
    };

    void initialize();

    if (!firebaseAuth) {
      return () => {
        mounted = false;
      };
    }

    const subscription = onAuthStateChanged(firebaseAuth, (sessionUser: FirebaseUser | null) => {
      window.setTimeout(() => {
        if (!mounted || initializing) return;

        if (!sessionUser) {
          const currentState = authStore.getState();
          if (!currentState.user?.isBootstrapAdmin) {
            logout();
          }
          setLoading(false);
          return;
        }

        void (async () => {
          try {
            const currentState = authStore.getState();
            if (currentState.user?.id === sessionUser.uid && currentState.session?.uid === sessionUser.uid) {
              setLoading(false);
              return;
            }

            const restored = await hydrateAuthSession(sessionUser);
            if (mounted) {
              safelyApplyAuth(restored);
            }
          } catch (error) {
            console.error(error);
            if (mounted) {
              if (!authStore.getState().user?.isBootstrapAdmin) {
                logout();
              }
              setLoading(false);
            }
          }
        })();
      }, 0);
    });

    return () => {
      mounted = false;
      subscription();
    };
  }, [logout, setAuth, setLoading]);

  return (
    <>
      <ConnectivityBanner />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/home" element={<Navigate to="/" replace />} />

        <Route element={<PublicRoute />}>
          <Route path="/login" element={<Login />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="/subscription-expired" element={<SubscriptionExpiredPage />} />

          <Route element={<RoleProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN]} />}>
            <Route path="/super-admin" element={<DashboardLayout />}>
              <Route index element={<Navigate to="/super-admin/dashboard" replace />} />
              <Route path="dashboard" element={<SuperAdminDashboardPage />} />
              <Route path="schools" element={<SuperAdminSchoolsPage />} />
              <Route path="schools/new" element={<SuperAdminSchoolCreatePage />} />
              <Route path="schools/:id" element={<SuperAdminSchoolProfilePage />} />
              <Route path="schools/:id/edit" element={<SuperAdminSchoolEditPage />} />
              <Route path="billing" element={<SuperAdminBillingPage />} />
              <Route path="billing/new" element={<SuperAdminBillingCreatePage />} />
              <Route path="billing/:schoolId/edit" element={<SuperAdminBillingEditPage />} />
              <Route path="payments" element={<SuperAdminPaymentsPage />} />
              <Route path="verification" element={<SuperAdminBillingRequestsPage />} />
              <Route path="payments/:paymentId/edit" element={<SuperAdminPaymentEditPage />} />
              <Route path="storage" element={<SuperAdminStoragePage />} />
              <Route path="storage/:schoolId/edit" element={<SuperAdminStorageEditPage />} />
              <Route path="audit-logs" element={<SuperAdminAuditLogsPage />} />
            </Route>
          </Route>

          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<Navigate to="/dashboard/home" replace />} />
            <Route path="home" element={<DashboardHome />} />
            <Route
              path="profile"
              element={
                <RoleProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.STAFF, ROLES.STUDENT, ROLES.PARENT]} />
              }
            >
              <Route index element={<ProfilePage />} />
            </Route>
            <Route
              path="settings"
              element={
                <RoleProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.STAFF, ROLES.STUDENT, ROLES.PARENT]} />
              }
            >
              <Route index element={<SettingsPage />} />
            </Route>

            <Route element={<RoleProtectedRoute allowedRoles={[ROLES.ADMIN]} />}>
              <Route path="audit-logs" element={<AuditLogsPage />} />
              <Route path="classes" element={<ClassesPage />} />
              <Route path="holidays" element={<HolidaysPage />} />
              <Route path="classes/:id" element={<ClassDetailPage />} />
              <Route path="subscription" element={<SchoolSubscriptionPage />} />
              <Route path="platform-payments" element={<SchoolPaySuperAdminPage />} />
              <Route path="billing-history" element={<SchoolBillingHistoryPage />} />
              <Route path="invoices" element={<SchoolInvoicesPage />} />
              <Route path="renewal-reminders" element={<SchoolRenewalRemindersPage />} />
              <Route path="plan-upgrade" element={<SchoolPlanUpgradePage />} />
              <Route path="usage" element={<SchoolUsageDashboardPage />} />
              <Route path="school-billing-profile" element={<SchoolBillingProfilePage />} />
            </Route>

            <Route element={<RoleProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.STAFF]} allowedStaffWorkspaces={[STAFF_WORKSPACES.ADMISSION]} />}>
              <Route path="students" element={<StudentsPage />} />
              <Route path="students/:id" element={<StudentDetailPage />} />
            </Route>

            <Route element={<RoleProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.STAFF]} allowedStaffWorkspaces={[STAFF_WORKSPACES.HR]} />}>
              <Route path="hr" element={<HrDashboardPage />} />
              <Route path="employees" element={<EmployeesPage />} />
              <Route path="staff-attendance" element={<StaffAttendancePage />} />
              <Route path="employees/:id" element={<EmployeeDetailPage />} />
            </Route>

            <Route
              element={
                <RoleProtectedRoute
                  allowedRoles={[ROLES.ADMIN, ROLES.STAFF]}
                  allowedStaffWorkspaces={[STAFF_WORKSPACES.TEACHER, STAFF_WORKSPACES.HR]}
                />
              }
            >
              <Route path="leaves" element={<LeavesPage />} />
              <Route path="leaves/:id" element={<LeaveDetailPage />} />
            </Route>

            <Route element={<RoleProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.STAFF]} allowedStaffWorkspaces={[STAFF_WORKSPACES.ACCOUNTS]} />}>
              <Route path="accounts" element={<AccountsDashboardPage />} />
              <Route path="salary" element={<SalaryPage />} />
              <Route path="salary/:id" element={<SalaryDetailPage />} />
            </Route>

            <Route element={<RoleProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.STAFF]} allowedStaffWorkspaces={[STAFF_WORKSPACES.TRANSPORT]} />}>
              <Route path="transport" element={<TransportDashboardPage />} />
              <Route path="vehicles" element={<VehiclesPage />} />
              <Route path="vehicles/:id" element={<VehicleDetailPage />} />
              <Route path="routes" element={<RoutesPage />} />
              <Route path="routes/:id" element={<RouteDetailPage />} />
            </Route>

            <Route element={<RoleProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.STAFF]} allowedStaffWorkspaces={[STAFF_WORKSPACES.ADMISSION]} />}>
              <Route path="admission" element={<AdmissionDashboardPage />} />
              <Route path="applicants" element={<ApplicantsPage />} />
              <Route path="applicants/:id" element={<ApplicantDetailPage />} />
            </Route>

            <Route element={<RoleProtectedRoute allowedRoles={[ROLES.ADMIN]} />}>
              <Route path="staff" element={<StaffPage />} />
              <Route path="staff/:id" element={<StaffDetailPage />} />
              <Route path="subjects" element={<SubjectsPage />} />
              <Route path="subjects/:id" element={<SubjectDetailPage />} />
            </Route>

            <Route element={<RoleProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.STAFF]} />}>
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="leave-impact/:id" element={<LeaveImpactPage />} />
            </Route>

            <Route element={<RoleProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.STAFF, ROLES.STUDENT, ROLES.PARENT]} allowedStaffWorkspaces={[STAFF_WORKSPACES.TEACHER]} />}>
              <Route path="attendance" element={<RoleAttendancePage />} />
              <Route path="attendance/:id" element={<AttendanceDetailPage />} />
              <Route path="results" element={<RoleResultsPage />} />
              <Route path="results/:id" element={<ResultDetailPage />} />
              <Route path="timetable" element={<TimetableLandingPage />} />
            </Route>

            <Route element={<RoleProtectedRoute allowedRoles={[ROLES.STAFF]} allowedStaffWorkspaces={[STAFF_WORKSPACES.TEACHER]} />}>
              <Route path="timetable/coordinator" element={<CoordinatorTimetablePage />} />
              <Route path="timetable/my" element={<MyTeachingTimetablePage />} />
            </Route>

            <Route element={<RoleProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.STAFF]} allowedStaffWorkspaces={[STAFF_WORKSPACES.TEACHER]} />}>
              <Route path="exams" element={<RoleExamsPage />} />
              <Route path="exams/group/:groupId" element={<ExamGroupDetailPage />} />
              <Route path="exams/:id" element={<ExamDetailPage />} />
              <Route path="exams/:id/subjects" element={<ExamSubjectsPage />} />
              <Route path="exams/:id/marks" element={<ExamMarksPage />} />
            </Route>

            <Route element={<RoleProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.STAFF, ROLES.STUDENT, ROLES.PARENT]} allowedStaffWorkspaces={[STAFF_WORKSPACES.ACCOUNTS]} />}>
              <Route path="fees" element={<RoleFeesPage />} />
              <Route path="fees/:id" element={<FeeDetailPage />} />
            </Route>

            <Route element={<RoleProtectedRoute allowedRoles={[ROLES.PARENT]} />}>
              <Route path="child" element={<ChildPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;
