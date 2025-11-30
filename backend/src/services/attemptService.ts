import { prisma } from '../models/prisma';

export interface StartAttemptInput {
  userId: string;
  problemId: string;
  problemSetId?: string;
  problem?: {
    title?: string;
    description?: string;
    answer?: string;
    topic?: string;
    learningStage?: string;
    evaluationArea?: string;
    contentArea?: string;
    difficulty?: string;
    grade?: string;
  };
}

export async function startAttempt(input: StartAttemptInput) {
  // Ensure problem set exists (or create ad-hoc)
  let problemSetId = input.problemSetId;
  if (!problemSetId) {
    const adhoc = await prisma.problemSet.create({
      data: {
        userId: input.userId,
        title: input.problem?.title || 'Ad-hoc Problem Set',
        description: input.problem?.description,
        status: 'in_progress',
      },
    });
    problemSetId = adhoc.id;
  }

// Ensure problem exists
  const existingProblem = await prisma.problem.findUnique({ where: { id: input.problemId } });
  if (existingProblem) {
    const updateData: any = {};
    // 연결만 필요하면 연결
    if (problemSetId) updateData.problemSet = { connect: { id: problemSetId } };
    // 전달된 값이 있을 때만 덮어쓰기
    if (input.problem?.description || input.problem?.title) {
      updateData.content = input.problem.description || input.problem.title;
    }
    if (input.problem?.answer) updateData.answer = input.problem.answer;
    if (input.problem?.topic) updateData.questionTopic = input.problem.topic;
    if (input.problem?.learningStage) updateData.learningStage = input.problem.learningStage;
    if (input.problem?.evaluationArea) updateData.evaluationArea = input.problem.evaluationArea;
    if (input.problem?.contentArea) updateData.contentArea = input.problem.contentArea;
    if (input.problem?.difficulty) updateData.difficulty = input.problem.difficulty;
    if (input.problem?.grade) updateData.grade = input.problem.grade;
    if (!existingProblem.userId) {
      updateData.user = { connect: { id: input.userId } };
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.problem.update({
        where: { id: input.problemId },
        data: updateData,
      });
    }
  } else {
    // Create new problem with provided values; 빈 값은 공백 처리
    await prisma.problem.update({
      where: { id: input.problemId },
      data: {
        id: input.problemId,
        problemSet: { connect: { id: problemSetId } },
        user: { connect: { id: input.userId } },
        content: input.problem?.description || input.problem?.title || '',
        answer: input.problem?.answer || '',
        questionTopic: input.problem?.topic,
        learningStage: input.problem?.learningStage,
        evaluationArea: input.problem?.evaluationArea,
        contentArea: input.problem?.contentArea,
        difficulty: input.problem?.difficulty,
        grade: input.problem?.grade,
      },
    });
  }

  const attemptCount = await prisma.solveAttempt.count({
    where: { userId: input.userId, problemId: input.problemId },
  });

  const attempt = await prisma.solveAttempt.create({
    data: {
      userId: input.userId,
      problemId: input.problemId,
      problemSetId,
      startedAt: new Date(),
      attemptCount: attemptCount + 1,
    },
  });

  // Log PROBLEM_VIEWED event
  await prisma.solveEvent.create({
    data: {
      solveAttemptId: attempt.id,
      eventType: 'PROBLEM_VIEWED',
      clientTimestamp: new Date(),
    },
  });

  return attempt;
}

export async function upsertSteps(attemptId: string, steps: Array<{ stepIndex: number; content: string; isDeleted?: boolean; createdAt?: string; updatedAt?: string }>) {
  await Promise.all(
    steps.map((step) =>
      prisma.solveStep.upsert({
        where: { solveAttemptId_stepIndex: { solveAttemptId: attemptId, stepIndex: step.stepIndex } },
        create: {
          solveAttemptId: attemptId,
          stepIndex: step.stepIndex,
          content: step.content,
          isDeleted: step.isDeleted ?? false,
          createdAt: step.createdAt ? new Date(step.createdAt) : new Date(),
          updatedAt: step.updatedAt ? new Date(step.updatedAt) : new Date(),
        },
        update: {
          content: step.content,
          isDeleted: step.isDeleted ?? false,
          updatedAt: step.updatedAt ? new Date(step.updatedAt) : new Date(),
        },
      })
    )
  );
}

export interface LogEventInput {
  eventType: string;
  stepIndex?: number;
  payload?: any;
  clientTimestamp?: string;
}

export async function logEvents(attemptId: string, events: LogEventInput[]) {
  if (!events.length) return;
  const hasFirstInput = events.some((e) => e.eventType === 'FIRST_INPUT' && e.clientTimestamp);
  await prisma.solveEvent.createMany({
    data: events.map((e) => ({
      solveAttemptId: attemptId,
      eventType: e.eventType,
      stepIndex: e.stepIndex,
      payloadJson: e.payload,
      clientTimestamp: e.clientTimestamp ? new Date(e.clientTimestamp) : null,
    })),
  });
  if (hasFirstInput) {
    const first = events.find((e) => e.eventType === 'FIRST_INPUT' && e.clientTimestamp);
    if (first?.clientTimestamp) {
      await prisma.solveAttempt.update({
        where: { id: attemptId },
        data: { firstInputAt: new Date(first.clientTimestamp) },
      });
    }
  }
}

export interface SubmitAttemptInput {
  result?: 'in_progress' | 'correct' | 'incorrect' | 'gave_up';
  submittedAt?: string;
  expectedScore?: number;
  selfConfidence?: number;
  firstInputAt?: string;
}

export async function submitAttempt(attemptId: string, input: SubmitAttemptInput) {
  await prisma.solveAttempt.update({
    where: { id: attemptId },
    data: {
      result: input.result,
      submittedAt: input.submittedAt ? new Date(input.submittedAt) : new Date(),
      expectedScore: input.expectedScore,
      selfConfidence: input.selfConfidence,
      firstInputAt: input.firstInputAt ? new Date(input.firstInputAt) : undefined,
    },
  });
}
