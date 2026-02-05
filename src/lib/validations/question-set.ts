import { z } from 'zod';

// ============================================
// 질문 세트 Validation Schemas
// ============================================

// 단일 질문 텍스트 검증
const questionTextSchema = z
  .string()
  .min(1, '질문을 입력해주세요')
  .max(500, '질문은 500자 이내로 입력해주세요');

// 질문 세트 생성
export const createQuestionSetSchema = z.object({
  name: z
    .string()
    .min(1, '세트 이름을 입력해주세요')
    .max(255, '이름은 255자 이내로 입력해주세요'),
  description: z
    .string()
    .max(1000, '설명은 1000자 이내로 입력해주세요')
    .optional()
    .nullable(),
  questions: z
    .array(questionTextSchema)
    .min(1, '최소 1개의 질문이 필요합니다')
    .max(50, '최대 50개의 질문까지 추가할 수 있습니다'),
});

export type CreateQuestionSetInput = z.infer<typeof createQuestionSetSchema>;

// 질문 세트 수정
export const updateQuestionSetSchema = z.object({
  name: z
    .string()
    .min(1, '세트 이름을 입력해주세요')
    .max(255, '이름은 255자 이내로 입력해주세요')
    .optional(),
  description: z
    .string()
    .max(1000, '설명은 1000자 이내로 입력해주세요')
    .optional()
    .nullable(),
  is_active: z.boolean().optional(),
});

export type UpdateQuestionSetInput = z.infer<typeof updateQuestionSetSchema>;

// 질문 항목 추가
export const addQuestionItemSchema = z.object({
  question_text: questionTextSchema,
  order_index: z.coerce.number().int().min(0).optional(),
});

export type AddQuestionItemInput = z.infer<typeof addQuestionItemSchema>;

// 질문 항목 수정
export const updateQuestionItemSchema = z.object({
  question_text: questionTextSchema.optional(),
  order_index: z.coerce.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
});

export type UpdateQuestionItemInput = z.infer<typeof updateQuestionItemSchema>;

// 질문 순서 변경
export const reorderQuestionsSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().uuid('유효하지 않은 질문 ID입니다'),
      order_index: z.coerce.number().int().min(0),
    })
  ).min(1, '최소 1개의 항목이 필요합니다'),
});

export type ReorderQuestionsInput = z.infer<typeof reorderQuestionsSchema>;

// 질문 세트 목록 조회 쿼리
export const getQuestionSetsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  active_only: z.coerce.boolean().default(true),
});

export type GetQuestionSetsQuery = z.infer<typeof getQuestionSetsQuerySchema>;

// ============================================
// 스캔 설정 Validation Schemas
// ============================================

export const updateScanSettingsSchema = z.object({
  gemini_iterations: z.coerce
    .number()
    .int()
    .min(1, '최소 1회 이상 필요합니다')
    .max(100, '최대 100회까지 설정 가능합니다')
    .optional(),
  openai_iterations: z.coerce
    .number()
    .int()
    .min(1, '최소 1회 이상 필요합니다')
    .max(100, '최대 100회까지 설정 가능합니다')
    .optional(),
  timeout_per_call_ms: z.coerce
    .number()
    .int()
    .min(5000, '최소 5초 이상 필요합니다')
    .max(120000, '최대 2분까지 설정 가능합니다')
    .optional(),
  default_brand_id: z.string().uuid().optional().nullable(),
});

export type UpdateScanSettingsInput = z.infer<typeof updateScanSettingsSchema>;

// ============================================
// 배치 스캔 Validation Schemas
// ============================================

export const createBatchScanSchema = z.object({
  question_set_id: z.string().uuid('유효하지 않은 질문 세트 ID입니다'),
});

export type CreateBatchScanInput = z.infer<typeof createBatchScanSchema>;

// 배치 스캔 상태 필터
export const batchScanStatusSchema = z.enum([
  'pending',
  'running',
  'paused',
  'completed',
  'failed',
]);

export const getBatchScansQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
  offset: z.coerce.number().int().min(0).default(0),
  status: batchScanStatusSchema.optional(),
});

export type GetBatchScansQuery = z.infer<typeof getBatchScansQuerySchema>;
