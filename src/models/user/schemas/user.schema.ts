import { z } from 'zod';
import { Role, Turno } from '../../../generated/enums';

const baseUserSchema = z.object({
  nome: z.string().min(1).max(150),
  email: z.string().email().max(100),
  senha: z.string().min(8),
});

export const createAlunoSchema = baseUserSchema.extend({
  role: z.literal(Role.ALUNO),
  turma_id: z.number().int().positive(),
  turno: z.enum(Turno),
});

export const createProfessorSchema = baseUserSchema.extend({
  role: z.literal(Role.PROFESSOR),
});

export const createCoordenadorSchema = baseUserSchema.extend({
  role: z.literal(Role.COORDENADOR),
  escola_id: z.number().int().positive(),
});

export const createUserSchema = z.discriminatedUnion('role', [
  createAlunoSchema,
  createProfessorSchema,
  createCoordenadorSchema,
]);

export const updateUserSchema = z
  .object({
    nome: z.string().min(1).max(150).optional(),
    email: z.string().email().max(100).optional(),
    senha: z.string().min(8).optional(),
    ativo: z.boolean().optional(),
    turma_id: z.number().int().positive().optional(),
    turno: z.enum(Turno).optional(),
    escola_id: z.number().int().positive().optional(),
    coordenador_id: z.number().int().positive().nullable().optional(),
  })
  .strict();
