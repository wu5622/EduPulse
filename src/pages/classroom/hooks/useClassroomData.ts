import { useState } from "react";

import {
  useAssignment,
  useAssignmentAttempts,
  useAttempt,
  useAttemptResponses,
  useAttempts,
  useClassroom,
  useClassrooms,
  useClassroomAssignments,
  useClassroomMembers,
  useResponse,
} from "../../../lib/usePublicApiHooks";
import { toUuidOrNull } from "../../../lib/uuid";
import type {
  PublicAssignment,
  PublicAttempt,
  PublicClassroom,
  PublicClassroomMember,
  PublicClassroomRole,
  PublicResponse,
} from "../../../types/publicApi";
import type { DataGuardState } from "../../../components/data/DataGuard";

type AssignmentViewerRole = PublicClassroomRole | null;
export type AssignmentProgressState =
  | "not_started"
  | "in_progress"
  | "completed";

type InstructorAssignmentCard = {
  assignment: PublicAssignment;
  completedCount: number;
};

export type InstructorStudentAttemptGroup = {
  student: PublicClassroomMember;
  attempts: PublicAttempt[];
  latestAttempt: PublicAttempt | null;
  preferredAttempt: PublicAttempt | null;
  inProgressAttempt: PublicAttempt | null;
  status: AssignmentProgressState;
  lastActivityAt: string | null;
};

export type ClassroomPageData = {
  classroom: PublicClassroom | null;
  members: PublicClassroomMember[];
  guard: DataGuardState;
};

export type StudentClassroomData = {
  assignments: PublicAssignment[];
  assignmentsGuard: DataGuardState;
};

export type InstructorClassroomData = {
  currentAssignments: InstructorAssignmentCard[];
  pastAssignments: InstructorAssignmentCard[];
  assignmentsGuard: DataGuardState;
  refetch: () => void;
};

export type ClassroomListData = {
  classrooms: PublicClassroom[];
  guard: DataGuardState;
};

export type AssignmentDetailData = {
  classroomId: string | null;
  assignmentId: string | null;
  assignment: PublicAssignment | null;
  role: AssignmentViewerRole;
  guard: DataGuardState;
  attemptsGuard: DataGuardState;
  submissionsGuard: DataGuardState;
  attempts: PublicAttempt[];
  latestAttempt: PublicAttempt | null;
  inProgressAttempt: PublicAttempt | null;
  studentAttemptGroups: InstructorStudentAttemptGroup[];
  isOpen: boolean;
  isClosed: boolean;
  attemptsUsed: number;
  attemptsRemaining: number | null;
  hasRunnableAttempt: boolean;
  canStartNewAttempt: boolean;
  runnerLink: string | null;
};

export type AttemptDetailData = {
  attemptId: string | null;
  attempt: PublicAttempt | null;
  guard: DataGuardState;
  responsesGuard: DataGuardState;
  responses: PublicResponse[];
};

export type ResponseDetailData = {
  classroomId: string | null;
  assignmentId: string | null;
  attemptId: string | null;
  responseId: string | null;
  response: PublicResponse | null;
  guard: DataGuardState;
};

export type ClassroomMemberDetailData = {
  userId: string | null;
  member: PublicClassroomMember | null;
  guard: DataGuardState;
};

const CONTENT_GUARD: DataGuardState = { kind: "content" };

function getFirstError(...errors: Array<string | null>) {
  return errors.find((error) => Boolean(error)) ?? null;
}

function compareAssignments(left: PublicAssignment, right: PublicAssignment) {
  const leftTime = left.due_at
    ? new Date(left.due_at).getTime()
    : Number.MAX_SAFE_INTEGER;
  const rightTime = right.due_at
    ? new Date(right.due_at).getTime()
    : Number.MAX_SAFE_INTEGER;

  if (leftTime === rightTime) {
    return left.title.localeCompare(right.title);
  }

  return leftTime - rightTime;
}

function compareClassroomMembers(
  left: PublicClassroomMember,
  right: PublicClassroomMember,
) {
  const nameComparison = left.user_name.localeCompare(right.user_name);
  if (nameComparison !== 0) {
    return nameComparison;
  }

  return left.user_email.localeCompare(right.user_email);
}

function getAssignmentProgressPriority(status: AssignmentProgressState) {
  switch (status) {
    case "completed":
      return 0;
    case "in_progress":
      return 1;
    case "not_started":
      return 2;
  }
}

function compareInstructorStudentAttemptGroups(
  left: InstructorStudentAttemptGroup,
  right: InstructorStudentAttemptGroup,
) {
  const priorityDifference =
    getAssignmentProgressPriority(left.status) -
    getAssignmentProgressPriority(right.status);

  if (priorityDifference !== 0) {
    return priorityDifference;
  }

  return compareClassroomMembers(left.student, right.student);
}

function compareAttempts(left: PublicAttempt, right: PublicAttempt) {
  return right.attempt_number - left.attempt_number;
}

function compareResponsesOldestFirst(left: PublicResponse, right: PublicResponse) {
  const timeDifference =
    new Date(left.created_at).getTime() - new Date(right.created_at).getTime();

  if (timeDifference !== 0) {
    return timeDifference;
  }

  return left.id.localeCompare(right.id);
}

function isPastAssignment(assignment: PublicAssignment, now: number) {
  if (assignment.close_at) {
    return new Date(assignment.close_at).getTime() < now;
  }

  if (assignment.due_at) {
    return new Date(assignment.due_at).getTime() < now;
  }

  return false;
}

function getAssignmentProgress(
  assignmentId: string,
  attempts: PublicAttempt[],
  activeStudentIds?: Set<string>,
) {
  const submittedStudentIds = new Set<string>();

  attempts.forEach((attempt) => {
    if (attempt.assignment_id !== assignmentId) {
      return;
    }

    if (activeStudentIds && !activeStudentIds.has(attempt.student_user_id)) {
      return;
    }

    if (attempt.status === "submitted") {
      submittedStudentIds.add(attempt.student_user_id);
    }
  });

  return {
    completedCount: submittedStudentIds.size,
  };
}

function getStudentAttemptStatus(
  attempts: PublicAttempt[],
): AssignmentProgressState {
  if (attempts.some((attempt) => attempt.status === "submitted")) {
    return "completed";
  }

  if (attempts.some((attempt) => attempt.status === "in_progress")) {
    return "in_progress";
  }

  return attempts.length > 0 ? "completed" : "not_started";
}

function createCollectionGuard({
  unauthorized,
  loading,
  error,
  onRetry,
  itemCount,
  emptyMessage,
}: {
  unauthorized: boolean;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  itemCount: number;
  emptyMessage?: string;
}): DataGuardState {
  if (unauthorized) {
    return { kind: "unauthorized" };
  }

  if (loading) {
    return { kind: "loading" };
  }

  if (error) {
    return {
      kind: "error",
      message: error,
      onRetry,
    };
  }

  if (emptyMessage && itemCount === 0) {
    return {
      kind: "empty",
      message: emptyMessage,
    };
  }

  return CONTENT_GUARD;
}

export function useClassroomPageData(
  classroomId: string | null | undefined,
): ClassroomPageData {
  const validClassroomId = toUuidOrNull(classroomId);
  const classroom = useClassroom(validClassroomId);
  const members = useClassroomMembers(validClassroomId);
  const classroomItem = classroom.item;
  const memberItems = members.items;
  const role = classroomItem?.viewer_role ?? null;

  let guard: DataGuardState = CONTENT_GUARD;

  if (!validClassroomId) {
    guard = {
      kind: "invalid",
      message: "The classroom ID in the URL is invalid.",
    };
  } else if (classroom.unauthorized || members.unauthorized) {
    guard = { kind: "unauthorized" };
  } else if (classroom.loading || members.loading) {
    guard = { kind: "loading" };
  } else {
    const baseError = getFirstError(classroom.error, members.error);

    if (baseError) {
      guard = {
        kind: "error",
        message: baseError,
        onRetry: () => {
          classroom.refetch();
          members.refetch();
        },
      };
    } else if (!classroomItem) {
      guard = {
        kind: "empty",
        message: "Classroom not found.",
      };
    } else if (!role) {
      guard = {
        kind: "error",
        message: "We couldn't determine your role in this classroom.",
      };
    }
  }

  return {
    classroom: classroomItem,
    members: memberItems,
    guard,
  };
}

export function useStudentClassroomData(
  classroomId: string | null | undefined,
): StudentClassroomData {
  const assignments = useClassroomAssignments(classroomId);
  const sortedAssignments = [...assignments.items].sort(compareAssignments);

  return {
    assignments: sortedAssignments,
    assignmentsGuard: createCollectionGuard({
      unauthorized: assignments.unauthorized,
      loading: assignments.loading,
      error: assignments.error,
      onRetry: assignments.refetch,
      itemCount: sortedAssignments.length,
      emptyMessage: "No assignments found for this classroom.",
    }),
  };
}

export function useInstructorClassroomData(
  classroomId: string | null | undefined,
  currentStudentIds?: string[],
): InstructorClassroomData {
  const [pageLoadedAt] = useState(() => Date.now());
  const validClassroomId = toUuidOrNull(classroomId);
  const assignments = useClassroomAssignments(validClassroomId);
  const attempts = useAttempts(
    validClassroomId ? { classroomId: validClassroomId, pageSize: 100 } : null,
  );
  const sortedAssignments = [...assignments.items].sort(compareAssignments);
  const currentAssignments = sortedAssignments.filter(
    (assignment) => !isPastAssignment(assignment, pageLoadedAt),
  );
  const pastAssignments = sortedAssignments.filter((assignment) =>
    isPastAssignment(assignment, pageLoadedAt),
  );
  const activeStudentIds = currentStudentIds
    ? new Set(currentStudentIds)
    : undefined;
  const currentAssignmentCards = currentAssignments.map((assignment) => ({
    assignment,
    completedCount: getAssignmentProgress(
      assignment.id,
      attempts.items,
      activeStudentIds,
    )
      .completedCount,
  }));
  const pastAssignmentCards = pastAssignments.map((assignment) => ({
    assignment,
    completedCount: getAssignmentProgress(
      assignment.id,
      attempts.items,
      activeStudentIds,
    )
      .completedCount,
  }));

  return {
    currentAssignments: currentAssignmentCards,
    pastAssignments: pastAssignmentCards,
    assignmentsGuard: createCollectionGuard({
      unauthorized: assignments.unauthorized || attempts.unauthorized,
      loading: assignments.loading || attempts.loading,
      error: getFirstError(assignments.error, attempts.error),
      onRetry: () => {
        assignments.refetch();
        attempts.refetch();
      },
      itemCount: currentAssignmentCards.length + pastAssignmentCards.length,
    }),
    refetch: () => {
      assignments.refetch();
      attempts.refetch();
    },
  };
}

export function useClassroomListData(): ClassroomListData {
  const classrooms = useClassrooms(100);

  return {
    classrooms: classrooms.items,
    guard: createCollectionGuard({
      unauthorized: classrooms.unauthorized,
      loading: classrooms.loading,
      error: classrooms.error,
      onRetry: classrooms.refetch,
      itemCount: classrooms.items.length,
      emptyMessage: "No classrooms yet.",
    }),
  };
}

export function useAssignmentDetailData(
  classroomId: string | null | undefined,
  assignmentId: string | null | undefined,
): AssignmentDetailData {
  const [pageLoadedAt] = useState(() => Date.now());
  const validClassroomId = toUuidOrNull(classroomId);
  const validAssignmentId = toUuidOrNull(assignmentId);
  const hasValidIds = validClassroomId !== null && validAssignmentId !== null;
  const assignment = useAssignment(hasValidIds ? validAssignmentId : null);
  const attempts = useAssignmentAttempts(
    hasValidIds ? validAssignmentId : null,
  );
  const classroomMembers = useClassroomMembers(
    hasValidIds ? validClassroomId : null,
  );
  const assignmentItem = assignment.item;
  const role = assignmentItem?.viewer_role ?? null;
  const attemptItems = [...attempts.items].sort(compareAttempts);
  const studentMembers = [...classroomMembers.items]
    .filter((member) => member.role === "student")
    .sort(compareClassroomMembers);
  const attemptsByStudentId = new Map<string, PublicAttempt[]>();

  attemptItems.forEach((attemptItem) => {
    const currentAttempts =
      attemptsByStudentId.get(attemptItem.student_user_id) ?? [];
    currentAttempts.push(attemptItem);
    attemptsByStudentId.set(attemptItem.student_user_id, currentAttempts);
  });

  const studentAttemptGroups = studentMembers
    .map((student): InstructorStudentAttemptGroup => {
      const studentAttempts = [
        ...(attemptsByStudentId.get(student.user_id) ?? []),
      ].sort(compareAttempts);
      const latestStudentAttempt = studentAttempts[0] ?? null;
      const latestCompletedStudentAttempt =
        studentAttempts.find((attemptItem) => attemptItem.status === "submitted") ??
        null;
      const inProgressStudentAttempt =
        studentAttempts.find((attemptItem) => attemptItem.status === "in_progress") ??
        null;
      const preferredStudentAttempt =
        latestCompletedStudentAttempt ?? inProgressStudentAttempt ?? latestStudentAttempt;

      return {
        student,
        attempts: studentAttempts,
        latestAttempt: latestStudentAttempt,
        preferredAttempt: preferredStudentAttempt,
        inProgressAttempt: inProgressStudentAttempt,
        status: getStudentAttemptStatus(studentAttempts),
        lastActivityAt: latestStudentAttempt?.last_activity_at ?? null,
      };
    })
    .sort(compareInstructorStudentAttemptGroups);
  const latestAttempt = attemptItems[0] ?? null;
  const inProgressAttempt =
    attemptItems.find((attemptItem) => attemptItem.status === "in_progress") ??
    null;
  const isOpen =
    !assignmentItem?.open_at ||
    new Date(assignmentItem.open_at).getTime() <= pageLoadedAt;
  const isClosed = assignmentItem?.close_at
    ? new Date(assignmentItem.close_at).getTime() <= pageLoadedAt
    : false;
  const attemptsUsed = attemptItems.length;
  const attemptsRemaining =
    assignmentItem?.max_attempts === null ||
    typeof assignmentItem?.max_attempts === "undefined"
      ? null
      : Math.max(assignmentItem.max_attempts - attemptsUsed, 0);
  const hasRunnableAttempt = Boolean(inProgressAttempt) && !isClosed && isOpen;
  const canStartNewAttempt =
    role === "student" &&
    !hasRunnableAttempt &&
    !isClosed &&
    isOpen &&
    (assignmentItem?.max_attempts === null ||
      typeof assignmentItem?.max_attempts === "undefined" ||
      attemptsUsed < assignmentItem.max_attempts);
  const runnerLink =
    hasValidIds && validClassroomId && validAssignmentId
      ? `/classrooms/${validClassroomId}/assignment/${validAssignmentId}/attempt`
      : null;

  let guard: DataGuardState = CONTENT_GUARD;

  if (!hasValidIds) {
    guard = {
      kind: "invalid",
      message: "The classroom or assignment ID in the URL is invalid.",
    };
  } else if (
    assignment.unauthorized ||
    attempts.unauthorized ||
    classroomMembers.unauthorized
  ) {
    guard = { kind: "unauthorized" };
  } else if (assignment.loading) {
    guard = { kind: "loading" };
  } else if (assignment.error) {
    guard = {
      kind: "error",
      message: assignment.error,
      onRetry: assignment.refetch,
    };
  } else if (!assignmentItem) {
    guard = {
      kind: "empty",
      message: "Assignment not found.",
    };
  } else if (!role) {
    guard = {
      kind: "error",
      message: "We couldn't determine your role for this assignment.",
    };
  }

  return {
    classroomId: validClassroomId,
    assignmentId: validAssignmentId,
    assignment: assignmentItem,
    role,
    guard,
    attemptsGuard: createCollectionGuard({
      unauthorized: attempts.unauthorized,
      loading: attempts.loading,
      error: attempts.error,
      onRetry: attempts.refetch,
      itemCount: attemptItems.length,
      emptyMessage:
        role === "student" ? "You have not started this assignment yet." : undefined,
    }),
    submissionsGuard: createCollectionGuard({
      unauthorized: attempts.unauthorized || classroomMembers.unauthorized,
      loading: attempts.loading || classroomMembers.loading,
      error: getFirstError(attempts.error, classroomMembers.error),
      onRetry: () => {
        attempts.refetch();
        classroomMembers.refetch();
      },
      itemCount: studentAttemptGroups.length,
    }),
    attempts: attemptItems,
    latestAttempt,
    inProgressAttempt,
    studentAttemptGroups,
    isOpen,
    isClosed,
    attemptsUsed,
    attemptsRemaining,
    hasRunnableAttempt,
    canStartNewAttempt,
    runnerLink,
  };
}

export function useAttemptDetailData(
  attemptId: string | null | undefined,
): AttemptDetailData {
  const validAttemptId = toUuidOrNull(attemptId);
  const attempt = useAttempt(validAttemptId);
  const responses = useAttemptResponses(validAttemptId);
  const sortedResponses = [...responses.items].sort(compareResponsesOldestFirst);

  let guard: DataGuardState = CONTENT_GUARD;

  if (!validAttemptId) {
    guard = {
      kind: "invalid",
      message: "The attempt ID in the URL is invalid.",
    };
  } else if (attempt.unauthorized || responses.unauthorized) {
    guard = { kind: "unauthorized" };
  } else if (attempt.loading) {
    guard = { kind: "loading" };
  } else if (attempt.error) {
    guard = {
      kind: "error",
      message: attempt.error,
      onRetry: attempt.refetch,
    };
  } else if (!attempt.item) {
    guard = {
      kind: "empty",
      message: "Attempt not found.",
    };
  }

  return {
    attemptId: validAttemptId,
    attempt: attempt.item,
    guard,
    responsesGuard: createCollectionGuard({
      unauthorized: responses.unauthorized,
      loading: responses.loading,
      error: responses.error,
      onRetry: responses.refetch,
      itemCount: sortedResponses.length,
      emptyMessage: "No responses found for this attempt.",
    }),
    responses: sortedResponses,
  };
}

export function useResponseDetailData(
  classroomId: string | null | undefined,
  assignmentId: string | null | undefined,
  attemptId: string | null | undefined,
  responseId: string | null | undefined,
): ResponseDetailData {
  const validClassroomId = toUuidOrNull(classroomId);
  const validAssignmentId = toUuidOrNull(assignmentId);
  const validAttemptId = toUuidOrNull(attemptId);
  const validResponseId = toUuidOrNull(responseId);
  const hasValidIds =
    validClassroomId !== null &&
    validAssignmentId !== null &&
    validAttemptId !== null &&
    validResponseId !== null;
  const response = useResponse(hasValidIds ? validResponseId : null);

  let guard: DataGuardState = CONTENT_GUARD;

  if (!hasValidIds) {
    guard = {
      kind: "invalid",
      message: "Invalid route identifiers.",
    };
  } else if (response.unauthorized) {
    guard = { kind: "unauthorized" };
  } else if (response.loading) {
    guard = { kind: "loading" };
  } else if (response.error) {
    guard = {
      kind: "error",
      message: response.error,
      onRetry: response.refetch,
    };
  } else if (!response.item) {
    guard = {
      kind: "empty",
      message: "Response not found.",
    };
  }

  return {
    classroomId: validClassroomId,
    assignmentId: validAssignmentId,
    attemptId: validAttemptId,
    responseId: validResponseId,
    response: response.item,
    guard,
  };
}
