import express from 'express';
import type { Prisma } from '../../../prisma/generated/client.js';

import { prisma } from '../prisma.js';
import {
  asAuthedRequest,
  parseOptionalUuidQuery,
  parsePagination,
  parseUuidParam,
  sendError,
  sendInternalError,
} from './common.js';
import { accessibleClassroomWhere, instructorClassroomWhere } from './scopes.js';

const classroomMemberSelect = {
  classroom_id: true,
  user_id: true,
  role: true,
  created_at: true,
  updated_at: true,
  classroom: { select: { name: true } },
  user: {
    select: {
      auth_user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  },
} as const;

function mapClassroomMemberRow(
  row: Awaited<
    ReturnType<
      typeof prisma.classroom_member.findFirst<{
        select: typeof classroomMemberSelect;
      }>
    >
  >
) {
  if (!row) {
    return null;
  }

  return {
    classroom_id: row.classroom_id,
    user_id: row.user_id,
    role: row.role,
    created_at: row.created_at,
    updated_at: row.updated_at,
    classroom_name: row.classroom.name,
    user_name: row.user.auth_user.name,
    user_email: row.user.auth_user.email,
  };
}

export function createPublicClassroomMembersRouter() {
  const router = express.Router();

  router.get('/', async (req, res) => {
    const authedReq = asAuthedRequest(req);
    const pagination = parsePagination(req.query);
    if (!pagination.ok) {
      return sendError(res, 400, 'BAD_REQUEST', pagination.message);
    }

    const classroomId = parseOptionalUuidQuery(req.query, 'classroomId');
    if (!classroomId.ok) {
      return sendError(res, 400, 'BAD_REQUEST', classroomId.message);
    }

    const where: Prisma.classroom_memberWhereInput = {
      classroom: accessibleClassroomWhere(authedReq.auth.userId),
    };
    if (classroomId.value !== undefined) {
      where.classroom_id = classroomId.value;
    }

    const { page, pageSize, skip, take } = pagination.value;

    try {
      const [total, rows] = await Promise.all([
        prisma.classroom_member.count({ where }),
        prisma.classroom_member.findMany({
          where,
          orderBy: { created_at: 'desc' },
          skip,
          take,
          select: classroomMemberSelect,
        }),
      ]);

      return res.json({
        items: rows.map((row) => mapClassroomMemberRow(row)),
        page,
        pageSize,
        total,
      });
    } catch (error) {
      return sendInternalError(res, 'Failed to list classroom members', error);
    }
  });

  router.delete('/:classroomId/me', async (req, res) => {
    const authedReq = asAuthedRequest(req);
    const classroomId = parseUuidParam('classroomId', req.params.classroomId);
    if (!classroomId.ok) {
      return sendError(res, 400, 'BAD_REQUEST', classroomId.message);
    }

    try {
      const membership = await prisma.classroom_member.findUnique({
        where: {
          classroom_id_user_id: {
            classroom_id: classroomId.value,
            user_id: authedReq.auth.userId,
          },
        },
        select: {
          role: true,
        },
      });

      if (!membership) {
        return sendError(res, 404, 'NOT_FOUND', 'Classroom membership not found');
      }

      if (membership.role !== 'student') {
        return sendError(
          res,
          403,
          'FORBIDDEN',
          'Only students can leave a classroom from this view',
        );
      }

      await prisma.classroom_member.delete({
        where: {
          classroom_id_user_id: {
            classroom_id: classroomId.value,
            user_id: authedReq.auth.userId,
          },
        },
        select: {
          classroom_id: true,
        },
      });

      return res.json({ deleted: true });
    } catch (error) {
      return sendInternalError(res, 'Failed to leave classroom', error);
    }
  });

  router.delete('/:classroomId/users/:userId', async (req, res) => {
    const authedReq = asAuthedRequest(req);
    const classroomId = parseUuidParam('classroomId', req.params.classroomId);
    if (!classroomId.ok) {
      return sendError(res, 400, 'BAD_REQUEST', classroomId.message);
    }

    const userId = parseUuidParam('userId', req.params.userId);
    if (!userId.ok) {
      return sendError(res, 400, 'BAD_REQUEST', userId.message);
    }

    try {
      const instructorClassroom = await prisma.classroom.findFirst({
        where: {
          AND: [
            { id: classroomId.value },
            instructorClassroomWhere(authedReq.auth.userId),
          ],
        },
        select: {
          id: true,
        },
      });

      if (!instructorClassroom) {
        return sendError(
          res,
          403,
          'FORBIDDEN',
          'You must be an instructor in this classroom to remove students',
        );
      }

      const targetMembership = await prisma.classroom_member.findUnique({
        where: {
          classroom_id_user_id: {
            classroom_id: classroomId.value,
            user_id: userId.value,
          },
        },
        select: {
          role: true,
        },
      });

      if (!targetMembership) {
        return sendError(res, 404, 'NOT_FOUND', 'Classroom membership not found');
      }

      if (targetMembership.role !== 'student') {
        return sendError(
          res,
          403,
          'FORBIDDEN',
          'Only student memberships can be removed',
        );
      }

      await prisma.classroom_member.delete({
        where: {
          classroom_id_user_id: {
            classroom_id: classroomId.value,
            user_id: userId.value,
          },
        },
        select: {
          classroom_id: true,
        },
      });

      return res.json({ deleted: true });
    } catch (error) {
      return sendInternalError(res, 'Failed to remove classroom member', error);
    }
  });

  router.post(
  '/:classroomId/users/:userId/promote',
  async (req, res) => {
    const authedReq = asAuthedRequest(req);

    const classroomId = parseUuidParam('classroomId', req.params.classroomId);
    if (!classroomId.ok) {
      return sendError(res, 400, 'BAD_REQUEST', classroomId.message);
    }

    const userId = parseUuidParam('userId', req.params.userId);
    if (!userId.ok) {
      return sendError(res, 400, 'BAD_REQUEST', userId.message);
    }

    try {
      // only instructors can promote
      const instructorClassroom = await prisma.classroom.findFirst({
        where: {
          AND: [
            { id: classroomId.value },
            instructorClassroomWhere(authedReq.auth.userId),
          ],
        },
        select: { id: true },
      });

      if (!instructorClassroom) {
        return sendError(
          res,
          403,
          'FORBIDDEN',
          'You must be an instructor to promote students',
        );
      }

      const targetMembership = await prisma.classroom_member.findUnique({
        where: {
          classroom_id_user_id: {
            classroom_id: classroomId.value,
            user_id: userId.value,
          },
        },
        select: {
          role: true,
        },
      });

      if (!targetMembership) {
        return sendError(res, 404, 'NOT_FOUND', 'Classroom membership not found');
      }

      if (targetMembership.role !== 'student') {
        return sendError(
          res,
          403,
          'FORBIDDEN',
          'Only students can be promoted',
        );
      }

      await prisma.classroom_member.update({
        where: {
          classroom_id_user_id: {
            classroom_id: classroomId.value,
            user_id: userId.value,
          },
        },
        data: {
          role: 'instructor',
        },
      });

      return res.json({ updated: true });
    } catch (error) {
      return sendInternalError(res, 'Failed to promote classroom member', error);
    }
  }
);

  return router;
}
