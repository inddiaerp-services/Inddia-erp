-- INDDIA ERP
-- Full reset schema for multi-school SaaS ERP
-- Default Super Admin:
--   id: 91b17200-dc47-42da-ab75-6eff0069c0cf
--   email: superadmin@gmail.com
--   password: admin123

drop schema if exists public cascade;
create schema public;

create extension if not exists pgcrypto;

grant usage on schema public to postgres, anon, authenticated, service_role;
grant create on schema public to postgres, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant all privileges on tables to service_role;
alter default privileges in schema public grant all privileges on sequences to service_role;

create table public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  address text,
  attendance_map_link text,
  attendance_geo_latitude double precision,
  attendance_geo_longitude double precision,
  attendance_geo_radius_meters numeric check (attendance_geo_radius_meters is null or attendance_geo_radius_meters > 0),
  billing_contact_name text,
  billing_contact_email text,
  billing_contact_phone text,
  billing_address text,
  finance_email text,
  tax_id text,
  authorized_signatory text,
  logo_url text,
  theme_color text,
  subscription_status text not null default 'Trial' check (subscription_status in ('Active', 'Expired', 'Trial', 'Suspended')),
  subscription_plan text,
  storage_limit int,
  student_limit int,
  staff_limit int,
  renewal_notice_days int default 7 check (renewal_notice_days >= 0),
  expiry_date date,
  created_at timestamp default now(),
  constraint schools_attendance_geo_config_check check (
    (
      attendance_map_link is null
      and attendance_geo_latitude is null
      and attendance_geo_longitude is null
      and attendance_geo_radius_meters is null
    )
    or (
      attendance_map_link is not null
      and attendance_geo_latitude is not null
      and attendance_geo_longitude is not null
      and attendance_geo_radius_meters is not null
    )
  )
);

create table public.users (
  id uuid primary key,
  name text not null,
  email text unique,
  phone text,
  role text not null check (role in ('super_admin', 'admin', 'staff', 'student', 'parent', 'teacher', 'hr', 'accounts', 'transport', 'admission')),
  school_id uuid references public.schools(id) on delete cascade,
  photo_url text,
  created_at timestamp default now(),
  constraint users_school_scope_check check (
    (role = 'super_admin' and school_id is null)
    or (role <> 'super_admin' and school_id is not null)
  )
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  plan_name text,
  amount numeric not null default 0,
  duration_months int not null default 1,
  start_date date,
  end_date date,
  status text not null default 'Expired' check (status in ('Active', 'Expired')),
  created_at timestamp default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  amount numeric not null default 0,
  payment_method text,
  payment_date timestamp default now(),
  status text not null default 'Success' check (status in ('Success', 'Failed')),
  created_at timestamp default now()
);

create table public.platform_payment_requests (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  requested_plan text not null,
  requested_amount numeric not null default 0,
  duration_months int not null default 1 check (duration_months > 0),
  payment_method text,
  payment_date timestamp default now(),
  transaction_reference text,
  proof_url text,
  note text,
  status text not null default 'Pending' check (status in ('Pending', 'Approved', 'Rejected')),
  created_by uuid references public.users(id) on delete set null,
  verified_by uuid references public.users(id) on delete set null,
  verified_at timestamp,
  verified_note text,
  payment_id uuid references public.payments(id) on delete set null,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  created_at timestamp default now()
);

create table public.billing_documents (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  payment_request_id uuid references public.platform_payment_requests(id) on delete set null,
  payment_id uuid references public.payments(id) on delete set null,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  document_number text not null unique,
  document_type text not null check (document_type in ('Invoice', 'Receipt')),
  title text,
  amount numeric not null default 0,
  status text not null default 'Issued' check (status in ('Issued', 'Void')),
  issue_date date not null default current_date,
  due_date date,
  note text,
  created_at timestamp default now()
);

create table public.renewal_reminders (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  reminder_type text not null check (reminder_type in ('Upcoming', 'Urgent', 'Expired', 'UpgradeOpportunity')),
  title text not null,
  message text not null,
  remind_at date not null,
  status text not null default 'Pending' check (status in ('Pending', 'Read', 'Dismissed')),
  created_at timestamp default now(),
  unique (school_id, reminder_type, remind_at)
);

create table public.plan_change_requests (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  current_plan text,
  requested_plan text not null,
  requested_billing_cycle text not null default 'Monthly' check (requested_billing_cycle in ('Monthly', 'Quarterly', 'Yearly', 'Custom')),
  requested_duration_months int not null default 1 check (requested_duration_months > 0),
  expected_amount numeric not null default 0,
  note text,
  status text not null default 'Pending' check (status in ('Pending', 'Approved', 'Rejected')),
  requested_by uuid references public.users(id) on delete set null,
  reviewed_by uuid references public.users(id) on delete set null,
  reviewed_at timestamp,
  review_note text,
  created_at timestamp default now()
);

create table public.parents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  name text,
  email text,
  phone text,
  father_name text,
  father_aadhar_number text,
  father_occupation text,
  father_education text,
  father_mobile_number text,
  father_profession text,
  father_income numeric default 0 check (father_income >= 0),
  mother_name text,
  mother_aadhar_number text,
  mother_occupation text,
  mother_education text,
  mother_mobile_number text,
  mother_profession text,
  mother_income numeric default 0 check (mother_income >= 0)
);

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  name text not null,
  created_at timestamp default now()
);

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  class_name text not null,
  section text not null,
  room_number text,
  floor text,
  capacity int,
  created_at timestamp default now()
);

create table public.holidays (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  holiday_date date not null,
  title text not null,
  description text,
  created_at timestamp default now()
);

create table public.staff (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  name text,
  role text,
  mobile_number text,
  date_of_joining date,
  monthly_salary numeric default 0 check (monthly_salary >= 0),
  subject_id uuid references public.subjects(id) on delete set null,
  is_class_coordinator boolean default false,
  assigned_class text,
  assigned_section text,
  created_at timestamp default now()
);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  name text,
  student_code text not null,
  class text,
  section text,
  admission_date date,
  discount_fee numeric default 0 check (discount_fee >= 0),
  aadhar_number text,
  date_of_birth date,
  birth_id text,
  is_orphan boolean not null default false,
  gender text check (gender in ('Male', 'Female', 'Other')),
  caste text,
  osc text check (osc in ('A', 'B', 'C')),
  identification_mark text,
  previous_school text,
  region text,
  blood_group text check (blood_group in ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
  previous_board_roll_no text,
  address text,
  parent_id uuid references public.parents(id) on delete set null,
  created_at timestamp default now(),
  constraint students_school_code_unique unique (school_id, student_code)
);

create table public.timetable (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  class text not null,
  section text not null,
  subject_id uuid references public.subjects(id) on delete set null,
  teacher_id uuid references public.staff(id) on delete set null,
  day text not null,
  start_time time not null,
  end_time time not null,
  is_break boolean default false,
  break_type text,
  break_label text,
  is_cancelled boolean default false,
  cancellation_reason text,
  created_at timestamp default now(),
  constraint timetable_day_check check (day in ('Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun')),
  constraint timetable_time_order_check check (start_time < end_time)
);

create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  teacher_id uuid references public.staff(id) on delete set null,
  date date not null,
  status text not null check (status in ('Present', 'Absent')),
  created_at timestamp default now()
);

create table public.exams (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  name text not null,
  class text not null,
  section text not null,
  date date not null,
  start_date date not null,
  end_date date not null,
  exam_session text not null default 'Full Day' check (exam_session in ('Full Day', 'Morning', 'Afternoon')),
  status text not null default 'Draft' check (status in ('Draft', 'Ongoing', 'Completed')),
  created_at timestamp default now()
);

create table public.exam_subjects (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  exam_id uuid not null references public.exams(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  max_marks int not null default 100 check (max_marks > 0),
  exam_date date not null,
  exam_session text not null default 'Morning' check (exam_session in ('Full Day', 'Morning', 'Afternoon')),
  start_time time not null,
  end_time time not null,
  created_at timestamp default now(),
  constraint exam_subjects_time_window_check check (start_time < end_time)
);

create table public.results (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  exam_id uuid not null references public.exams(id) on delete cascade,
  marks int,
  grade text,
  created_at timestamp default now()
);

create table public.marks (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  exam_id uuid not null references public.exams(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  marks_obtained int check (marks_obtained >= 0),
  grade text,
  created_at timestamp default now()
);

create table public.fees (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  total_amount numeric not null default 0,
  paid_amount numeric default 0,
  status text check (status in ('Paid', 'Unpaid', 'Partial')),
  due_date date,
  created_at timestamp default now()
);

create table public.employees (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  name text not null,
  role text not null,
  department text not null,
  email text,
  phone text,
  created_at timestamp default now()
);

create table public.leaves (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  employee_id uuid references public.employees(id) on delete set null,
  staff_id uuid references public.staff(id) on delete cascade,
  start_date date,
  end_date date,
  status text check (status in ('Pending_HR', 'Rejected_By_HR', 'Pending_Admin', 'Approved', 'Rejected_By_Admin')),
  reason text,
  hr_comment text,
  admin_comment text,
  created_at timestamp default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  type text,
  message text,
  module text,
  user_id uuid references public.users(id) on delete cascade,
  receiver_id uuid references public.staff(id) on delete cascade,
  related_leave_id uuid references public.leaves(id) on delete cascade,
  related_fee_id uuid references public.fees(id) on delete cascade,
  dedupe_key text,
  is_read boolean default false,
  created_at timestamp default now()
);

create table public.timetable_adjustments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  leave_id uuid not null references public.leaves(id) on delete cascade,
  timetable_id uuid not null references public.timetable(id) on delete cascade,
  impact_date date not null,
  status text default 'Pending_Action' check (status in ('Pending_Action', 'Rescheduled', 'Cancelled')),
  replacement_teacher_id uuid references public.staff(id) on delete set null,
  replacement_subject_id uuid references public.subjects(id) on delete set null,
  replacement_start_time time,
  replacement_end_time time,
  note text,
  resolved_by uuid references public.users(id) on delete set null,
  resolved_at timestamp,
  created_at timestamp default now(),
  unique (leave_id, timetable_id, impact_date)
);

create table public.salary (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  employee_id uuid references public.employees(id) on delete set null,
  staff_id uuid references public.staff(id) on delete cascade,
  amount numeric default 0,
  month text,
  status text check (status in ('Paid', 'Unpaid')),
  created_at timestamp default now()
);

create table public.staff_attendance (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  staff_id uuid not null references public.staff(id) on delete cascade,
  attendance_date date not null,
  status text not null check (status in ('Present', 'Absent', 'Late', 'Half Day', 'On Leave')),
  check_in_time time,
  check_out_time time,
  notes text,
  marked_by uuid references public.users(id) on delete set null,
  created_at timestamp default now(),
  updated_at timestamp default now(),
  constraint staff_attendance_time_order_check check (
    check_in_time is null
    or check_out_time is null
    or check_in_time <= check_out_time
  )
);

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  vehicle_number text,
  vehicle_name text not null,
  driver_name text not null,
  driver_phone text,
  capacity int not null,
  status text default 'Active',
  created_at timestamp default now()
);

create table public.routes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  route_name text not null,
  stops text not null,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  created_at timestamp default now()
);

create table public.applicants (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  name text not null,
  student_name text,
  email text not null,
  class text not null,
  class_applied text,
  status text not null default 'Pending' check (status in ('Pending', 'Approved', 'Rejected')),
  parent_name text,
  parent_email text,
  parent_phone text,
  created_at timestamp default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete set null,
  user_id uuid references public.users(id) on delete set null,
  action text not null,
  module text not null,
  record_id uuid,
  created_at timestamp default now()
);

create unique index idx_classes_unique_school_class_section on public.classes(school_id, class_name, section);
create unique index idx_holidays_unique_school_date on public.holidays(school_id, holiday_date);
create unique index idx_attendance_unique_student_subject_date on public.attendance(student_id, subject_id, date);
create unique index idx_results_unique_student_subject_exam on public.results(student_id, subject_id, exam_id);
create unique index idx_exam_subjects_unique on public.exam_subjects(exam_id, subject_id);
create unique index idx_marks_unique_student_subject_exam on public.marks(student_id, subject_id, exam_id);
create unique index idx_notifications_dedupe on public.notifications(dedupe_key) where dedupe_key is not null;
create unique index idx_staff_attendance_unique_staff_date on public.staff_attendance(school_id, staff_id, attendance_date);

create index idx_users_role on public.users(role);
create index idx_users_school_id on public.users(school_id);
create unique index idx_users_email_lower_unique on public.users(lower(email)) where email is not null;
create index idx_students_user_id on public.students(user_id);
create index idx_students_school_class_section on public.students(school_id, class, section);
create index idx_students_school_code on public.students(school_id, student_code);
create index idx_parents_school_email on public.parents(school_id, email);
create index idx_staff_user_id on public.staff(user_id);
create index idx_staff_school_role on public.staff(school_id, role);
create index idx_attendance_student_date on public.attendance(student_id, date);
create index idx_fees_student_status on public.fees(student_id, status);
create index idx_timetable_class_section_day on public.timetable(school_id, class, section, day);
create index idx_timetable_teacher_day on public.timetable(teacher_id, day);
create index idx_exams_school_class_section_date on public.exams(school_id, class, section, date);
create index idx_marks_exam_student on public.marks(exam_id, student_id);
create index idx_leaves_staff_status on public.leaves(staff_id, status);
create index idx_salary_staff_month on public.salary(staff_id, month);
create index idx_staff_attendance_school_date on public.staff_attendance(school_id, attendance_date desc);
create index idx_staff_attendance_staff_date on public.staff_attendance(staff_id, attendance_date desc);
create index idx_routes_vehicle_id on public.routes(vehicle_id);
create index idx_applicants_status_class on public.applicants(school_id, status, class);
create index idx_notifications_receiver_read on public.notifications(receiver_id, is_read, created_at desc);
create index idx_notifications_user_read on public.notifications(user_id, is_read, created_at desc);
create index idx_audit_logs_user_created_at on public.audit_logs(user_id, created_at desc);
create index idx_audit_logs_module_created_at on public.audit_logs(module, created_at desc);

create or replace function public.current_auth_email()
returns text
language sql
stable
as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

create or replace function public.current_profile_school_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select users.school_id
  from public.users
  where users.id = auth.uid()
     or lower(coalesce(users.email, '')) = public.current_auth_email()
  order by case when users.id = auth.uid() then 0 else 1 end
  limit 1;
$$;

create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select lower(coalesce(users.role, ''))
  from public.users
  where users.id = auth.uid()
     or lower(coalesce(users.email, '')) = public.current_auth_email()
  order by case when users.id = auth.uid() then 0 else 1 end
  limit 1;
$$;

create or replace function public.current_school_id()
returns uuid
language sql
stable
as $$
  select coalesce(
    nullif(auth.jwt() ->> 'school_id', '')::uuid,
    nullif(auth.jwt() -> 'app_metadata' ->> 'school_id', '')::uuid,
    nullif(auth.jwt() -> 'user_metadata' ->> 'school_id', '')::uuid,
    public.current_profile_school_id()
  );
$$;

create or replace function public.current_app_role()
returns text
language sql
stable
as $$
  select lower(
    coalesce(
      auth.jwt() ->> 'role',
      auth.jwt() -> 'app_metadata' ->> 'role',
      auth.jwt() -> 'user_metadata' ->> 'role',
      public.current_profile_role(),
      ''
    )
  );
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
as $$
  select public.current_app_role() = 'super_admin';
$$;

create or replace function public.is_current_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.users
    where lower(coalesce(users.role, '')) in ('admin', 'super_admin')
      and (
        users.id = auth.uid()
        or lower(coalesce(users.email, '')) = public.current_auth_email()
      )
  );
$$;

create or replace function public.current_staff_workspace()
returns text
language sql
stable
as $$
  select coalesce(
    (
      select case
        when lower(coalesce(staff.role, '')) like '%human%' or lower(coalesce(staff.role, '')) = 'hr' then 'hr'
        when lower(coalesce(staff.role, '')) like '%account%' or lower(coalesce(staff.role, '')) like '%finance%' then 'accounts'
        when lower(coalesce(staff.role, '')) like '%transport%' then 'transport'
        when lower(coalesce(staff.role, '')) like '%admission%' then 'admission'
        else 'teacher'
      end
      from public.staff
      where staff.user_id = auth.uid()
      limit 1
    ),
    ''
  );
$$;

create or replace function public.has_staff_workspace_access(allowed_workspaces text[])
returns boolean
language sql
stable
as $$
  select
    public.is_super_admin()
    or public.is_current_admin()
    or (
      auth.role() = 'authenticated'
      and public.current_staff_workspace() = any(allowed_workspaces)
    );
$$;

create or replace function public.can_manage_selected_timetable(target_class text, target_section text)
returns boolean
language sql
stable
as $$
  select
    public.is_super_admin()
    or public.is_current_admin()
    or exists (
      select 1
      from public.staff
      where staff.user_id = auth.uid()
        and staff.school_id::text = public.current_school_id()::text
        and staff.is_class_coordinator = true
        and staff.assigned_class = target_class
        and staff.assigned_section = target_section
    );
$$;

create or replace function public.can_manage_attendance_entry(
  target_student uuid,
  target_subject uuid,
  target_teacher uuid,
  target_date date
)
returns boolean
language sql
stable
as $$
  select
    public.is_super_admin()
    or public.is_current_admin()
    or exists (
      select 1
      from public.staff
      join public.students
        on students.id = target_student
      join public.timetable
        on timetable.school_id::text = students.school_id::text
       and timetable.class = students.class
       and timetable.section = students.section
       and timetable.subject_id = target_subject
       and timetable.teacher_id = target_teacher
      where staff.user_id = auth.uid()
        and staff.id = target_teacher
        and staff.school_id::text = students.school_id::text
        and trim(to_char(target_date, 'Dy')) = timetable.day
    );
$$;

create or replace function public.is_exam_marks_entry_open(target_exam uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.exams
    where exams.id = target_exam
      and coalesce(exams.end_date, exams.start_date, exams.date) < ((now() at time zone 'Asia/Kolkata')::date)
  );
$$;

create or replace function public.can_manage_exam_marks(
  target_exam uuid,
  target_student uuid,
  target_subject uuid
)
returns boolean
language sql
stable
as $$
  select
    public.is_exam_marks_entry_open(target_exam)
    and (
      public.is_super_admin()
      or public.is_current_admin()
      or exists (
        select 1
        from public.staff
        join public.exams on exams.id = target_exam
        join public.students
          on students.id = target_student
         and students.school_id::text = exams.school_id::text
         and students.class = exams.class
         and students.section = exams.section
        join public.timetable
          on timetable.school_id::text = exams.school_id::text
         and timetable.class = exams.class
         and timetable.section = exams.section
         and timetable.subject_id = target_subject
         and timetable.teacher_id = staff.id
        where staff.user_id = auth.uid()
      )
    );
$$;

create or replace function public.class_has_exam_on_date(
  target_class text,
  target_section text,
  target_date date
)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.exams
    where (public.is_super_admin() or exams.school_id::text = public.current_school_id()::text)
      and exams.class = target_class
      and coalesce(nullif(btrim(exams.section), ''), btrim(target_section)) = btrim(target_section)
      and (
        exists (
          select 1
          from public.exam_subjects
          where exam_subjects.exam_id = exams.id
            and coalesce(exam_subjects.exam_date, exams.start_date, exams.date) = target_date
        )
        or (
          not exists (select 1 from public.exam_subjects where exam_subjects.exam_id = exams.id)
          and coalesce(exams.start_date, exams.date) <= target_date
          and coalesce(exams.end_date, exams.start_date, exams.date) >= target_date
        )
      )
  );
$$;

create or replace function public.class_has_exam_during_slot(
  target_class text,
  target_section text,
  target_date date,
  target_start_time time,
  target_end_time time
)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.exams
    where (public.is_super_admin() or exams.school_id::text = public.current_school_id()::text)
      and exams.class = target_class
      and coalesce(nullif(btrim(exams.section), ''), btrim(target_section)) = btrim(target_section)
      and (
        exists (
          select 1
          from public.exam_subjects
          where exam_subjects.exam_id = exams.id
            and coalesce(exam_subjects.exam_date, exams.start_date, exams.date) = target_date
            and target_start_time < coalesce(
              exam_subjects.end_time,
              case coalesce(exam_subjects.exam_session, exams.exam_session, 'Full Day')
                when 'Morning' then time '12:30'
                else time '16:30'
              end
            )
            and target_end_time > coalesce(
              exam_subjects.start_time,
              case coalesce(exam_subjects.exam_session, exams.exam_session, 'Full Day')
                when 'Afternoon' then time '13:30'
                else time '08:00'
              end
            )
        )
        or (
          not exists (select 1 from public.exam_subjects where exam_subjects.exam_id = exams.id)
          and coalesce(exams.start_date, exams.date) <= target_date
          and coalesce(exams.end_date, exams.start_date, exams.date) >= target_date
          and (
            coalesce(exams.exam_session, 'Full Day') = 'Full Day'
            or (
              coalesce(exams.exam_session, 'Full Day') = 'Morning'
              and target_start_time < time '12:30'
              and target_end_time > time '08:00'
            )
            or (
              coalesce(exams.exam_session, 'Full Day') = 'Afternoon'
              and target_start_time < time '16:30'
              and target_end_time > time '13:30'
            )
          )
        )
      )
  );
$$;

create or replace function public.validate_timetable_slot()
returns trigger
language plpgsql
as $$
begin
  if new.class is null or btrim(new.class) = '' then
    raise exception 'Timetable class is required.';
  end if;

  if new.section is null or btrim(new.section) = '' then
    raise exception 'Timetable section is required.';
  end if;

  if new.day is null or btrim(new.day) = '' then
    raise exception 'Timetable day is required.';
  end if;

  if new.start_time >= new.end_time then
    raise exception 'End time must be later than start time.';
  end if;

  if coalesce(new.is_break, false) then
    if new.break_type is null or btrim(new.break_type) = '' then
      raise exception 'Break type is required.';
    end if;

    if new.break_type not in ('Short Break', 'Lunch Break') then
      raise exception 'Break type must be Short Break or Lunch Break.';
    end if;

    if new.break_label is null or btrim(new.break_label) = '' then
      raise exception 'Break name is required.';
    end if;

    new.subject_id := null;
    new.teacher_id := null;
  else
    if new.subject_id is null then
      raise exception 'Timetable subject is required.';
    end if;

    if new.teacher_id is null then
      raise exception 'Timetable teacher is required.';
    end if;

    new.break_type := null;
    new.break_label := null;
  end if;

  if exists (
    select 1
    from public.timetable existing
    where existing.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
      and existing.school_id::text = new.school_id::text
      and existing.teacher_id = new.teacher_id
      and existing.day = new.day
      and new.start_time < existing.end_time
      and new.end_time > existing.start_time
  ) then
    raise exception 'Teacher conflict: this teacher is already assigned to another class at this time.';
  end if;

  if exists (
    select 1
    from public.timetable existing
    where existing.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
      and existing.school_id::text = new.school_id::text
      and existing.class = new.class
      and existing.section = new.section
      and existing.day = new.day
      and new.start_time < existing.end_time
      and new.end_time > existing.start_time
  ) then
    raise exception 'Class conflict: this class already has another subject scheduled at this time.';
  end if;

  return new;
end;
$$;

create or replace function public.cleanup_deleted_student()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  parent_user_id uuid;
  has_other_students boolean;
begin
  delete from public.users where id = old.user_id;

  if old.parent_id is null then
    return old;
  end if;

  select exists (
    select 1
    from public.students
    where parent_id = old.parent_id
      and id <> old.id
  )
  into has_other_students;

  if has_other_students then
    return old;
  end if;

  select user_id
  into parent_user_id
  from public.parents
  where id = old.parent_id;

  delete from public.parents where id = old.parent_id;

  if parent_user_id is not null then
    delete from public.users where id = parent_user_id;
  end if;

  return old;
end;
$$;

create or replace function public.set_school_id_from_jwt()
returns trigger
language plpgsql
as $$
begin
  if new.school_id is null and not public.is_super_admin() then
    new.school_id := public.current_school_id();
  end if;

  return new;
end;
$$;

create or replace function public.set_updated_at_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.analytics_overview()
returns table (
  total_students bigint,
  total_staff bigint,
  total_fees_collected numeric,
  pending_fees numeric
)
language sql
stable
as $$
  select
    (
      select count(*)
      from public.students
      where public.is_super_admin() or students.school_id::text = public.current_school_id()::text
    ) as total_students,
    (
      select count(*)
      from public.staff
      where public.is_super_admin() or staff.school_id::text = public.current_school_id()::text
    ) as total_staff,
    (
      select coalesce(sum(coalesce(fees.paid_amount, 0)), 0)
      from public.fees
      where public.is_super_admin() or fees.school_id::text = public.current_school_id()::text
    ) as total_fees_collected,
    (
      select coalesce(sum(greatest(coalesce(fees.total_amount, 0) - coalesce(fees.paid_amount, 0), 0)), 0)
      from public.fees
      where public.is_super_admin() or fees.school_id::text = public.current_school_id()::text
    ) as pending_fees;
$$;

create or replace function public.analytics_monthly_fee_collection()
returns table (
  month_start date,
  collected_amount numeric
)
language sql
stable
as $$
  select
    date_trunc('month', fees.created_at)::date as month_start,
    coalesce(sum(coalesce(fees.paid_amount, 0)), 0) as collected_amount
  from public.fees
  where public.is_super_admin() or fees.school_id::text = public.current_school_id()::text
  group by date_trunc('month', fees.created_at)::date
  order by month_start asc;
$$;

create or replace function public.analytics_attendance_distribution()
returns table (
  status text,
  total_count bigint,
  percentage numeric
)
language sql
stable
as $$
  with attendance_totals as (
    select
      coalesce(nullif(attendance.status, ''), 'Unknown') as status,
      count(*) as total_count
    from public.attendance
    where public.is_super_admin() or attendance.school_id::text = public.current_school_id()::text
    group by coalesce(nullif(attendance.status, ''), 'Unknown')
  ),
  grand_total as (
    select coalesce(sum(attendance_totals.total_count), 0) as value
    from attendance_totals
  )
  select
    attendance_totals.status,
    attendance_totals.total_count,
    case
      when grand_total.value = 0 then 0
      else round((attendance_totals.total_count::numeric / grand_total.value::numeric) * 100, 2)
    end as percentage
  from attendance_totals
  cross join grand_total
  order by attendance_totals.status asc;
$$;

create or replace function public.analytics_subject_performance()
returns table (
  subject_id uuid,
  subject_name text,
  average_marks numeric
)
language sql
stable
as $$
  select
    subjects.id as subject_id,
    subjects.name as subject_name,
    round(avg(coalesce(marks.marks_obtained, 0))::numeric, 2) as average_marks
  from public.marks
  join public.subjects on subjects.id = marks.subject_id
  where public.is_super_admin() or marks.school_id::text = public.current_school_id()::text
  group by subjects.id, subjects.name
  order by subjects.name asc;
$$;

drop trigger if exists trg_validate_timetable_slot on public.timetable;
create trigger trg_validate_timetable_slot
before insert or update on public.timetable
for each row execute function public.validate_timetable_slot();

drop trigger if exists cleanup_deleted_student_trigger on public.students;
create trigger cleanup_deleted_student_trigger
after delete on public.students
for each row execute function public.cleanup_deleted_student();

drop trigger if exists parents_set_school_id on public.parents;
create trigger parents_set_school_id before insert on public.parents
for each row execute function public.set_school_id_from_jwt();

drop trigger if exists subjects_set_school_id on public.subjects;
create trigger subjects_set_school_id before insert on public.subjects
for each row execute function public.set_school_id_from_jwt();

drop trigger if exists classes_set_school_id on public.classes;
create trigger classes_set_school_id before insert on public.classes
for each row execute function public.set_school_id_from_jwt();

drop trigger if exists holidays_set_school_id on public.holidays;
create trigger holidays_set_school_id before insert on public.holidays
for each row execute function public.set_school_id_from_jwt();

drop trigger if exists staff_set_school_id on public.staff;
create trigger staff_set_school_id before insert on public.staff
for each row execute function public.set_school_id_from_jwt();

drop trigger if exists students_set_school_id on public.students;
create trigger students_set_school_id before insert on public.students
for each row execute function public.set_school_id_from_jwt();

drop trigger if exists timetable_set_school_id on public.timetable;
create trigger timetable_set_school_id before insert on public.timetable
for each row execute function public.set_school_id_from_jwt();

drop trigger if exists attendance_set_school_id on public.attendance;
create trigger attendance_set_school_id before insert on public.attendance
for each row execute function public.set_school_id_from_jwt();

drop trigger if exists exams_set_school_id on public.exams;
create trigger exams_set_school_id before insert on public.exams
for each row execute function public.set_school_id_from_jwt();

drop trigger if exists exam_subjects_set_school_id on public.exam_subjects;
create trigger exam_subjects_set_school_id before insert on public.exam_subjects
for each row execute function public.set_school_id_from_jwt();

drop trigger if exists results_set_school_id on public.results;
create trigger results_set_school_id before insert on public.results
for each row execute function public.set_school_id_from_jwt();

drop trigger if exists marks_set_school_id on public.marks;
create trigger marks_set_school_id before insert on public.marks
for each row execute function public.set_school_id_from_jwt();

drop trigger if exists fees_set_school_id on public.fees;
create trigger fees_set_school_id before insert on public.fees
for each row execute function public.set_school_id_from_jwt();

drop trigger if exists employees_set_school_id on public.employees;
create trigger employees_set_school_id before insert on public.employees
for each row execute function public.set_school_id_from_jwt();

drop trigger if exists leaves_set_school_id on public.leaves;
create trigger leaves_set_school_id before insert on public.leaves
for each row execute function public.set_school_id_from_jwt();

drop trigger if exists notifications_set_school_id on public.notifications;
create trigger notifications_set_school_id before insert on public.notifications
for each row execute function public.set_school_id_from_jwt();

drop trigger if exists timetable_adjustments_set_school_id on public.timetable_adjustments;
create trigger timetable_adjustments_set_school_id before insert on public.timetable_adjustments
for each row execute function public.set_school_id_from_jwt();

drop trigger if exists salary_set_school_id on public.salary;
create trigger salary_set_school_id before insert on public.salary
for each row execute function public.set_school_id_from_jwt();

drop trigger if exists staff_attendance_set_school_id on public.staff_attendance;
create trigger staff_attendance_set_school_id before insert on public.staff_attendance
for each row execute function public.set_school_id_from_jwt();

drop trigger if exists staff_attendance_set_updated_at on public.staff_attendance;
create trigger staff_attendance_set_updated_at before update on public.staff_attendance
for each row execute function public.set_updated_at_timestamp();

drop trigger if exists vehicles_set_school_id on public.vehicles;
create trigger vehicles_set_school_id before insert on public.vehicles
for each row execute function public.set_school_id_from_jwt();

drop trigger if exists routes_set_school_id on public.routes;
create trigger routes_set_school_id before insert on public.routes
for each row execute function public.set_school_id_from_jwt();

drop trigger if exists applicants_set_school_id on public.applicants;
create trigger applicants_set_school_id before insert on public.applicants
for each row execute function public.set_school_id_from_jwt();

drop trigger if exists audit_logs_set_school_id on public.audit_logs;
create trigger audit_logs_set_school_id before insert on public.audit_logs
for each row execute function public.set_school_id_from_jwt();

alter table public.schools enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;
alter table public.users enable row level security;
alter table public.parents enable row level security;
alter table public.subjects enable row level security;
alter table public.classes enable row level security;
alter table public.holidays enable row level security;
alter table public.staff enable row level security;
alter table public.students enable row level security;
alter table public.timetable enable row level security;
alter table public.attendance enable row level security;
alter table public.exams enable row level security;
alter table public.exam_subjects enable row level security;
alter table public.results enable row level security;
alter table public.marks enable row level security;
alter table public.fees enable row level security;
alter table public.employees enable row level security;
alter table public.leaves enable row level security;
alter table public.notifications enable row level security;
alter table public.timetable_adjustments enable row level security;
alter table public.salary enable row level security;
alter table public.staff_attendance enable row level security;
alter table public.vehicles enable row level security;
alter table public.routes enable row level security;
alter table public.applicants enable row level security;
alter table public.audit_logs enable row level security;

create policy "schools tenant access"
on public.schools
for select
using (public.is_super_admin() or id::text = public.current_school_id()::text);

create policy "schools super admin write access"
on public.schools
for insert
with check (public.is_super_admin());

create policy "schools super admin update access"
on public.schools
for update
using (public.is_super_admin())
with check (public.is_super_admin());

create policy "schools super admin delete access"
on public.schools
for delete
using (public.is_super_admin());

create policy "subscriptions tenant isolation"
on public.subscriptions
for all
using (public.is_super_admin() or school_id::text = public.current_school_id()::text)
with check (public.is_super_admin() or school_id::text = public.current_school_id()::text);

create policy "payments tenant isolation"
on public.payments
for all
using (public.is_super_admin() or school_id::text = public.current_school_id()::text)
with check (public.is_super_admin() or school_id::text = public.current_school_id()::text);

create policy "users tenant isolation"
on public.users
for all
using (
  public.is_super_admin()
  or school_id::text = public.current_school_id()::text
  or id = auth.uid()
)
with check (
  public.is_super_admin()
  or school_id::text = public.current_school_id()::text
);

create policy "parents tenant isolation"
on public.parents
for all
using (public.is_super_admin() or school_id::text = public.current_school_id()::text)
with check (public.is_super_admin() or school_id::text = public.current_school_id()::text);

create policy "subjects tenant isolation"
on public.subjects
for all
using (public.is_super_admin() or school_id::text = public.current_school_id()::text)
with check (public.is_super_admin() or school_id::text = public.current_school_id()::text);

create policy "classes tenant isolation"
on public.classes
for all
using (public.is_super_admin() or school_id::text = public.current_school_id()::text)
with check (public.is_super_admin() or school_id::text = public.current_school_id()::text);

create policy "holidays tenant isolation"
on public.holidays
for all
using (public.is_super_admin() or school_id::text = public.current_school_id()::text)
with check (public.is_super_admin() or school_id::text = public.current_school_id()::text);

create policy "staff tenant isolation"
on public.staff
for all
using (public.is_super_admin() or school_id::text = public.current_school_id()::text)
with check (public.is_super_admin() or school_id::text = public.current_school_id()::text);

create policy "students tenant isolation"
on public.students
for all
using (public.is_super_admin() or school_id::text = public.current_school_id()::text)
with check (public.is_super_admin() or school_id::text = public.current_school_id()::text);

create policy "timetable tenant isolation"
on public.timetable
for all
using (public.is_super_admin() or school_id::text = public.current_school_id()::text)
with check (public.is_super_admin() or school_id::text = public.current_school_id()::text);

create policy "attendance tenant isolation"
on public.attendance
for all
using (public.is_super_admin() or school_id::text = public.current_school_id()::text)
with check (public.is_super_admin() or school_id::text = public.current_school_id()::text);

create policy "exams tenant isolation"
on public.exams
for all
using (public.is_super_admin() or school_id::text = public.current_school_id()::text)
with check (public.is_super_admin() or school_id::text = public.current_school_id()::text);

create policy "exam_subjects tenant isolation"
on public.exam_subjects
for all
using (public.is_super_admin() or school_id::text = public.current_school_id()::text)
with check (public.is_super_admin() or school_id::text = public.current_school_id()::text);

create policy "results tenant isolation"
on public.results
for all
using (public.is_super_admin() or school_id::text = public.current_school_id()::text)
with check (public.is_super_admin() or school_id::text = public.current_school_id()::text);

create policy "marks tenant isolation"
on public.marks
for all
using (public.is_super_admin() or school_id::text = public.current_school_id()::text)
with check (public.is_super_admin() or school_id::text = public.current_school_id()::text);

create policy "fees tenant isolation"
on public.fees
for all
using (public.is_super_admin() or school_id::text = public.current_school_id()::text)
with check (public.is_super_admin() or school_id::text = public.current_school_id()::text);

create policy "employees tenant isolation"
on public.employees
for all
using (public.is_super_admin() or school_id::text = public.current_school_id()::text)
with check (public.is_super_admin() or school_id::text = public.current_school_id()::text);

create policy "leaves tenant isolation"
on public.leaves
for all
using (public.is_super_admin() or school_id::text = public.current_school_id()::text)
with check (public.is_super_admin() or school_id::text = public.current_school_id()::text);

create policy "notifications tenant isolation"
on public.notifications
for all
using (public.is_super_admin() or school_id::text = public.current_school_id()::text)
with check (public.is_super_admin() or school_id::text = public.current_school_id()::text);

create policy "timetable adjustments tenant isolation"
on public.timetable_adjustments
for all
using (public.is_super_admin() or school_id::text = public.current_school_id()::text)
with check (public.is_super_admin() or school_id::text = public.current_school_id()::text);

create policy "salary tenant isolation"
on public.salary
for all
using (public.is_super_admin() or school_id::text = public.current_school_id()::text)
with check (public.is_super_admin() or school_id::text = public.current_school_id()::text);

create policy "staff attendance tenant isolation"
on public.staff_attendance
for all
using (public.is_super_admin() or school_id::text = public.current_school_id()::text)
with check (public.is_super_admin() or school_id::text = public.current_school_id()::text);

create policy "vehicles tenant isolation"
on public.vehicles
for all
using (public.is_super_admin() or school_id::text = public.current_school_id()::text)
with check (public.is_super_admin() or school_id::text = public.current_school_id()::text);

create policy "routes tenant isolation"
on public.routes
for all
using (public.is_super_admin() or school_id::text = public.current_school_id()::text)
with check (public.is_super_admin() or school_id::text = public.current_school_id()::text);

create policy "applicants tenant isolation"
on public.applicants
for all
using (public.is_super_admin() or school_id::text = public.current_school_id()::text)
with check (public.is_super_admin() or school_id::text = public.current_school_id()::text);

create policy "audit logs tenant isolation"
on public.audit_logs
for all
using (public.is_super_admin() or school_id::text = public.current_school_id()::text)
with check (public.is_super_admin() or school_id::text = public.current_school_id()::text);

insert into public.users (id, name, email, role, school_id)
values (
  '6ce5191c-b2f4-4d45-881c-6cac69ceb64b',
  'INDDIA ERP Super Admin',
  'superadmin@gmail.com',
  'super_admin',
  null
)
on conflict (id) do update
set
  name = excluded.name,
  email = excluded.email,
  role = excluded.role,
  school_id = excluded.school_id;

comment on table public.schools is 'Multi-tenant school registry for INDDIA ERP SaaS.';
comment on table public.subscriptions is 'School subscription ledger.';
comment on table public.payments is 'School billing payments ledger.';
comment on table public.users is 'Primary identity map for platform and school users.';
comment on table public.students is 'Student academic profile records linked to the users table.';
comment on table public.classes is 'Reusable class and section master data.';
comment on table public.holidays is 'School holiday calendar dates.';
comment on table public.staff is 'Staff metadata and teaching allocations.';
