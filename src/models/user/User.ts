import { Role } from '../../generated/enums';
import {
  UpdateSubtabelaData,
  UpdateUsuarioData,
  UserRepository,
} from '../../repositories/user/UserRepository';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from './errors';
import { hashPassword } from './hash';
import { createUserSchema, updateUserSchema } from './schemas/user.schema';
import { AuthenticatedActor, SafeUser, UsuarioComRelacoes } from './types/user.types';

export class UserService {
  constructor(private readonly repository: UserRepository) {}

  async create(actor: AuthenticatedActor, rawPayload: unknown): Promise<SafeUser> {
    const parsed = createUserSchema.safeParse(rawPayload);
    if (!parsed.success) {
      throw new ValidationError('Dados inválidos para criação de usuário', parsed.error.issues);
    }
    const payload = parsed.data;

    if (actor.role === Role.ALUNO) {
      throw new ForbiddenError('Alunos não podem criar usuários');
    }

    const existing = await this.repository.findByEmail(payload.email);
    if (existing) {
      throw new ConflictError();
    }

    const senha_hash = await hashPassword(payload.senha);

    if (payload.role === Role.ALUNO) {
      const usuario = await this.repository.createAluno({
        nome: payload.nome,
        email: payload.email,
        senha_hash,
        turma_id: payload.turma_id,
        turno: payload.turno,
      });
      return this.toSafeUser(usuario);
    }

    if (actor.role !== Role.COORDENADOR) {
      throw new ForbiddenError('Apenas coordenadores podem criar professores ou coordenadores');
    }

    const coordenador = await this.repository.findCoordenadorByUsuarioId(actor.userId);
    if (!coordenador) {
      throw new ForbiddenError('Coordenador autenticado não encontrado');
    }

    if (payload.role === Role.PROFESSOR) {
      const usuario = await this.repository.createProfessor({
        nome: payload.nome,
        email: payload.email,
        senha_hash,
        escola_id: coordenador.escola_id,
        coordenador_id: coordenador.id,
      });
      return this.toSafeUser(usuario);
    }

    const usuario = await this.repository.createCoordenador({
      nome: payload.nome,
      email: payload.email,
      senha_hash,
      escola_id: payload.escola_id,
    });
    return this.toSafeUser(usuario);
  }

  async getMe(actor: AuthenticatedActor): Promise<SafeUser> {
    const usuario = await this.repository.findById(actor.userId);
    if (!usuario) {
      throw new NotFoundError();
    }
    return this.toSafeUser(usuario);
  }

  async getById(actor: AuthenticatedActor, targetId: number): Promise<SafeUser> {
    if (actor.role !== Role.COORDENADOR && actor.userId !== targetId) {
      throw new ForbiddenError();
    }

    const usuario = await this.repository.findById(targetId);
    if (!usuario) {
      throw new NotFoundError();
    }
    return this.toSafeUser(usuario);
  }

  async list(actor: AuthenticatedActor): Promise<SafeUser[]> {
    if (actor.role !== Role.COORDENADOR) {
      throw new ForbiddenError();
    }

    const usuarios = await this.repository.list();
    return usuarios.map((usuario) => this.toSafeUser(usuario));
  }

  async update(
    actor: AuthenticatedActor,
    targetId: number,
    rawPayload: unknown,
  ): Promise<SafeUser> {
    if (actor.role !== Role.COORDENADOR) {
      throw new ForbiddenError();
    }

    const target = await this.repository.findById(targetId);
    if (!target) {
      throw new NotFoundError();
    }

    const parsed = updateUserSchema.safeParse(rawPayload);
    if (!parsed.success) {
      throw new ValidationError('Dados inválidos para atualização de usuário', parsed.error.issues);
    }
    const payload = parsed.data;

    if (payload.email && payload.email !== target.email) {
      const existing = await this.repository.findByEmail(payload.email);
      if (existing) {
        throw new ConflictError();
      }
    }

    const usuarioData: UpdateUsuarioData = {
      nome: payload.nome,
      email: payload.email,
      ativo: payload.ativo,
    };
    if (payload.senha) {
      usuarioData.senha_hash = await hashPassword(payload.senha);
    }

    const subtableData: UpdateSubtabelaData = {
      turma_id: payload.turma_id,
      turno: payload.turno,
      escola_id: payload.escola_id,
      coordenador_id: payload.coordenador_id,
    };

    const updated = await this.repository.update(targetId, target.role, usuarioData, subtableData);
    return this.toSafeUser(updated);
  }

  async delete(actor: AuthenticatedActor, targetId: number): Promise<void> {
    if (actor.role !== Role.COORDENADOR) {
      throw new ForbiddenError();
    }

    const target = await this.repository.findById(targetId);
    if (!target) {
      throw new NotFoundError();
    }

    await this.repository.delete(targetId);
  }

  private toSafeUser(usuario: UsuarioComRelacoes): SafeUser {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { senha_hash, ...safeUser } = usuario;
    return safeUser;
  }
}
