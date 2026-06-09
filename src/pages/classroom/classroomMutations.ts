import { queryClient } from "../../lib/query-client-instance";
import {
  publicApiDelete,
  publicApiPost,
  publicApiPut,
  resolvePublicApiToken,
} from "../../lib/public-api-client";
import type { ItemResponse, PublicClassroom } from "../../types/publicApi";

type CreateClassroomInput = {
  name: string;
};

type JoinClassroomInput = {
  code: string;
};

type UpdateClassroomInput = {
  classroomId: string;
  name: string;
};

type LeaveClassroomInput = {
  classroomId: string;
};

type RemoveClassroomStudentInput = {
  classroomId: string;
  userId: string;
};

type PromoteClassroomStudentInput = {
  classroomId: string;
  userId: string;
};

type DemoteClassroomInstructorInput = {
  classroomId: string;
  userId: string;
};

async function resolveRequiredToken() {
  const token = await resolvePublicApiToken();
  if (!token) {
    throw new Error("You must be logged in to manage classrooms.");
  }

  return token;
}

async function invalidatePublicApiQueries() {
  await queryClient.invalidateQueries({
    queryKey: ["public-api"],
  });
}

export async function createClassroom(input: CreateClassroomInput) {
  const token = await resolveRequiredToken();
  const response = await publicApiPost<ItemResponse<PublicClassroom>>(
    "/api/public/classrooms",
    token,
    {
      name: input.name,
    },
  );

  await invalidatePublicApiQueries();
  return response.item;
}

export async function joinClassroom(input: JoinClassroomInput) {
  const token = await resolveRequiredToken();
  const response = await publicApiPost<ItemResponse<PublicClassroom>>(
    "/api/public/classrooms/join",
    token,
    {
      code: input.code.trim(),
    },
  );

  await invalidatePublicApiQueries();
  return response.item;
}

export async function updateClassroom(input: UpdateClassroomInput) {
  const token = await resolveRequiredToken();
  const response = await publicApiPut<ItemResponse<PublicClassroom>>(
    `/api/public/classrooms/${input.classroomId}`,
    token,
    {
      name: input.name.trim(),
    },
  );

  await invalidatePublicApiQueries();
  return response.item;
}

export async function leaveClassroom(input: LeaveClassroomInput) {
  const token = await resolveRequiredToken();
  await publicApiDelete<{ deleted: boolean }>(
    `/api/public/classroom-members/${input.classroomId}/me`,
    token,
  );

  await invalidatePublicApiQueries();
}

export async function removeClassroomStudent(
  input: RemoveClassroomStudentInput,
) {
  const token = await resolveRequiredToken();
  await publicApiDelete<{ deleted: boolean }>(
    `/api/public/classroom-members/${input.classroomId}/users/${input.userId}`,
    token,
  );

  await invalidatePublicApiQueries();
}

export async function promoteClassroomStudent(
  input: PromoteClassroomStudentInput,
) {
  const token = await resolveRequiredToken();

  await publicApiPost<{ updated: boolean }>(
    `/api/public/classroom-members/${input.classroomId}/users/${input.userId}/promote`,
    token,
    {},
  );

  await invalidatePublicApiQueries();
}

export async function demoteClassroomInstructor(
  input: DemoteClassroomInstructorInput,
) {
  const token = await resolveRequiredToken();

  await publicApiPost<{ updated: boolean }>(
    `/api/public/classroom-members/${input.classroomId}/users/${input.userId}/demote`,
    token,
    {},
  );

  await invalidatePublicApiQueries();
}