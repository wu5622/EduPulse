import { useEffect, useState, type FormEvent } from "react";

import type {
  PublicClassroom,
  PublicClassroomMember,
} from "../../../types/publicApi";
import { DataGuard } from "../../../components/data/DataGuard";
import InstructorAssignmentCard from "../components/InstructorAssignmentCard";
import AssignScenarioModal from "../components/AssignScenarioModal";
import { demoteClassroomInstructor, promoteClassroomStudent,removeClassroomStudent, updateClassroom } from "../classroomMutations";
import { useInstructorClassroomData } from "../hooks/useClassroomData";

type InstructorTab = "assignments" | "students";

function formatJoinDate(value: string) {
  return new Date(value).toLocaleDateString(navigator.language || undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type InstructorClassroomProps = {
  classroom: PublicClassroom;
  classroomMembers: PublicClassroomMember[];
};

function InstructorClassroom({
  classroom,
  classroomMembers,
}: InstructorClassroomProps) {
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<InstructorTab>("assignments");
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(classroom.name);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [renameSubmitting, setRenameSubmitting] = useState(false);
  const [removingStudentId, setRemovingStudentId] = useState<string | null>(null);
  const [removeStudentError, setRemoveStudentError] = useState<string | null>(null);
  const [promotingStudentId, setPromotingStudentId] = useState<string | null>(null);
  const [promoteStudentError, setPromoteStudentError] = useState<string | null>(null);
  const [demotingInstructorId, setDemotingInstructorId] = useState<string | null>(null);
  const [demoteInstructorError, setDemoteInstructorError] = useState<string | null>(null);
  const instructorMembers = classroomMembers.filter(
    (member) => member.role === "instructor",
  );
  const studentMembers = classroomMembers.filter(
    (member) => member.role === "student",
  );
  const data = useInstructorClassroomData(
    classroom.id,
    studentMembers.map((member) => member.user_id),
  );
  const instructorSummary =
    instructorMembers.length === 1
      ? `${instructorMembers.length} instructor`
      : `${instructorMembers.length} instructors`;
  const summaryText =
    data.assignmentsGuard.kind === "loading"
      ? `${instructorSummary} | ${studentMembers.length} students | loading assignments`
      : `${instructorSummary} | ${studentMembers.length} students | ${data.currentAssignments.length} active assignments`;

  useEffect(() => {
    setRenameValue(classroom.name);
  }, [classroom.name]);

  async function handleRenameSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRenameError(null);

    const trimmedName = renameValue.trim();
    if (!trimmedName) {
      setRenameError("Classroom name is required.");
      return;
    }

    if (trimmedName === classroom.name) {
      setIsRenaming(false);
      return;
    }

    setRenameSubmitting(true);

    try {
      await updateClassroom({
        classroomId: classroom.id,
        name: trimmedName,
      });
      setIsRenaming(false);
    } catch (error) {
      setRenameError(
        error instanceof Error ? error.message : "Failed to rename classroom.",
      );
    } finally {
      setRenameSubmitting(false);
    }
  }

  async function handleRemoveStudent(student: PublicClassroomMember) {
    setRemoveStudentError(null);

    const confirmed = window.confirm(
      `Remove ${student.user_name} from "${classroom.name}"?\n\nThey will lose access to this classroom until they join again with a code.`,
    );
    if (!confirmed) {
      return;
    }

    setRemovingStudentId(student.user_id);

    try {
      await removeClassroomStudent({
        classroomId: classroom.id,
        userId: student.user_id,
      });
    } catch (error) {
      setRemoveStudentError(
        error instanceof Error ? error.message : "Failed to remove student.",
      );
    } finally {
      setRemovingStudentId(null);
    }
  }

  async function handlePromoteToInstructor(student: PublicClassroomMember) {
    setPromoteStudentError(null);

    const confirmed = window.confirm(
      `Promote ${student.user_name} to instructor in "${classroom.name}"?\n\nThey will gain instructor permissions for this classroom.`,
    );

    if (!confirmed) {
      return;
    }

    setPromotingStudentId(student.user_id);

    try {
      await promoteClassroomStudent({
        classroomId: classroom.id,
        userId: student.user_id,
      });
    } catch (error) {
      setPromoteStudentError(
        error instanceof Error ? error.message : "Failed to promote student.",
      );
    } finally {
      setPromotingStudentId(null);
    }
  }

  async function handleDemoteInstructor(instructor: PublicClassroomMember) {
  setDemoteInstructorError(null);

  const confirmed = window.confirm(
    `Remove instructor privileges from ${instructor.user_name}?\n\nThey will remain in the classroom as a student.`,
  );

  if (!confirmed) {
    return;
  }

  setDemotingInstructorId(instructor.user_id);

  try {
    await demoteClassroomInstructor({
      classroomId: classroom.id,
      userId: instructor.user_id,
    });
  } catch (error) {
    setDemoteInstructorError(
      error instanceof Error
        ? error.message
        : "Failed to remove instructor privileges.",
    );
  } finally {
    setDemotingInstructorId(null);
  }
}
  return (
    <>
      <section className="rounded-2xl border border-neutral-300 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-950/40">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400">
                Instructor Dashboard
              </p>
              <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300">
                Join code: {classroom.code ?? "N/A"}
              </p>
              <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300">
                Instructors:{" "}
                {instructorMembers.map((member) => member.user_name).join(", ") ||
                  "None"}
              </p>
              <p className="mt-2 text-lg text-neutral-700 dark:text-neutral-300">
                {summaryText}
              </p>
            </div>

            {isRenaming ? (
              <form
                onSubmit={handleRenameSubmit}
                className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/60"
              >
                <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
                  Classroom name
                  <input
                    type="text"
                    value={renameValue}
                    onChange={(event) => setRenameValue(event.target.value)}
                    disabled={renameSubmitting}
                    className="mt-2 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-cyan-500 dark:border-neutral-700 dark:bg-neutral-950"
                  />
                </label>

                {renameError ? (
                  <p className="mt-3 text-sm text-rose-600 dark:text-rose-300">
                    {renameError}
                  </p>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="submit"
                    disabled={renameSubmitting}
                    className="rounded-full bg-neutral-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-400 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400 dark:disabled:bg-neutral-700"
                  >
                    {renameSubmitting ? "Saving..." : "Save name"}
                  </button>
                  <button
                    type="button"
                    disabled={renameSubmitting}
                    onClick={() => {
                      setRenameValue(classroom.name);
                      setRenameError(null);
                      setIsRenaming(false);
                    }}
                    className="rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-800 transition hover:border-neutral-400 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100 dark:hover:border-neutral-600 dark:hover:bg-neutral-900"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setRenameValue(classroom.name);
                  setRenameError(null);
                  setIsRenaming(true);
                }}
                className="w-fit rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-800 transition hover:border-neutral-400 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100 dark:hover:border-neutral-600 dark:hover:bg-neutral-900"
              >
                Rename Classroom
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setAssignModalOpen(true)}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700"
          >
            + Assign Scenario
          </button>
        </div>

        <div className="mt-6 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex gap-6">
            <button
              type="button"
              onClick={() => setActiveTab("assignments")}
              className={`border-b-2 pb-3 text-sm font-semibold transition ${activeTab === "assignments"
                ? "border-cyan-500 text-cyan-700 dark:text-cyan-300"
                : "border-transparent text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
                }`}
            >
              Assignments
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("students")}
              className={`border-b-2 pb-3 text-sm font-semibold transition ${activeTab === "students"
                ? "border-cyan-500 text-cyan-700 dark:text-cyan-300"
                : "border-transparent text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
                }`}
            >
              Students
            </button>
          </div>
        </div>
      </section>

      {activeTab === "assignments" ? (
        <DataGuard state={data.assignmentsGuard}>
          <>
            {data.currentAssignments.length > 0 ? (
              <section className="mt-6">
                <h3 className="text-lg font-semibold">Current Assignments</h3>
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  {data.currentAssignments.map(({ assignment, completedCount }) => (
                    <InstructorAssignmentCard
                      key={assignment.id}
                      assignment={assignment}
                      classroomId={classroom.id}
                      completedCount={completedCount}
                      studentCount={studentMembers.length}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            {data.pastAssignments.length > 0 ? (
              <section className="mt-8">
                <h3 className="text-lg font-semibold">Past Assignments</h3>
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  {data.pastAssignments.map(({ assignment, completedCount }) => (
                    <InstructorAssignmentCard
                      key={assignment.id}
                      assignment={assignment}
                      classroomId={classroom.id}
                      completedCount={completedCount}
                      studentCount={studentMembers.length}
                    />
                  ))}
                </div>
              </section>
            ) : null}
          </>
        </DataGuard>
      ) : null}

      {activeTab === "students" ? (
        <section className="mt-6 space-y-6">
          <div className="rounded-2xl border border-neutral-300 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950/40">
            <div className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
              <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400">
                Instructors
              </h3>
            </div>
            {instructorMembers.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-800">
                  <thead className="bg-neutral-50 dark:bg-neutral-900/60">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400">
                        Instructor
                      </th>

                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400">
                        Joined
                      </th>

                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                    {instructorMembers.map((instructor) => (
                      <tr key={instructor.user_id}>
                        <td className="px-4 py-3 text-sm font-medium text-neutral-900 dark:text-neutral-100">
                          <div>{instructor.user_name}</div>
                          <div className="mt-1 text-xs font-normal text-neutral-500 dark:text-neutral-400">
                            {instructor.user_email}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-300">
                          {formatJoinDate(instructor.created_at)}
                        </td>

                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDemoteInstructor(instructor)}
                            disabled={demotingInstructorId === instructor.user_id}
                            className="rounded-full border border-amber-200 bg-white px-3 py-1.5 text-sm font-semibold text-amber-700 transition hover:border-amber-300 hover:bg-amber-50 disabled:cursor-not-allowed disabled:border-neutral-200 disabled:text-neutral-400 dark:border-amber-900/60 dark:bg-neutral-950 dark:text-amber-300 dark:hover:bg-amber-950/30 dark:disabled:border-neutral-800 dark:disabled:text-neutral-600"
                          >
                            {demotingInstructorId === instructor.user_id
                              ? "Removing..."
                              : "Remove Instructor"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-4 py-6 text-sm text-neutral-600 dark:text-neutral-300">
                No instructors found for this classroom.
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-neutral-300 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950/40">
            <div className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
              <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400">
                Students
              </h3>
              {(demoteInstructorError || removeStudentError || promoteStudentError) ? (
                <div className="mt-2 space-y-1">

                  {demoteInstructorError ? (
                    <p className="text-sm normal-case tracking-normal text-rose-600 dark:text-rose-300">
                      {demoteInstructorError}
                    </p>
                  ) : null}

                  {removeStudentError ? (
                    <p className="text-sm normal-case tracking-normal text-rose-600 dark:text-rose-300">
                      {removeStudentError}
                    </p>
                  ) : null}

                  {promoteStudentError ? (
                    <p className="text-sm normal-case tracking-normal text-rose-600 dark:text-rose-300">
                      {promoteStudentError}
                    </p>
                  ) : null}

                </div>
              ) : null}
            </div>
            {studentMembers.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-800">
                  <thead className="bg-neutral-50 dark:bg-neutral-900/60">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400">
                        Student
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400">
                        Joined
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                    {studentMembers.map((student) => (
                      <tr key={student.user_id}>
                        <td className="px-4 py-3 text-sm font-medium text-neutral-900 dark:text-neutral-100">
                          <div>{student.user_name}</div>
                          <div className="mt-1 text-xs font-normal text-neutral-500 dark:text-neutral-400">
                            {student.user_email}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-300">
                          {formatJoinDate(student.created_at)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handlePromoteToInstructor(student)}
                            disabled={promotingStudentId === student.user_id}
                            className="rounded-full border border-blue-200 bg-white px-3 py-1.5 text-sm font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-50 disabled:cursor-not-allowed disabled:border-neutral-200 disabled:text-neutral-400 dark:border-blue-900/60 dark:bg-neutral-950 dark:text-blue-300 dark:hover:bg-blue-950/30 dark:disabled:border-neutral-800 dark:disabled:text-neutral-600"
                          >
                            {promotingStudentId === student.user_id
                              ? "Promoting..."
                              : "Promote"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveStudent(student)}
                            disabled={removingStudentId === student.user_id}
                            className="rounded-full border border-rose-200 bg-white px-3 py-1.5 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:border-neutral-200 disabled:text-neutral-400 dark:border-rose-900/60 dark:bg-neutral-950 dark:text-rose-300 dark:hover:bg-rose-950/30 dark:disabled:border-neutral-800 dark:disabled:text-neutral-600"
                          >
                            {removingStudentId === student.user_id
                              ? "Removing..."
                              : "Remove"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-4 py-6 text-sm text-neutral-600 dark:text-neutral-300">
                No students have joined this classroom yet.
              </div>
            )}
          </div>
        </section>
      ) : null}

      {assignModalOpen ? (
        <AssignScenarioModal
          classroomId={classroom.id}
          onAssigned={data.refetch}
          onClose={() => setAssignModalOpen(false)}
        />
      ) : null}
    </>
  );
}

export default InstructorClassroom;
