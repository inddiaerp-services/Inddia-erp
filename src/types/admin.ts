export type SubjectRecord = {
  id: string;
  name: string;
};

export type StaffRecord = {
  id: string;
  userId: string;
  name: string;
  email: string;
  mobileNumber: string;
  photoUrl: string | null;
  role: string;
  dateOfJoining: string | null;
  monthlySalary: number | null;
  subjectId: string | null;
  subjectName: string | null;
  assignedClass: string | null;
  assignedSection: string | null;
  isClassCoordinator: boolean;
  createdAt?: string | null;
};

export type HolidayRecord = {
  id: string;
  holidayDate: string;
  title: string;
  description: string | null;
};

export type HolidayFormValues = {
  holidayDate: string;
  title: string;
  description: string;
};

export type ClassRecord = {
  id: string;
  className: string;
  section: string;
  roomNumber: string | null;
  floor: string | null;
  capacity: number | null;
  coordinatorId: string | null;
  coordinatorName: string | null;
};

export type ClassFormValues = {
  className: string;
  section: string;
  roomNumber: string;
  floor: string;
  capacity: string;
  coordinatorId: string;
};

export type ClassDetail = {
  classRecord: ClassRecord;
  coordinator: StaffRecord | null;
  students: StudentRecord[];
};

export type StudentRecord = {
  id: string;
  userId: string;
  name: string;
  photoUrl: string | null;
  schoolId: string | null;
  studentCode?: string | null;
  className: string | null;
  section: string | null;
  admissionDate: string | null;
  discountFee: number | null;
  studentAadharNumber: string | null;
  dateOfBirth: string | null;
  birthId: string | null;
  isOrphan: boolean;
  gender: string | null;
  caste: string | null;
  osc: "A" | "B" | "C" | null;
  identificationMark: string | null;
  previousSchool: string | null;
  region: string | null;
  bloodGroup: string | null;
  previousBoardRollNo: string | null;
  address: string | null;
  parentId: string | null;
  parentUserId: string | null;
  parentName: string | null;
  parentEmail: string | null;
  parentPhone: string | null;
  fatherName: string | null;
  fatherAadharNumber: string | null;
  fatherOccupation: string | null;
  fatherEducation: string | null;
  fatherMobileNumber: string | null;
  fatherProfession: string | null;
  fatherIncome: number | null;
  fatherEmail: string | null;
  motherName: string | null;
  motherAadharNumber: string | null;
  motherOccupation: string | null;
  motherEducation: string | null;
  motherMobileNumber: string | null;
  motherProfession: string | null;
  motherIncome: number | null;
  createdAt?: string | null;
};

export type SubjectFormValues = {
  name: string;
};

export type StaffFormValues = {
  name: string;
  email: string;
  mobileNumber: string;
  photoUrl: string;
  password: string;
  role: string;
  dateOfJoining: string;
  monthlySalary: string;
  subjectId: string;
  assignedClass: string;
  assignedSection: string;
  isClassCoordinator: boolean;
};

export type StudentFormValues = {
  studentName: string;
  photoUrl: string;
  schoolId: string;
  className: string;
  section: string;
  admissionDate: string;
  discountFee: string;
  studentAadharNumber: string;
  studentPassword: string;
  dateOfBirth: string;
  birthId: string;
  isOrphan: boolean;
  gender: string;
  caste: string;
  osc: "" | "A" | "B" | "C";
  identificationMark: string;
  previousSchool: string;
  region: string;
  bloodGroup: string;
  previousBoardRollNo: string;
  address: string;
  fatherName: string;
  fatherAadharNumber: string;
  fatherOccupation: string;
  fatherEducation: string;
  fatherMobileNumber: string;
  fatherProfession: string;
  fatherIncome: string;
  fatherEmail: string;
  fatherPassword: string;
  motherName: string;
  motherAadharNumber: string;
  motherOccupation: string;
  motherEducation: string;
  motherMobileNumber: string;
  motherProfession: string;
  motherIncome: string;
};

export type BulkImportRowResult = {
  rowNumber: number;
  identifier: string;
  success: boolean;
  message: string;
};

export type BulkImportResult = {
  created: number;
  failed: number;
  results: BulkImportRowResult[];
};

export type TimetableDay = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";

export type TimetableSlotRecord = {
  id: string;
  className: string;
  section: string;
  subjectId: string | null;
  subjectName: string;
  teacherId: string | null;
  teacherName: string;
  day: TimetableDay;
  startTime: string;
  endTime: string;
  isBreak: boolean;
  breakType: "Short Break" | "Lunch Break" | null;
  breakLabel: string | null;
  isCancelled: boolean;
  cancellationReason: string | null;
  effectiveDate: string | null;
  sourceSlotId: string | null;
  impactLeaveId: string | null;
  impactStatus: "Pending_Action" | "Rescheduled" | "Cancelled" | null;
  replacementTeacherId: string | null;
  replacementTeacherName: string | null;
  replacementSubjectId: string | null;
  replacementSubjectName: string | null;
};

export type TimetableFormValues = {
  className: string;
  section: string;
  subjectId: string;
  teacherId: string;
  day: TimetableDay;
  startTime: string;
  endTime: string;
  isBreak: boolean;
  breakType: "Short Break" | "Lunch Break" | "";
  breakLabel: string;
};

export type TimetableSettings = {
  schoolStartTime: string;
  schoolEndTime: string;
  classDurationMinutes: number;
};

export type TimetableClassOption = {
  className: string;
  sections: string[];
};

export type TimetableAccess = {
  canEditAny: boolean;
  canEditSelectedClass: boolean;
  isClassCoordinator: boolean;
  assignedClass: string | null;
  assignedSection: string | null;
};

export type AttendanceRecord = {
  id: string;
  className: string | null;
  section: string | null;
  studentId: string;
  studentName: string;
  subjectId: string | null;
  subjectName: string | null;
  date: string | null;
  status: string | null;
  teacherId: string | null;
  teacherName: string | null;
};

export type AttendanceFormValues = {
  className: string;
  section: string;
  subjectId: string;
  date: string;
};

export type AttendanceRosterRow = {
  studentId: string;
  studentName: string;
  status: "Present" | "Absent";
  attendanceId: string | null;
  changed?: boolean;
};

export type AttendanceSubjectOption = {
  subjectId: string;
  subjectName: string;
  teacherId: string | null;
  teacherName: string | null;
};

export type AttendanceSession = {
  className: string;
  section: string;
  subjectId: string;
  subjectName: string;
  teacherId: string | null;
  teacherName: string | null;
  date: string;
  startTime: string | null;
  endTime: string | null;
  sourceSlotId?: string | null;
  teacherLocation?: AttendanceGeoPoint | null;
  rows: AttendanceRosterRow[];
};

export type AttendanceGeoPoint = {
  latitude: number;
  longitude: number;
  accuracyMeters?: number | null;
};

export type AttendanceGeoSettings = {
  mapLink: string | null;
  latitude: number | null;
  longitude: number | null;
  radiusMeters: number | null;
  isEnabled: boolean;
};

export type AttendanceMonthColumn = {
  date: string;
  day: TimetableDay;
  label: string;
  isHoliday: boolean;
  holidayTitle: string | null;
  isExamDay: boolean;
  examName: string | null;
};

export type AttendanceMonthCell = {
  date: string;
  day: TimetableDay;
  startTime: string;
  endTime: string;
  slot: TimetableSlotRecord | null;
  isHoliday: boolean;
  holidayTitle: string | null;
  isExamDay: boolean;
  examName: string | null;
  sessionId: string | null;
  studentStatus: "Present" | "Absent" | null;
  presentCount: number | null;
  absentCount: number | null;
  studentCount: number | null;
};

export type AttendanceMonthGrid = {
  month: string;
  columns: AttendanceMonthColumn[];
  timeRows: Array<{ start: string; end: string }>;
  cells: AttendanceMonthCell[];
};

export type ExamRecord = {
  id: string;
  name: string;
  className: string;
  section: string;
  startDate: string;
  endDate: string;
  examSession: "Full Day" | "Morning" | "Afternoon";
  status: "Draft" | "Ongoing" | "Completed";
  subjectCount: number;
};

export type ExamGroupRecord = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  examSession: ExamRecord["examSession"] | "Mixed";
  status: ExamRecord["status"] | "Mixed";
  recordCount: number;
  classCount: number;
  sectionCount: number;
  subjectCount: number;
  classNames: string[];
  sectionNames: string[];
};

export type ExamGroupDetail = ExamGroupRecord & {
  records: ExamRecord[];
};

export type ExamFormValues = {
  name: string;
  className: string;
  section: string;
  sections?: string[];
  startDate: string;
  endDate: string;
  examSession: "Full Day" | "Morning" | "Afternoon";
  status: "Draft" | "Ongoing" | "Completed";
  subjects: ExamSubjectFormValue[];
};

export type ExamSubjectFormValue = {
  subjectId: string;
  subjectName?: string;
  teacherName?: string | null;
  examDate: string;
  examSession: "Full Day" | "Morning" | "Afternoon";
  startTime: string;
  endTime: string;
  maxMarks: string;
};

export type ExamScheduleRecord = ExamRecord & {
  subjectId: string | null;
  subjectName: string | null;
  examDate: string;
  startTime: string | null;
  endTime: string | null;
};

export type ResultRecord = {
  id: string;
  studentId: string;
  studentName: string;
  className: string | null;
  section: string | null;
  examId: string;
  examName: string;
  startDate: string;
  endDate: string;
  examStatus: "Draft" | "Ongoing" | "Completed";
  totalMarks: number;
  maxMarks: number;
  percentage: number;
  finalGrade: string;
  passStatus: "Pass" | "Fail";
  publishedSubjects: number;
};

export type ResultFormValues = {
  studentId: string;
  subjectId: string;
  examId: string;
  marks: string;
};

export type ExamSubjectOption = {
  subjectId: string;
  subjectName: string;
  maxMarks: number;
  teacherId: string | null;
  teacherName: string | null;
  examDate: string | null;
  examSession: "Full Day" | "Morning" | "Afternoon";
  startTime: string | null;
  endTime: string | null;
};

export type ExamMarksRow = {
  studentId: string;
  studentName: string;
  maxMarks: number;
  marks: string;
  grade: string;
  markId: string | null;
  changed?: boolean;
};

export type ExamMarksSession = {
  examId: string;
  examName: string;
  className: string;
  section: string;
  startDate: string;
  endDate: string;
  examStatus: "Draft" | "Ongoing" | "Completed";
  subjectId: string;
  subjectName: string;
  examDate: string | null;
  examSession: "Full Day" | "Morning" | "Afternoon";
  startTime: string | null;
  endTime: string | null;
  maxMarks: number;
  teacherId: string | null;
  teacherName: string | null;
  rows: ExamMarksRow[];
};

export type ResultDetail = {
  studentId: string;
  studentName: string;
  className: string | null;
  section: string | null;
  examId: string;
  examName: string;
  startDate: string;
  endDate: string;
  examStatus: "Draft" | "Ongoing" | "Completed";
  subjects: Array<{
    markId: string | null;
    subjectId: string;
    subjectName: string;
    maxMarks: number;
    marksObtained: number;
    grade: string;
    passStatus: "Pass" | "Fail";
  }>;
  totalMarks: number;
  maxMarks: number;
  percentage: number;
  finalGrade: string;
  passStatus: "Pass" | "Fail";
};

export type FeeRecord = {
  id: string;
  studentId: string;
  studentName: string;
  className: string | null;
  section: string | null;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: string | null;
  dueDate: string | null;
};

export type FeeFormValues = {
  studentId: string;
  totalAmount: string;
  dueDate: string;
};

export type FeePaymentValues = {
  amount: string;
};

export type EmployeeRecord = {
  id: string;
  name: string;
  role: string;
  subjectName: string | null;
  isClassCoordinator: boolean;
  assignedClass: string | null;
  assignedSection: string | null;
  email: string;
  mobileNumber: string;
  dateOfJoining: string | null;
  monthlySalary: number | null;
  userId: string;
  photoUrl: string | null;
};

export type EmployeeFormValues = {
  name: string;
  email: string;
  mobileNumber: string;
  password: string;
  role: string;
  dateOfJoining: string;
  monthlySalary: string;
  subjectId: string;
  assignedClass: string;
  assignedSection: string;
  isClassCoordinator: boolean;
  photoUrl: string;
};

export type StaffAttendanceStatus = "Present" | "Absent" | "Late" | "Half Day" | "On Leave";

export type StaffAttendanceRecord = {
  id: string;
  staffId: string;
  staffName: string;
  role: string;
  attendanceDate: string;
  status: StaffAttendanceStatus;
  checkInTime: string | null;
  checkOutTime: string | null;
  notes: string | null;
  markedByUserId: string | null;
  markedByName: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type StaffAttendanceEntryInput = {
  staffId: string;
  status: StaffAttendanceStatus;
  checkInTime: string;
  checkOutTime: string;
  notes: string;
};

export type LeaveRecord = {
  id: string;
  staffId: string | null;
  employeeName: string;
  role: string | null;
  startDate: string;
  endDate: string;
  status: "Pending_HR" | "Rejected_By_HR" | "Pending_Admin" | "Approved" | "Rejected_By_Admin";
  reason: string | null;
  hrComment: string | null;
  adminComment: string | null;
};

export type LeaveFormValues = {
  staffId: string;
  startDate: string;
  endDate: string;
  reason: string;
};

export type NotificationRecord = {
  id: string;
  type: string;
  module: string | null;
  message: string;
  userId: string | null;
  receiverId: string | null;
  relatedLeaveId: string | null;
  relatedFeeId: string | null;
  isRead: boolean;
  createdAt: string | null;
};

export type AnalyticsMetric = {
  label: string;
  value: string;
  helper: string;
};

export type AnalyticsChartDatum = {
  label: string;
  value: number;
  percentage?: number;
};

export type AnalyticsDashboard = {
  metrics: AnalyticsMetric[];
  monthlyFees: AnalyticsChartDatum[];
  attendance: AnalyticsChartDatum[];
  performance: AnalyticsChartDatum[];
};

export type AuditLogRecord = {
  id: string;
  userId: string | null;
  userName: string;
  userEmail: string | null;
  userRole: string | null;
  action: string;
  module: string;
  recordId: string | null;
  createdAt: string | null;
};

export type TimetableImpactRecord = {
  id: string;
  leaveId: string;
  timetableId: string;
  impactDate: string;
  status: "Pending_Action" | "Rescheduled" | "Cancelled";
  className: string;
  section: string;
  subjectId: string;
  subjectName: string;
  teacherId: string;
  teacherName: string;
  startTime: string;
  endTime: string;
  day: TimetableDay;
  replacementTeacherId: string | null;
  replacementTeacherName: string | null;
  replacementSubjectId: string | null;
  replacementSubjectName: string | null;
  replacementStartTime: string | null;
  replacementEndTime: string | null;
  note: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
};

export type LeaveImpactDetail = {
  leave: LeaveRecord;
  staff: StaffRecord | null;
  impacts: TimetableImpactRecord[];
};

export type SalaryRecord = {
  id: string;
  staffId: string | null;
  employeeName: string;
  role: string | null;
  amount: number;
  month: string;
  status: string;
};

export type SalaryFormValues = {
  staffId: string;
  amount: string;
  month: string;
};

export type VehicleRecord = {
  id: string;
  vehicleName: string;
  driverName: string;
  driverPhone: string | null;
  capacity: number;
  status: "Active" | "Maintenance" | string | null;
};

export type VehicleFormValues = {
  vehicleName: string;
  driverName: string;
  driverPhone: string;
  capacity: string;
  status: "Active" | "Maintenance" | "";
};

export type RouteRecord = {
  id: string;
  routeName: string;
  stops: string;
  stopsList: string[];
  vehicleId: string | null;
  vehicleName: string | null;
  vehicleStatus: string | null;
  driverName: string | null;
  driverPhone: string | null;
};

export type RouteFormValues = {
  routeName: string;
  stops: string;
  vehicleId: string;
};

export type VehicleDetail = {
  vehicle: VehicleRecord;
  assignedRoutes: RouteRecord[];
};

export type RouteDetail = {
  route: RouteRecord;
  vehicle: VehicleRecord | null;
};

export type ApplicantRecord = {
  id: string;
  name: string;
  email: string;
  className: string;
  status: string;
  parentName: string | null;
  parentEmail: string | null;
  parentPhone: string | null;
  createdAt: string | null;
};

export type ApplicantFormValues = {
  name: string;
  email: string;
  className: string;
  status: string;
  parentName: string;
  parentEmail: string;
  parentPhone: string;
};

export type ApplicantApprovalValues = {
  applicantId: string;
  section: string;
  studentPassword: string;
  parentPassword: string;
};
