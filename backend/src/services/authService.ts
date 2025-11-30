import bcrypt from 'bcryptjs';
import { prisma } from '../models/prisma';

interface RegisterInput {
  email: string;
  password: string;
  name?: string;
  grade?: string;
}

interface LoginInput {
  email: string;
  password: string;
}

const SALT_ROUNDS = 10;

export async function registerUser(payload: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: payload.email } });
  if (existing) {
    throw new Error('이미 등록된 이메일입니다.');
  }

  const passwordHash = await bcrypt.hash(payload.password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email: payload.email,
      name: payload.name,
      grade: payload.grade,
      passwordHash,
    },
  });

  return sanitizeUser(user);
}

export async function loginUser(payload: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: payload.email } });
  if (!user) {
    throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.');
  }

  const ok = await bcrypt.compare(payload.password, user.passwordHash);
  if (!ok) {
    throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.');
  }

  return sanitizeUser(user);
}

function sanitizeUser(user: { id: string; email: string; name: string | null; grade: string | null }) {
  return {
    id: user.id,
    email: user.email,
    name: user.name ?? undefined,
    grade: user.grade ?? undefined,
  };
}

