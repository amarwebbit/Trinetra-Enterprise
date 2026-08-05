import { BaseService, ServiceOptions } from './base.service';
import { Prisma } from '@prisma/client';

export interface ExamFilters {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
  startDate?: Date;
  endDate?: Date;
  teacherId?: string;
}

export interface ExamCreateData {
  title: string;
  description?: string;
  exam_type?: string;
  duration_minutes: number;
  total_marks?: number;
  start_time: Date | string;
  end_time: Date | string;
  passing_percentage?: number;
  shuffle_questions?: boolean;
  shuffle_options?: boolean;
  allow_back_navigation?: boolean;
  show_results_immediately?: boolean;
  require_webcam?: boolean;
  full_screen_required?: boolean;
  disable_copy_paste?: boolean;
  is_published?: boolean;
  instructions?: string;
  instructions_html?: string;
  show_instructions?: boolean;
  require_acknowledgement?: boolean;
  max_attempts?: number;
  allow_multiple?: boolean;
  sections?: Array<{
    name: string;
    order_index: number;
    question_count?: number;
    marks_per_question?: number;
    negative_marks?: number;
    section_time_limit?: number;
    shuffle_questions?: boolean;
    instructions?: string;
    instructions_html?: string;
    question_ids?: string[];
  }>;
}

export interface ExamUpdateData extends Partial<ExamCreateData> {}

export class ExamService extends BaseService {
  private static instance: ExamService;

  private constructor() {
    super();
  }

  static getInstance(): ExamService {
    if (!ExamService.instance) {
      ExamService.instance = new ExamService();
    }
    return ExamService.instance;
  }

  // ============================================
  // Find all exams with pagination and filtering
  // ============================================
  async findAll(
    options: ServiceOptions,
    filters: ExamFilters = {}
  ) {
    const tenantId = this.getTenantId(options);
    const { status, search, page = 1, limit = 20, startDate, endDate, teacherId } = filters;

    const cacheKey = `exams:${tenantId}:${JSON.stringify({ status, search, page, limit, startDate, endDate, teacherId })}`;

    return this.trackOperation('ExamService.findAll', async () => {
      return this.getCached(
        cacheKey,
        async () => {
          const where: Prisma.examsWhereInput = {
            tenant_id: tenantId,
            is_active: true,
          };

          if (teacherId) {
            where.teacher_id = teacherId;
          }

          if (search) {
            where.OR = [
              { title: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
            ];
          }

          if (startDate) {
            where.start_time = { gte: startDate };
          }

          if (endDate) {
            where.end_time = { lte: endDate };
          }

          const [data, total] = await Promise.all([
            this.prisma.exams.findMany({
              where,
              select: {
                id: true,
                title: true,
                description: true,
                exam_type: true,
                duration_minutes: true,
                total_marks: true,
                start_time: true,
                end_time: true,
                is_published: true,
                is_active: true,
                created_at: true,
                updated_at: true,
                users: {
                  select: {
                    id: true,
                    full_name: true,
                    email: true,
                  },
                },
                _count: {
                  select: {
                    exam_attempts: {
                      where: { status: { in: ['submitted', 'graded'] } },
                    },
                  },
                },
              },
              orderBy: { created_at: 'desc' },
              skip: (page - 1) * limit,
              take: limit,
            }),
            this.prisma.exams.count({ where }),
          ]);

          return {
            data,
            pagination: {
              page,
              limit,
              total,
              totalPages: Math.ceil(total / limit),
              hasMore: page * limit < total,
            },
          };
        },
        { ttl: 60, tags: [`tenant:${tenantId}:exams`] }
      );
    }, { tenantId, filters });
  }

  // ============================================
  // Find exam by ID with full details
  // ============================================
  async findById(id: string, options: ServiceOptions) {
    const tenantId = this.getTenantId(options);
    const cacheKey = `exam:${id}`;

    return this.trackOperation('ExamService.findById', async () => {
      return this.getCached(
        cacheKey,
        async () => {
          const exam = await this.prisma.exams.findFirst({
            where: {
              id,
              tenant_id: tenantId,
              is_active: true,
            },
            include: {
              exam_sections: {
                include: {
                  exam_questions: {
                    include: {
                      questions: {
                        include: {
                          topics: true,
                        },
                      },
                    },
                  },
                },
                orderBy: { order_index: 'asc' },
              },
              users: {
                select: {
                  id: true,
                  full_name: true,
                  email: true,
                  phone: true,
                },
              },
              invite_tokens: {
                select: {
                  id: true,
                  token: true,
                  maxUses: true,
                  usedCount: true,
                  expiresAt: true,
                  isActive: true,
                },
              },
              _count: {
                select: {
                  exam_attempts: true,
                },
              },
            },
          });

          if (!exam) {
            throw new Error('Exam not found');
          }

          return exam;
        },
        { ttl: 300, tags: [`exam:${id}`] }
      );
    }, { id, tenantId });
  }

  // ============================================
  // Create a new exam with sections and questions
  // ============================================
  async create(data: ExamCreateData, teacherId: string, options: ServiceOptions) {
    const tenantId = this.getTenantId(options);

    return this.trackOperation('ExamService.create', async () => {
      const { sections, ...examData } = data;

      const exam = await this.prisma.$transaction(async (tx) => {
        const newExam = await tx.exams.create({
          data: {
            ...(examData as any),
            teacher_id: teacherId,
            tenant_id: tenantId,
            is_active: true,
          },
        });

        if (sections && sections.length > 0) {
          for (const section of sections) {
            const { question_ids, ...sectionData } = section;

            const newSection = await tx.exam_sections.create({
              data: {
                ...sectionData,
                exam_id: newExam.id,
                tenant_id: tenantId,
              },
            });

            if (question_ids && question_ids.length > 0) {
              await tx.exam_questions.createMany({
                data: question_ids.map((questionId, index) => ({
                  exam_section_id: newSection.id,
                  question_id: questionId,
                  order_index: index,
                  tenant_id: tenantId,
                })),
              });
            }
          }
        }

        return newExam;
      });

      await this.invalidateCache([
        `tenant:${tenantId}:exams`,
        `teacher:${teacherId}:exams`,
      ]);

      return exam;
    }, { data, teacherId, tenantId });
  }

  // ============================================
  // Update an existing exam
  // ============================================
  async update(id: string, data: ExamUpdateData, options: ServiceOptions) {
    const tenantId = this.getTenantId(options);

    return this.trackOperation('ExamService.update', async () => {
      const existing = await this.prisma.exams.findFirst({
        where: { id, tenant_id: tenantId },
      });

      if (!existing) {
        throw new Error('Exam not found');
      }

      const exam = await this.prisma.exams.update({
        where: { id },
        data: {
          ...(data as any),
          updated_at: new Date(),
        },
      });

      await this.invalidateCache([
        `exam:${id}`,
        `tenant:${tenantId}:exams`,
        `teacher:${existing.teacher_id}:exams`,
      ]);

      return exam;
    }, { id, data, tenantId });
  }

  // ============================================
  // Soft delete an exam
  // ============================================
  async delete(id: string, options: ServiceOptions) {
    const tenantId = this.getTenantId(options);

    return this.trackOperation('ExamService.delete', async () => {
      const existing = await this.prisma.exams.findFirst({
        where: { id, tenant_id: tenantId },
      });

      if (!existing) {
        throw new Error('Exam not found');
      }

      const exam = await this.prisma.exams.update({
        where: { id },
        data: {
          is_active: false,
          updated_at: new Date(),
        },
      });

      await this.invalidateCache([
        `exam:${id}`,
        `tenant:${tenantId}:exams`,
        `teacher:${existing.teacher_id}:exams`,
      ]);

      return exam;
    }, { id, tenantId });
  }

  // ============================================
  // Publish an exam
  // ============================================
  async publish(id: string, options: ServiceOptions) {
    const tenantId = this.getTenantId(options);

    return this.trackOperation('ExamService.publish', async () => {
      const exam = await this.prisma.exams.update({
        where: { id, tenant_id: tenantId },
        data: {
          is_published: true,
          updated_at: new Date(),
        },
      });

      await this.invalidateCache([
        `exam:${id}`,
        `tenant:${tenantId}:exams`,
      ]);

      return exam;
    }, { id, tenantId });
  }

  // ============================================
  // Get exam statistics
  // ============================================
  async getStats(options: ServiceOptions) {
    const tenantId = this.getTenantId(options);
    const cacheKey = `tenant:${tenantId}:exam-stats`;

    return this.trackOperation('ExamService.getStats', async () => {
      return this.getCached(
        cacheKey,
        async () => {
          const [total, active, published] = await Promise.all([
            this.prisma.exams.count({ where: { tenant_id: tenantId } }),
            this.prisma.exams.count({ where: { tenant_id: tenantId, is_active: true } }),
            this.prisma.exams.count({ where: { tenant_id: tenantId, is_published: true } }),
          ]);

          return {
            total,
            active,
            published,
          };
        },
        { ttl: 300, tags: [`tenant:${tenantId}`] }
      );
    }, { tenantId });
  }

  // ============================================
  // Duplicate an exam
  // ============================================
  async duplicate(id: string, newTitle: string, options: ServiceOptions) {
    const tenantId = this.getTenantId(options);

    return this.trackOperation('ExamService.duplicate', async () => {
      const sourceExam = await this.prisma.exams.findFirst({
        where: { id, tenant_id: tenantId },
        include: {
          exam_sections: {
            include: {
              exam_questions: true,
            },
          },
        },
      });

      if (!sourceExam) {
        throw new Error('Source exam not found');
      }

      const { exam_sections, id: _oldId, created_at: _c, updated_at: _u, ...examData } = sourceExam;
      const newExam = await this.prisma.exams.create({
        data: {
          ...(examData as any),
          title: newTitle || `${examData.title} (Copy)`,
          is_published: false,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      for (const section of exam_sections) {
        const { exam_questions, id: _secId, created_at: _sc, updated_at: _su, ...sectionData } = section;
        const newSection = await this.prisma.exam_sections.create({
          data: {
            ...(sectionData as any),
            exam_id: newExam.id,
            tenant_id: tenantId,
          },
        });

        if (exam_questions && exam_questions.length > 0) {
          await this.prisma.exam_questions.createMany({
            data: exam_questions.map((eq: any) => ({
              exam_section_id: newSection.id,
              question_id: eq.question_id,
              order_index: eq.order_index,
              marks: eq.marks,
              tenant_id: tenantId,
            })),
          });
        }
      }

      await this.invalidateCache([
        `tenant:${tenantId}:exams`,
      ]);

      return newExam;
    }, { id, newTitle, tenantId });
  }
}

export const examService = ExamService.getInstance();
