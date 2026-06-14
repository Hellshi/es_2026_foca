import { Role, Turno } from '../../generated/enums';
import { UserRepository } from '../../repositories/user/UserRepository';
import { UserService } from './User';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from './errors';
import { UsuarioComRelacoes } from './types/user.types';

jest.mock('../../repositories/user/UserRepository');

function makeUsuario(overrides: Partial<UsuarioComRelacoes> = {}): UsuarioComRelacoes {
  return {
    id: 1,
    nome: 'Fulano',
    email: 'fulano@example.com',
    senha_hash: 'hashed',
    role: Role.ALUNO,
    ativo: true,
    criado_em: new Date(),
    aluno: null,
    professor: null,
    coordenador: null,
    ...overrides,
  };
}

describe('UserService', () => {
  let repository: jest.Mocked<UserRepository>;
  let service: UserService;

  beforeEach(() => {
    repository = new UserRepository(undefined as never) as jest.Mocked<UserRepository>;
    service = new UserService(repository);
  });

  describe('create', () => {
    const alunoPayload = {
      nome: 'Aluno Teste',
      email: 'aluno@example.com',
      senha: 'senha1234',
      role: Role.ALUNO,
      turma_id: 1,
      turno: Turno.MANHA,
    };

    it('rejeita payload inválido', async () => {
      const actor = { userId: 1, role: Role.COORDENADOR };
      await expect(service.create(actor, { role: Role.ALUNO })).rejects.toThrow(ValidationError);
    });

    it('Aluno não pode criar nenhum usuário', async () => {
      const actor = { userId: 1, role: Role.ALUNO };
      await expect(service.create(actor, alunoPayload)).rejects.toThrow(ForbiddenError);
    });

    it('Professor pode criar Aluno', async () => {
      const actor = { userId: 2, role: Role.PROFESSOR };
      repository.findByEmail.mockResolvedValue(null);
      repository.createAluno.mockResolvedValue(
        makeUsuario({
          email: alunoPayload.email,
          aluno: { id: 1, usuario_id: 1, turma_id: 1, turno: Turno.MANHA },
        }),
      );

      const result = await service.create(actor, alunoPayload);

      expect(repository.createAluno).toHaveBeenCalledWith(
        expect.objectContaining({ turma_id: 1, turno: Turno.MANHA, email: alunoPayload.email }),
      );
      expect(result).not.toHaveProperty('senha_hash');
    });

    it('Professor não pode criar Professor', async () => {
      const actor = { userId: 2, role: Role.PROFESSOR };
      repository.findByEmail.mockResolvedValue(null);

      await expect(
        service.create(actor, {
          nome: 'Prof Teste',
          email: 'prof@example.com',
          senha: 'senha1234',
          role: Role.PROFESSOR,
        }),
      ).rejects.toThrow(ForbiddenError);
    });

    it('Coordenador cria Professor herdando escola e vínculo do coordenador', async () => {
      const actor = { userId: 3, role: Role.COORDENADOR };
      repository.findByEmail.mockResolvedValue(null);
      repository.findCoordenadorByUsuarioId.mockResolvedValue({
        id: 10,
        usuario_id: 3,
        escola_id: 99,
      });
      repository.createProfessor.mockResolvedValue(
        makeUsuario({
          role: Role.PROFESSOR,
          professor: { id: 1, usuario_id: 1, escola_id: 99, coordenador_id: 10 },
        }),
      );

      await service.create(actor, {
        nome: 'Prof Teste',
        email: 'prof@example.com',
        senha: 'senha1234',
        role: Role.PROFESSOR,
      });

      expect(repository.createProfessor).toHaveBeenCalledWith(
        expect.objectContaining({ escola_id: 99, coordenador_id: 10 }),
      );
    });

    it('Coordenador cria Coordenador usando escola_id do payload', async () => {
      const actor = { userId: 3, role: Role.COORDENADOR };
      repository.findByEmail.mockResolvedValue(null);
      repository.findCoordenadorByUsuarioId.mockResolvedValue({
        id: 10,
        usuario_id: 3,
        escola_id: 99,
      });
      repository.createCoordenador.mockResolvedValue(
        makeUsuario({
          role: Role.COORDENADOR,
          coordenador: { id: 2, usuario_id: 1, escola_id: 50 },
        }),
      );

      await service.create(actor, {
        nome: 'Coord Teste',
        email: 'coord@example.com',
        senha: 'senha1234',
        role: Role.COORDENADOR,
        escola_id: 50,
      });

      expect(repository.createCoordenador).toHaveBeenCalledWith(
        expect.objectContaining({ escola_id: 50 }),
      );
    });

    it('rejeita email duplicado', async () => {
      const actor = { userId: 2, role: Role.PROFESSOR };
      repository.findByEmail.mockResolvedValue(makeUsuario());

      await expect(service.create(actor, alunoPayload)).rejects.toThrow(ConflictError);
    });
  });

  describe('getMe', () => {
    it('retorna o próprio usuário sem senha_hash', async () => {
      const actor = { userId: 1, role: Role.ALUNO };
      repository.findById.mockResolvedValue(makeUsuario());

      const result = await service.getMe(actor);

      expect(result).not.toHaveProperty('senha_hash');
      expect(repository.findById).toHaveBeenCalledWith(1);
    });

    it('lança NotFoundError se usuário não existir', async () => {
      const actor = { userId: 1, role: Role.ALUNO };
      repository.findById.mockResolvedValue(null);

      await expect(service.getMe(actor)).rejects.toThrow(NotFoundError);
    });
  });

  describe('getById', () => {
    it('Coordenador pode ver qualquer usuário', async () => {
      const actor = { userId: 1, role: Role.COORDENADOR };
      repository.findById.mockResolvedValue(makeUsuario({ id: 5 }));

      const result = await service.getById(actor, 5);
      expect(result.id).toBe(5);
    });

    it('Aluno não pode ver perfil de outro usuário', async () => {
      const actor = { userId: 1, role: Role.ALUNO };

      await expect(service.getById(actor, 5)).rejects.toThrow(ForbiddenError);
    });

    it('Aluno pode ver o próprio perfil', async () => {
      const actor = { userId: 1, role: Role.ALUNO };
      repository.findById.mockResolvedValue(makeUsuario({ id: 1 }));

      const result = await service.getById(actor, 1);
      expect(result.id).toBe(1);
    });
  });

  describe('list', () => {
    it('apenas Coordenador pode listar usuários', async () => {
      const aluno = { userId: 1, role: Role.ALUNO };
      const coordenador = { userId: 2, role: Role.COORDENADOR };
      repository.list.mockResolvedValue([makeUsuario()]);

      await expect(service.list(aluno)).rejects.toThrow(ForbiddenError);
      await expect(service.list(coordenador)).resolves.toHaveLength(1);
    });
  });

  describe('update', () => {
    it('apenas Coordenador pode atualizar usuários', async () => {
      const actor = { userId: 1, role: Role.PROFESSOR };

      await expect(service.update(actor, 5, { nome: 'Novo nome' })).rejects.toThrow(ForbiddenError);
    });

    it('lança NotFoundError se usuário alvo não existir', async () => {
      const actor = { userId: 1, role: Role.COORDENADOR };
      repository.findById.mockResolvedValue(null);

      await expect(service.update(actor, 5, { nome: 'Novo nome' })).rejects.toThrow(NotFoundError);
    });

    it('hasheia a senha antes de atualizar', async () => {
      const actor = { userId: 1, role: Role.COORDENADOR };
      const target = makeUsuario({ id: 5 });
      repository.findById.mockResolvedValue(target);
      repository.update.mockResolvedValue(target);

      await service.update(actor, 5, { senha: 'novaSenha123' });

      const [, , usuarioData] = repository.update.mock.calls[0];
      expect(usuarioData.senha_hash).toBeDefined();
      expect(usuarioData.senha_hash).not.toBe('novaSenha123');
    });
  });

  describe('delete', () => {
    it('apenas Coordenador pode deletar usuários', async () => {
      const actor = { userId: 1, role: Role.PROFESSOR };

      await expect(service.delete(actor, 5)).rejects.toThrow(ForbiddenError);
    });

    it('lança NotFoundError se usuário alvo não existir', async () => {
      const actor = { userId: 1, role: Role.COORDENADOR };
      repository.findById.mockResolvedValue(null);

      await expect(service.delete(actor, 5)).rejects.toThrow(NotFoundError);
    });

    it('deleta o usuário quando encontrado', async () => {
      const actor = { userId: 1, role: Role.COORDENADOR };
      repository.findById.mockResolvedValue(makeUsuario({ id: 5 }));

      await service.delete(actor, 5);

      expect(repository.delete).toHaveBeenCalledWith(5);
    });
  });
});
