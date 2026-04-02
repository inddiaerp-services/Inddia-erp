import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

type RequestBody = {
  action: string;
  payload: Record<string, unknown>;
};

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });

const service = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const getUserClient = (authHeader: string) =>
  createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

const cleanupUser = async (userId?: string) => {
  if (!userId) return;
  await service.auth.admin.deleteUser(userId);
};

const cleanupTable = async (table: string, column: string, value?: string) => {
  if (!value) return;
  await service.from(table).delete().eq(column, value);
};

const toOptionalText = (value: unknown) => {
  const trimmed = String(value ?? "").trim();
  return trimmed || null;
};

const toOptionalNumber = (value: unknown, label: string) => {
  const normalized = String(value ?? "").trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${label} must be a valid non-negative number.`);
  }
  return parsed;
};

const ensureClassSectionExists = async (schoolId: string, className: string, section: string) => {
  const { data, error } = await service
    .from("classes")
    .select("id")
    .eq("school_id", schoolId)
    .eq("class_name", className)
    .eq("section", section)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Selected class and section do not exist. Create them first in Classes.");
};

const requireAdmin = async (authHeader: string) => {
  const userClient = getUserClient(authHeader);
  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) {
    throw new Error("Unauthorized.");
  }

  const { data: profile, error: profileError } = await service
    .from("users")
    .select("id, role, email")
    .or(`id.eq.${user.id},email.eq.${(user.email ?? "").toLowerCase()}`)
    .eq("role", "admin")
    .maybeSingle();

  if (profileError || !profile || profile.role !== "admin") {
    throw new Error("Admin access is required.");
  }

  return user;
};

const normalizeStaffWorkspace = (role: string | null | undefined) => {
  const value = String(role ?? "").trim().toLowerCase();
  if (value.includes("human") || value === "hr") return "hr";
  if (value.includes("account") || value.includes("finance")) return "accounts";
  if (value.includes("transport")) return "transport";
  if (value.includes("admission")) return "admission";
  return "teacher";
};

const requireAdminOrWorkspace = async (authHeader: string, allowedWorkspaces: string[]) => {
  const userClient = getUserClient(authHeader);
  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) {
    throw new Error("Unauthorized.");
  }

  const { data: profile, error: profileError } = await service
    .from("users")
    .select("id, role, email")
    .or(`id.eq.${user.id},email.eq.${(user.email ?? "").toLowerCase()}`)
    .maybeSingle();

  if (profileError || !profile) {
    throw new Error(profileError?.message ?? "User profile not found.");
  }

  if (String(profile.role ?? "").toLowerCase() === "admin") {
    return user;
  }

  if (String(profile.role ?? "").toLowerCase() !== "staff") {
    throw new Error("You don't have permission for this action.");
  }

  const { data: staff, error: staffError } = await service
    .from("staff")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (staffError || !staff) {
    throw new Error(staffError?.message ?? "Staff profile not found.");
  }

  if (!allowedWorkspaces.includes(normalizeStaffWorkspace(staff.role))) {
    throw new Error("You don't have permission for this action.");
  }

  return user;
};

const createSubject = async (payload: Record<string, unknown>) => {
  const name = String(payload.name ?? "").trim();
  if (!name) throw new Error("Subject name is required.");

  const { data, error } = await service.from("subjects").insert({ name }).select("id, name").single();
  if (error) throw new Error(error.message);
  return data;
};

const updateSubject = async (payload: Record<string, unknown>) => {
  const id = String(payload.id ?? "");
  const name = String(payload.name ?? "").trim();
  if (!id || !name) throw new Error("Subject id and name are required.");

  const { data, error } = await service
    .from("subjects")
    .update({ name })
    .eq("id", id)
    .select("id, name")
    .single();

  if (error) throw new Error(error.message);
  return data;
};

const deleteSubject = async (payload: Record<string, unknown>) => {
  const id = String(payload.id ?? "");
  if (!id) throw new Error("Subject id is required.");

  const { error } = await service.from("subjects").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return null;
};

const createStaff = async (payload: Record<string, unknown>) => {
  const name = String(payload.name ?? "").trim();
  const email = String(payload.email ?? "").trim().toLowerCase();
  const photoUrl = String(payload.photoUrl ?? "").trim() || null;
  const password = String(payload.password ?? "");
  const role = String(payload.role ?? "").trim() || "Teacher";
  const subjectId = String(payload.subjectId ?? "").trim() || null;
  const assignedClass = String(payload.assignedClass ?? "").trim() || null;
  const assignedSection = String(payload.assignedSection ?? "").trim() || null;
  const isClassCoordinator = Boolean(payload.isClassCoordinator);

  if (!name || !email || !password) {
    throw new Error("Name, email, and password are required.");
  }

  const { data: authUser, error: authError } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      name,
      role: "staff",
    },
  });

  if (authError || !authUser.user) {
    throw new Error(authError?.message ?? "Unable to create staff auth user.");
  }

  try {
    const { error: userError } = await service.from("users").insert({
      id: authUser.user.id,
      name,
      email,
      role: "staff",
      school_id: null,
      photo_url: photoUrl,
    });

    if (userError) throw new Error(userError.message);

    const { data: staffRow, error: staffError } = await service
      .from("staff")
      .insert({
        user_id: authUser.user.id,
        name,
        role,
        subject_id: subjectId,
        is_class_coordinator: isClassCoordinator,
        assigned_class: assignedClass,
        assigned_section: assignedSection,
      })
      .select("id")
      .single();

    if (staffError || !staffRow) throw new Error(staffError?.message ?? "Unable to create staff record.");

    return {
      id: staffRow.id,
      userId: authUser.user.id,
      name,
      email,
      photoUrl,
      role,
      subjectId,
      subjectName: null,
      assignedClass,
      assignedSection,
      isClassCoordinator,
    };
  } catch (error) {
    await cleanupTable("staff", "user_id", authUser.user.id);
    await cleanupTable("users", "id", authUser.user.id);
    await cleanupUser(authUser.user.id);
    throw error;
  }
};

const updateStaff = async (payload: Record<string, unknown>) => {
  const id = String(payload.id ?? "");
  const userId = String(payload.userId ?? "");
  const name = String(payload.name ?? "").trim();
  const email = String(payload.email ?? "").trim().toLowerCase();
  const photoUrl = String(payload.photoUrl ?? "").trim() || null;
  const password = String(payload.password ?? "");
  const role = String(payload.role ?? "").trim() || "Teacher";
  const subjectId = String(payload.subjectId ?? "").trim() || null;
  const assignedClass = String(payload.assignedClass ?? "").trim() || null;
  const assignedSection = String(payload.assignedSection ?? "").trim() || null;
  const isClassCoordinator = Boolean(payload.isClassCoordinator);

  if (!id || !userId || !name || !email) {
    throw new Error("Staff id, user id, name, and email are required.");
  }

  const updates: { email?: string; password?: string; user_metadata: Record<string, string> } = {
    user_metadata: {
      name,
      role: "staff",
    },
  };

  if (email) updates.email = email;
  if (password) updates.password = password;

  const { error: authError } = await service.auth.admin.updateUserById(userId, updates);
  if (authError) throw new Error(authError.message);

  const { error: userError } = await service
    .from("users")
    .update({ name, email, role: "staff", photo_url: photoUrl })
    .eq("id", userId);
  if (userError) throw new Error(userError.message);

  const { error: staffError } = await service
    .from("staff")
    .update({
      name,
      role,
      subject_id: subjectId,
      is_class_coordinator: isClassCoordinator,
      assigned_class: assignedClass,
      assigned_section: assignedSection,
    })
    .eq("id", id);

  if (staffError) throw new Error(staffError.message);

  return {
    id,
    userId,
    name,
    email,
    photoUrl,
    role,
    subjectId,
    subjectName: null,
    assignedClass,
    assignedSection,
    isClassCoordinator,
  };
};

const deleteStaff = async (payload: Record<string, unknown>) => {
  const id = String(payload.id ?? "");
  if (!id) throw new Error("Staff id is required.");

  const { data: staffRow, error: staffError } = await service
    .from("staff")
    .select("id, user_id")
    .eq("id", id)
    .single();

  if (staffError || !staffRow) throw new Error(staffError?.message ?? "Staff member not found.");

  const { error: deleteStaffError } = await service.from("staff").delete().eq("id", id);
  if (deleteStaffError) throw new Error(deleteStaffError.message);

  await cleanupTable("users", "id", staffRow.user_id);
  await cleanupUser(staffRow.user_id);
  return null;
};

const createStudentBundle = async (payload: Record<string, unknown>) => {
  const studentName = String(payload.studentName ?? "").trim();
  const photoUrl = String(payload.photoUrl ?? "").trim() || null;
  const schoolId = String(payload.schoolId ?? "").trim();
  const className = String(payload.className ?? "").trim();
  const section = String(payload.section ?? "").trim();
  const admissionDate = toOptionalText(payload.admissionDate);
  const discountFee = toOptionalNumber(payload.discountFee, "Discount fee");
  const studentAadharNumber = toOptionalText(payload.studentAadharNumber);
  const studentPassword = String(payload.studentPassword ?? "");
  const dateOfBirth = toOptionalText(payload.dateOfBirth);
  const birthId = toOptionalText(payload.birthId);
  const isOrphan = Boolean(payload.isOrphan);
  const gender = toOptionalText(payload.gender);
  const caste = toOptionalText(payload.caste);
  const osc = toOptionalText(payload.osc);
  const identificationMark = toOptionalText(payload.identificationMark);
  const previousSchool = toOptionalText(payload.previousSchool);
  const region = toOptionalText(payload.region);
  const bloodGroup = toOptionalText(payload.bloodGroup);
  const previousBoardRollNo = toOptionalText(payload.previousBoardRollNo);
  const address = toOptionalText(payload.address);
  const fatherName = String(payload.fatherName ?? "").trim();
  const fatherAadharNumber = toOptionalText(payload.fatherAadharNumber);
  const fatherOccupation = toOptionalText(payload.fatherOccupation);
  const fatherEducation = toOptionalText(payload.fatherEducation);
  const fatherMobileNumber = String(payload.fatherMobileNumber ?? "").trim();
  const fatherProfession = toOptionalText(payload.fatherProfession);
  const fatherIncome = toOptionalNumber(payload.fatherIncome, "Father income");
  const fatherEmail = String(payload.fatherEmail ?? "").trim().toLowerCase();
  const fatherPassword = String(payload.fatherPassword ?? "");
  const motherName = toOptionalText(payload.motherName);
  const motherAadharNumber = toOptionalText(payload.motherAadharNumber);
  const motherOccupation = toOptionalText(payload.motherOccupation);
  const motherEducation = toOptionalText(payload.motherEducation);
  const motherMobileNumber = toOptionalText(payload.motherMobileNumber);
  const motherProfession = toOptionalText(payload.motherProfession);
  const motherIncome = toOptionalNumber(payload.motherIncome, "Mother income");
  const studentEmail = `${schoolId.toLowerCase()}@students.inddiaerp.local`;

  if (
    !studentName ||
    !schoolId ||
    !className ||
    !section ||
    !studentPassword ||
    !fatherName ||
    !fatherEmail ||
    !fatherMobileNumber ||
    !fatherPassword
  ) {
    throw new Error("Student details and required father account fields are required.");
  }

  await ensureClassSectionExists(schoolId, className, section);

  let parentUserId: string | undefined;
  let parentId: string | undefined;
  let studentUserId: string | undefined;

  try {
    const { data: parentAuth, error: parentAuthError } = await service.auth.admin.createUser({
      email: fatherEmail,
      password: fatherPassword,
      email_confirm: true,
      user_metadata: {
        name: fatherName,
        role: "parent",
      },
    });

    if (parentAuthError || !parentAuth.user) {
      throw new Error(parentAuthError?.message ?? "Unable to create parent auth user.");
    }

    parentUserId = parentAuth.user.id;

    const { error: parentUserError } = await service.from("users").insert({
      id: parentUserId,
      name: fatherName,
      email: fatherEmail,
      role: "parent",
      school_id: null,
    });
    if (parentUserError) throw new Error(parentUserError.message);

    const { data: parentRow, error: parentInsertError } = await service
      .from("parents")
      .insert({
        user_id: parentUserId,
        name: fatherName,
        email: fatherEmail,
        phone: fatherMobileNumber,
        father_name: fatherName,
        father_aadhar_number: fatherAadharNumber,
        father_occupation: fatherOccupation,
        father_education: fatherEducation,
        father_mobile_number: fatherMobileNumber,
        father_profession: fatherProfession,
        father_income: fatherIncome,
        mother_name: motherName,
        mother_aadhar_number: motherAadharNumber,
        mother_occupation: motherOccupation,
        mother_education: motherEducation,
        mother_mobile_number: motherMobileNumber,
        mother_profession: motherProfession,
        mother_income: motherIncome,
      })
      .select("id")
      .single();

    if (parentInsertError || !parentRow) {
      throw new Error(parentInsertError?.message ?? "Unable to create parent record.");
    }

    parentId = parentRow.id;

    const { data: studentAuth, error: studentAuthError } = await service.auth.admin.createUser({
      email: studentEmail,
      password: studentPassword,
      email_confirm: true,
      user_metadata: {
        name: studentName,
        role: "student",
        school_id: schoolId,
      },
    });

    if (studentAuthError || !studentAuth.user) {
      throw new Error(studentAuthError?.message ?? "Unable to create student auth user.");
    }

    studentUserId = studentAuth.user.id;

    const { error: studentUserError } = await service.from("users").insert({
      id: studentUserId,
      name: studentName,
      email: studentEmail,
      role: "student",
      school_id: schoolId,
      photo_url: photoUrl,
    });
    if (studentUserError) throw new Error(studentUserError.message);

    const { data: studentRow, error: studentInsertError } = await service
      .from("students")
      .insert({
        user_id: studentUserId,
        name: studentName,
        student_code: schoolId,
        class: className,
        section,
        admission_date: admissionDate,
        discount_fee: discountFee,
        aadhar_number: studentAadharNumber,
        date_of_birth: dateOfBirth,
        birth_id: birthId,
        is_orphan: isOrphan,
        gender,
        caste,
        osc,
        identification_mark: identificationMark,
        previous_school: previousSchool,
        region,
        blood_group: bloodGroup,
        previous_board_roll_no: previousBoardRollNo,
        address,
        parent_id: parentId,
      })
      .select("id")
      .single();

    if (studentInsertError || !studentRow) {
      throw new Error(studentInsertError?.message ?? "Unable to create student record.");
    }

    return {
      id: studentRow.id,
      userId: studentUserId,
      name: studentName,
      photoUrl,
      schoolId,
      className,
      section,
      admissionDate,
      discountFee,
      studentAadharNumber,
      dateOfBirth,
      birthId,
      isOrphan,
      gender,
      caste,
      osc,
      identificationMark,
      previousSchool,
      region,
      bloodGroup,
      previousBoardRollNo,
      address,
      parentId,
      parentUserId,
      parentName: fatherName,
      parentEmail: fatherEmail,
      parentPhone: fatherMobileNumber,
      fatherName,
      fatherAadharNumber,
      fatherOccupation,
      fatherEducation,
      fatherMobileNumber,
      fatherProfession,
      fatherIncome,
      fatherEmail,
      motherName,
      motherAadharNumber,
      motherOccupation,
      motherEducation,
      motherMobileNumber,
      motherProfession,
      motherIncome,
    };
  } catch (error) {
    await cleanupTable("students", "user_id", studentUserId);
    await cleanupTable("users", "id", studentUserId);
    await cleanupUser(studentUserId);
    await cleanupTable("parents", "id", parentId);
    await cleanupTable("users", "id", parentUserId);
    await cleanupUser(parentUserId);
    throw error;
  }
};

const updateStudentBundle = async (payload: Record<string, unknown>) => {
  const id = String(payload.id ?? "");
  const userId = String(payload.userId ?? "");
  const parentId = String(payload.parentId ?? "");
  const parentUserId = String(payload.parentUserId ?? "");
  const studentName = String(payload.studentName ?? "").trim();
  const photoUrl = String(payload.photoUrl ?? "").trim() || null;
  const schoolId = String(payload.schoolId ?? "").trim();
  const className = String(payload.className ?? "").trim();
  const section = String(payload.section ?? "").trim();
  const admissionDate = toOptionalText(payload.admissionDate);
  const discountFee = toOptionalNumber(payload.discountFee, "Discount fee");
  const studentAadharNumber = toOptionalText(payload.studentAadharNumber);
  const studentPassword = String(payload.studentPassword ?? "");
  const dateOfBirth = toOptionalText(payload.dateOfBirth);
  const birthId = toOptionalText(payload.birthId);
  const isOrphan = Boolean(payload.isOrphan);
  const gender = toOptionalText(payload.gender);
  const caste = toOptionalText(payload.caste);
  const osc = toOptionalText(payload.osc);
  const identificationMark = toOptionalText(payload.identificationMark);
  const previousSchool = toOptionalText(payload.previousSchool);
  const region = toOptionalText(payload.region);
  const bloodGroup = toOptionalText(payload.bloodGroup);
  const previousBoardRollNo = toOptionalText(payload.previousBoardRollNo);
  const address = toOptionalText(payload.address);
  const fatherName = String(payload.fatherName ?? "").trim();
  const fatherAadharNumber = toOptionalText(payload.fatherAadharNumber);
  const fatherOccupation = toOptionalText(payload.fatherOccupation);
  const fatherEducation = toOptionalText(payload.fatherEducation);
  const fatherMobileNumber = String(payload.fatherMobileNumber ?? "").trim();
  const fatherProfession = toOptionalText(payload.fatherProfession);
  const fatherIncome = toOptionalNumber(payload.fatherIncome, "Father income");
  const fatherEmail = String(payload.fatherEmail ?? "").trim().toLowerCase();
  const fatherPassword = String(payload.fatherPassword ?? "");
  const motherName = toOptionalText(payload.motherName);
  const motherAadharNumber = toOptionalText(payload.motherAadharNumber);
  const motherOccupation = toOptionalText(payload.motherOccupation);
  const motherEducation = toOptionalText(payload.motherEducation);
  const motherMobileNumber = toOptionalText(payload.motherMobileNumber);
  const motherProfession = toOptionalText(payload.motherProfession);
  const motherIncome = toOptionalNumber(payload.motherIncome, "Mother income");
  const studentEmail = `${schoolId.toLowerCase()}@students.inddiaerp.local`;

  if (!id || !userId || !parentId || !parentUserId) {
    throw new Error("Student and parent identifiers are required.");
  }

  if (!studentName || !schoolId || !className || !section || !fatherName || !fatherEmail || !fatherMobileNumber) {
    throw new Error("Student details and required father account fields are required.");
  }

  await ensureClassSectionExists(schoolId, className, section);

  const studentAuthUpdate: { email?: string; password?: string; user_metadata: Record<string, string> } = {
    email: studentEmail,
    user_metadata: {
      name: studentName,
      role: "student",
      school_id: schoolId,
    },
  };

  if (studentPassword) {
    studentAuthUpdate.password = studentPassword;
  }

  const parentAuthUpdate: { email?: string; password?: string; user_metadata: Record<string, string> } = {
    email: fatherEmail,
    user_metadata: {
      name: fatherName,
      role: "parent",
    },
  };

  if (fatherPassword) {
    parentAuthUpdate.password = fatherPassword;
  }

  const { error: parentAuthError } = await service.auth.admin.updateUserById(parentUserId, parentAuthUpdate);
  if (parentAuthError) throw new Error(parentAuthError.message);

  const { error: studentAuthError } = await service.auth.admin.updateUserById(userId, studentAuthUpdate);
  if (studentAuthError) throw new Error(studentAuthError.message);

  const { error: parentUserError } = await service
    .from("users")
    .update({ name: fatherName, email: fatherEmail, role: "parent" })
    .eq("id", parentUserId);
  if (parentUserError) throw new Error(parentUserError.message);

  const { error: parentRecordError } = await service
    .from("parents")
    .update({
      name: fatherName,
      email: fatherEmail,
      phone: fatherMobileNumber,
      father_name: fatherName,
      father_aadhar_number: fatherAadharNumber,
      father_occupation: fatherOccupation,
      father_education: fatherEducation,
      father_mobile_number: fatherMobileNumber,
      father_profession: fatherProfession,
      father_income: fatherIncome,
      mother_name: motherName,
      mother_aadhar_number: motherAadharNumber,
      mother_occupation: motherOccupation,
      mother_education: motherEducation,
      mother_mobile_number: motherMobileNumber,
      mother_profession: motherProfession,
      mother_income: motherIncome,
    })
    .eq("id", parentId);
  if (parentRecordError) throw new Error(parentRecordError.message);

  const { error: studentUserError } = await service
    .from("users")
    .update({ name: studentName, email: studentEmail, role: "student", school_id: schoolId, photo_url: photoUrl })
    .eq("id", userId);
  if (studentUserError) throw new Error(studentUserError.message);

  const { error: studentRecordError } = await service
    .from("students")
    .update({
      name: studentName,
      student_code: schoolId,
      class: className,
      section,
      admission_date: admissionDate,
      discount_fee: discountFee,
      aadhar_number: studentAadharNumber,
      date_of_birth: dateOfBirth,
      birth_id: birthId,
      is_orphan: isOrphan,
      gender,
      caste,
      osc,
      identification_mark: identificationMark,
      previous_school: previousSchool,
      region,
      blood_group: bloodGroup,
      previous_board_roll_no: previousBoardRollNo,
      address,
      parent_id: parentId,
    })
    .eq("id", id);
  if (studentRecordError) throw new Error(studentRecordError.message);

  return {
    id,
    userId,
    name: studentName,
    photoUrl,
    schoolId,
    className,
    section,
    admissionDate,
    discountFee,
    studentAadharNumber,
    dateOfBirth,
    birthId,
    isOrphan,
    gender,
    caste,
    osc,
    identificationMark,
    previousSchool,
    region,
    bloodGroup,
    previousBoardRollNo,
    address,
    parentId,
    parentUserId,
    parentName: fatherName,
    parentEmail: fatherEmail,
    parentPhone: fatherMobileNumber,
    fatherName,
    fatherAadharNumber,
    fatherOccupation,
    fatherEducation,
    fatherMobileNumber,
    fatherProfession,
    fatherIncome,
    fatherEmail,
    motherName,
    motherAadharNumber,
    motherOccupation,
    motherEducation,
    motherMobileNumber,
    motherProfession,
    motherIncome,
  };
};

const deleteStudentBundle = async (payload: Record<string, unknown>) => {
  const id = String(payload.id ?? "");
  if (!id) throw new Error("Student id is required.");

  const { data: student, error: studentError } = await service
    .from("students")
    .select("id, user_id, parent_id")
    .eq("id", id)
    .single();

  if (studentError || !student) throw new Error(studentError?.message ?? "Student not found.");

  let parentUserId: string | undefined;

  if (student.parent_id) {
    const { data: parent } = await service
      .from("parents")
      .select("id, user_id")
      .eq("id", student.parent_id)
      .single();
    parentUserId = parent?.user_id ?? undefined;
  }

  const { error: deleteStudentError } = await service.from("students").delete().eq("id", id);
  if (deleteStudentError) throw new Error(deleteStudentError.message);

  await cleanupTable("users", "id", student.user_id);
  await cleanupUser(student.user_id);

  if (student.parent_id) {
    await cleanupTable("parents", "id", student.parent_id);
  }

  if (parentUserId) {
    await cleanupTable("users", "id", parentUserId);
    await cleanupUser(parentUserId);
  }

  return null;
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader) {
      return json(401, { error: "Missing authorization header." });
    }

    const { action, payload } = (await request.json()) as RequestBody;

    if (action === "create_student_bundle") {
      await requireAdminOrWorkspace(authHeader, ["admission"]);
    } else {
      await requireAdmin(authHeader);
    }

    switch (action) {
      case "create_subject":
        return json(200, { data: await createSubject(payload) });
      case "update_subject":
        return json(200, { data: await updateSubject(payload) });
      case "delete_subject":
        return json(200, { data: await deleteSubject(payload) });
      case "create_staff":
        return json(200, { data: await createStaff(payload) });
      case "update_staff":
        return json(200, { data: await updateStaff(payload) });
      case "delete_staff":
        return json(200, { data: await deleteStaff(payload) });
      case "create_student_bundle":
        return json(200, { data: await createStudentBundle(payload) });
      case "update_student_bundle":
        return json(200, { data: await updateStudentBundle(payload) });
      case "delete_student_bundle":
        return json(200, { data: await deleteStudentBundle(payload) });
      default:
        return json(400, { error: "Unsupported action." });
    }
  } catch (error) {
    return json(400, {
      error: error instanceof Error ? error.message : "Unexpected error.",
    });
  }
});
