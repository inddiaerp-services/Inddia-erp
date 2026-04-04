# Firestore Setup Sheet

Use this file as the single source when creating your Firebase database for this ERP.

Important:
- Firestore does not use SQL tables.
- Create `collections`, then add `documents` inside them.
- Use the exact field names below.
- Prefer `camelCase` field names everywhere.
- For `users`, use the Firebase Auth `uid` as the document ID.

## 1. Create These Collections First

Create these collections in Firestore:

1. `schools`
2. `users`
3. `staff`
4. `parents`
5. `students`
6. `classes`
7. `subjects`
8. `holidays`
9. `attendance`
10. `staffAttendance`
11. `fees`
12. `auditLogs`
13. `timetable`
14. `notifications`
15. `leaves`
16. `salary`
17. `vehicles`
18. `routes`
19. `applicants`
20. `subscriptions`
21. `payments`
22. `timetableAdjustments`

## 2. Main Collection Structure

### `schools`
Document ID:
- use your school ID, for example `school_001`

Required fields:
```text
name                  string
email                 string
phone                 string
address               string
subscriptionStatus    string   // Active | Expired | Trial | Suspended
subscriptionPlan      string
expiryDate            string   // YYYY-MM-DD
themeColor            string
attendanceMapLink     string
attendanceGeoLatitude number
attendanceGeoLongitude number
attendanceGeoRadiusMeters number
storageLimit          number
studentLimit          number
staffLimit            number
createdAt             string   // ISO date-time
```

Sample document:
```json
{
  "name": "INDDIA Public School",
  "email": "school@example.com",
  "phone": "9876543210",
  "address": "Chennai",
  "subscriptionStatus": "Active",
  "subscriptionPlan": "Premium",
  "expiryDate": "2027-03-31",
  "themeColor": "#2563eb",
  "attendanceMapLink": "",
  "attendanceGeoLatitude": 0,
  "attendanceGeoLongitude": 0,
  "attendanceGeoRadiusMeters": 0,
  "storageLimit": 5368709120,
  "studentLimit": 2000,
  "staffLimit": 300,
  "createdAt": "2026-04-04T10:00:00.000Z"
}
```

### `users`
Document ID:
- use Firebase Auth UID

Required fields:
```text
name       string
email      string
phone      string
role       string   // super_admin | admin | staff | parent | student
schoolId   string | null
photoUrl   string
createdAt  string
```

Sample document:
```json
{
  "name": "School Admin",
  "email": "admin@school.com",
  "phone": "9876543210",
  "role": "admin",
  "schoolId": "school_001",
  "photoUrl": "",
  "createdAt": "2026-04-04T10:00:00.000Z"
}
```

### `staff`
Document ID:
- auto ID is fine

Required fields:
```text
userId              string
schoolId            string
name                string
role                string
mobileNumber        string
dateOfJoining       string   // YYYY-MM-DD
monthlySalary       number
subjectId           string | null
assignedClass       string | null
assignedSection     string | null
isClassCoordinator  boolean
createdAt           string
```

Sample document:
```json
{
  "userId": "firebase-auth-uid-staff",
  "schoolId": "school_001",
  "name": "Math Teacher",
  "role": "Teacher",
  "mobileNumber": "9999999999",
  "dateOfJoining": "2026-04-01",
  "monthlySalary": 25000,
  "subjectId": "subject_math",
  "assignedClass": "10",
  "assignedSection": "A",
  "isClassCoordinator": true,
  "createdAt": "2026-04-04T10:00:00.000Z"
}
```

### `parents`
Document ID:
- auto ID is fine

Required fields:
```text
userId               string
schoolId             string
name                 string
email                string
phone                string
fatherName           string
fatherAadharNumber   string
fatherOccupation     string
fatherEducation      string
fatherMobileNumber   string
fatherProfession     string
fatherIncome         number
motherName           string
motherAadharNumber   string
motherOccupation     string
motherEducation      string
motherMobileNumber   string
motherProfession     string
motherIncome         number
createdAt            string
```

Sample document:
```json
{
  "userId": "firebase-auth-uid-parent",
  "schoolId": "school_001",
  "name": "Rahul Parent",
  "email": "parent@school.com",
  "phone": "8888888888",
  "fatherName": "Ramesh",
  "fatherAadharNumber": "",
  "fatherOccupation": "",
  "fatherEducation": "",
  "fatherMobileNumber": "8888888888",
  "fatherProfession": "",
  "fatherIncome": 0,
  "motherName": "Lakshmi",
  "motherAadharNumber": "",
  "motherOccupation": "",
  "motherEducation": "",
  "motherMobileNumber": "7777777777",
  "motherProfession": "",
  "motherIncome": 0,
  "createdAt": "2026-04-04T10:00:00.000Z"
}
```

### `students`
Document ID:
- auto ID is fine

Required fields:
```text
userId                string
schoolId              string
parentId              string | null
name                  string
studentCode           string
className             string
section               string
admissionDate         string
discountFee           number
studentAadharNumber   string
dateOfBirth           string
birthId               string
isOrphan              boolean
gender                string
caste                 string
osc                   string | null
identificationMark    string
previousSchool        string
region                string
bloodGroup            string
previousBoardRollNo   string
address               string
createdAt             string
```

Sample document:
```json
{
  "userId": "firebase-auth-uid-student",
  "schoolId": "school_001",
  "parentId": "parent_001",
  "name": "Rahul",
  "studentCode": "STU001",
  "className": "10",
  "section": "A",
  "admissionDate": "2026-04-01",
  "discountFee": 0,
  "studentAadharNumber": "",
  "dateOfBirth": "2010-05-10",
  "birthId": "",
  "isOrphan": false,
  "gender": "Male",
  "caste": "",
  "osc": null,
  "identificationMark": "",
  "previousSchool": "",
  "region": "",
  "bloodGroup": "",
  "previousBoardRollNo": "",
  "address": "Chennai",
  "createdAt": "2026-04-04T10:00:00.000Z"
}
```

### `classes`
Document ID:
- auto ID is fine

Required fields:
```text
schoolId     string
className    string
section      string
roomNumber   string
floor        string
capacity     number
createdAt    string
```

Sample document:
```json
{
  "schoolId": "school_001",
  "className": "10",
  "section": "A",
  "roomNumber": "12",
  "floor": "1",
  "capacity": 40,
  "createdAt": "2026-04-04T10:00:00.000Z"
}
```

### `subjects`
Document ID:
- auto ID or custom ID like `subject_math`

Required fields:
```text
schoolId    string
name        string
createdAt   string
```

Sample document:
```json
{
  "schoolId": "school_001",
  "name": "Mathematics",
  "createdAt": "2026-04-04T10:00:00.000Z"
}
```

### `holidays`
Document ID:
- auto ID is fine

Required fields:
```text
schoolId      string
holidayDate   string   // YYYY-MM-DD
title         string
description   string
createdAt     string
```

Sample document:
```json
{
  "schoolId": "school_001",
  "holidayDate": "2026-04-14",
  "title": "Tamil New Year",
  "description": "School holiday",
  "createdAt": "2026-04-04T10:00:00.000Z"
}
```

## 3. Secondary Collections

### `attendance`
```text
schoolId    string
studentId   string
teacherId   string | null
subjectId   string | null
date        string
status      string   // Present | Absent
createdAt   string
```

### `staffAttendance`
```text
schoolId        string
staffId         string
attendanceDate  string
status          string
checkInTime     string | null
checkOutTime    string | null
notes           string | null
markedBy        string | null
createdAt       string
updatedAt       string
```

### `fees`
```text
schoolId      string
studentId     string
totalAmount   number
paidAmount    number
status        string
dueDate       string
createdAt     string
```

### `auditLogs`
```text
schoolId    string
userId      string | null
action      string
module      string
recordId    string | null
createdAt   string
```

### `timetable`
```text
schoolId     string
className    string
section      string
subjectId    string
teacherId    string
day          string
startTime    string
endTime      string
createdAt    string
```

### `notifications`
```text
schoolId       string
receiverId     string
title          string
message        string
type           string
isRead         boolean
relatedFeeId   string | null
relatedLeaveId string | null
createdAt      string
```

### `leaves`
```text
schoolId      string
staffId       string
fromDate      string
toDate        string
reason        string
status        string
createdAt     string
updatedAt     string
```

### `salary`
```text
schoolId      string
staffId       string
month         string
year          number
amount        number
status        string
paidDate      string | null
createdAt     string
```

### `vehicles`
```text
schoolId      string
vehicleNumber string
driverName    string
driverPhone   string
capacity      number
createdAt     string
```

### `routes`
```text
schoolId      string
vehicleId     string
name          string
stops         array
createdAt     string
```

### `applicants`
```text
schoolId       string
name           string
email          string
phone          string
className      string
section        string
status         string
createdAt      string
updatedAt      string
```

### `subscriptions`
```text
schoolId       string
planName       string
status         string
startDate      string
endDate        string
amount         number
createdAt      string
```

### `payments`
```text
schoolId       string
amount         number
status         string
method         string
transactionId  string
paidAt         string
createdAt      string
```

### `timetableAdjustments`
```text
schoolId               string
timetableId            string
replacementTeacherId   string
adjustmentDate         string
reason                 string
createdAt              string
```

## 4. Minimum Data To Create First

Create these first so login and admin pages can start working:

1. one `schools` document
2. one Firebase Auth admin user
3. matching `users/{uid}` document with role `admin`
4. one `classes` document
5. one `subjects` document

## 5. Important Rules

- `users/{uid}` must use the same ID as Firebase Authentication `uid`
- every school-scoped document must have `schoolId`
- use ISO strings for `createdAt`, `updatedAt`, `paidAt`
- use `YYYY-MM-DD` for plain date fields
- keep role values consistent:
  - `super_admin`
  - `admin`
  - `staff`
  - `parent`
  - `student`

## 6. Recommended Firestore Indexes

Create these indexes when Firebase asks:

- `users`: `email`
- `students`: `schoolId`, `studentCode`
- `students`: `schoolId`, `className`, `section`
- `staff`: `schoolId`, `subjectId`
- `staff`: `schoolId`, `assignedClass`, `assignedSection`
- `attendance`: `schoolId`, `date`
- `attendance`: `studentId`, `date`
- `staffAttendance`: `schoolId`, `attendanceDate`
- `fees`: `studentId`, `status`
- `auditLogs`: `schoolId`, `createdAt`
- `holidays`: `schoolId`, `holidayDate`
- `timetable`: `schoolId`, `className`, `section`

## 7. First Admin Setup Example

1. Create Firebase Auth user:
- email: `admin@school.com`
- password: your choice

2. Copy that Auth user `uid`

3. In `schools`, create:
- doc id: `school_001`

4. In `users`, create:
- doc id: the same Firebase Auth `uid`

Document:
```json
{
  "name": "School Admin",
  "email": "admin@school.com",
  "phone": "9876543210",
  "role": "admin",
  "schoolId": "school_001",
  "photoUrl": "",
  "createdAt": "2026-04-04T10:00:00.000Z"
}
```

After that, this admin login can start using the Firebase-based flow.
