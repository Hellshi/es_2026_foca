import { Prisma, PrismaClient } from '../../generated/client';
import { Role, Turno } from '../../generated/enums';
import { UsuarioComRelacoes } from '../../models/user/types/user.types';

const INCLUDE_RELACOES = {
  aluno: true,
  professor: true,
  coordenador: true,
} as const;

type TransactionClient = Prisma.TransactionClient;

export type CreateAlunoData = {
  nome: string;
  email: string;
  senha_hash: string;
  turma_id: number;
  turno: Turno;
};

export type CreateProfessorData = {
  nome: string;
  email: string;
  senha_hash: string;
  escola_id: number;
  coordenador_id: number;
};

export type CreateCoordenadorData = {
  nome: string;
  email: string;
  senha_hash: string;
  escola_id: number;
};

export type UpdateUsuarioData = {
  nome?: string;
  email?: string;
  senha_hash?: string;
  ativo?: boolean;
};

export type UpdateSubtabelaData = {
  turma_id?: number;
  turno?: Turno;
  escola_id?: number;
  coordenador_id?: number | null;
};

export class UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(id: number): Promise<UsuarioComRelacoes | null> {
    return this.prisma.usuario.findUnique({
      where: { id },
      include: INCLUDE_RELACOES,
    });
  }

  findByEmail(email: string): Promise<UsuarioComRelacoes | null> {
    return this.prisma.usuario.findUnique({
      where: { email },
      include: INCLUDE_RELACOES,
    });
  }

  findCoordenadorByUsuarioId(usuarioId: number) {
    return this.prisma.coordenador.findUnique({
      where: { usuario_id: usuarioId },
    });
  }

  list(): Promise<UsuarioComRelacoes[]> {
    return this.prisma.usuario.findMany({
      include: INCLUDE_RELACOES,
      orderBy: { id: 'asc' },
    });
  }

  createAluno(data: CreateAlunoData): Promise<UsuarioComRelacoes> {
    return this.prisma.$transaction(async (tx: TransactionClient) => {
      const usuario = await tx.usuario.create({
        data: {
          nome: data.nome,
          email: data.email,
          senha_hash: data.senha_hash,
          role: Role.ALUNO,
        },
      });

      const aluno = await tx.aluno.create({
        data: {
          usuario_id: usuario.id,
          turma_id: data.turma_id,
          turno: data.turno,
        },
      });

      return { ...usuario, aluno, professor: null, coordenador: null };
    });
  }

  createProfessor(data: CreateProfessorData): Promise<UsuarioComRelacoes> {
    return this.prisma.$transaction(async (tx: TransactionClient) => {
      const usuario = await tx.usuario.create({
        data: {
          nome: data.nome,
          email: data.email,
          senha_hash: data.senha_hash,
          role: Role.PROFESSOR,
        },
      });

      const professor = await tx.professor.create({
        data: {
          usuario_id: usuario.id,
          escola_id: data.escola_id,
          coordenador_id: data.coordenador_id,
        },
      });

      return { ...usuario, aluno: null, professor, coordenador: null };
    });
  }

  createCoordenador(data: CreateCoordenadorData): Promise<UsuarioComRelacoes> {
    return this.prisma.$transaction(async (tx: TransactionClient) => {
      const usuario = await tx.usuario.create({
        data: {
          nome: data.nome,
          email: data.email,
          senha_hash: data.senha_hash,
          role: Role.COORDENADOR,
        },
      });

      const coordenador = await tx.coordenador.create({
        data: {
          usuario_id: usuario.id,
          escola_id: data.escola_id,
        },
      });

      return { ...usuario, aluno: null, professor: null, coordenador };
    });
  }

  async update(
    id: number,
    role: Role,
    usuarioData: UpdateUsuarioData,
    subtableData: UpdateSubtabelaData,
  ): Promise<UsuarioComRelacoes> {
    return this.prisma.$transaction(async (tx: TransactionClient) => {
      await tx.usuario.update({
        where: { id },
        data: usuarioData,
      });

      if (
        role === Role.ALUNO &&
        (subtableData.turma_id !== undefined || subtableData.turno !== undefined)
      ) {
        await tx.aluno.update({
          where: { usuario_id: id },
          data: {
            turma_id: subtableData.turma_id,
            turno: subtableData.turno,
          },
        });
      }

      if (
        role === Role.PROFESSOR &&
        (subtableData.escola_id !== undefined || subtableData.coordenador_id !== undefined)
      ) {
        await tx.professor.update({
          where: { usuario_id: id },
          data: {
            escola_id: subtableData.escola_id,
            coordenador_id: subtableData.coordenador_id,
          },
        });
      }

      if (role === Role.COORDENADOR && subtableData.escola_id !== undefined) {
        await tx.coordenador.update({
          where: { usuario_id: id },
          data: { escola_id: subtableData.escola_id },
        });
      }

      return tx.usuario.findUniqueOrThrow({
        where: { id },
        include: INCLUDE_RELACOES,
      });
    });
  }

  async delete(id: number): Promise<void> {
    await this.prisma.usuario.delete({ where: { id } });
  }
}
