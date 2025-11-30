import { Request, Response } from 'express';
import { loginUser, registerUser } from '../services/authService';
import { prisma } from '../models/prisma';
import { ensurePlanForProblemSet, specsFromPlan, generateProblemSet, saveGeneratedProblem } from '../services/problemGenerationService';

export async function register(req: Request, res: Response) {
  try {
    const { email, password, name, grade } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: '이메일과 비밀번호를 입력하세요.' });
    }
    const user = await registerUser({ email, password, name, grade });

    // 초기 사용자용: 가입 직후 문제 세트 생성
    try {
      const gradeCode = typeof grade === 'string' && grade.includes('3') ? '3' : typeof grade === 'string' && grade.includes('2') ? '2' : '1';
      console.log(`[problem-gen] signup trigger for user ${user.id}, grade ${gradeCode}`);
      // 기존 계획 정리
      await prisma.setGenerationPlan.deleteMany({ where: { userId: user.id } });
      const set = await prisma.problemSet.create({
        data: { userId: user.id, title: 'Generated Set', status: 'in_progress' },
      });
      const plan = await ensurePlanForProblemSet(set.id, 12, true);
      const specs = specsFromPlan(plan);
      const problems = await generateProblemSet(gradeCode as '1' | '2' | '3', specs);
      for (const p of problems) {
        await saveGeneratedProblem(set.id, p, gradeCode);
      }
      console.log(`[problem-gen] signup trigger completed for user ${user.id}, set ${set.id}`);
    } catch (err) {
      console.error('signup problem generation error', err);
      // 문제 생성 실패는 회원가입 성공에 영향을 주지 않음
    }

    return res.status(201).json(user);
  } catch (err) {
    return res.status(400).json({ message: err instanceof Error ? err.message : '등록 실패' });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: '이메일과 비밀번호를 입력하세요.' });
    }
    const user = await loginUser({ email, password });
    return res.json(user);
  } catch (err) {
    return res.status(401).json({ message: err instanceof Error ? err.message : '로그인 실패' });
  }
}
