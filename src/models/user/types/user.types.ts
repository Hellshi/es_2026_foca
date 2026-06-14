import {
  AlunoModel,
  CoordenadorModel,
  ProfessorModel,
  UsuarioModel,
} from '../../../generated/models';
import { AuthorizeResponse } from '../../auth/types/authenticate.type';

export type AuthenticatedActor = AuthorizeResponse;

export type UsuarioComRelacoes = UsuarioModel & {
  aluno: AlunoModel | null;
  professor: ProfessorModel | null;
  coordenador: CoordenadorModel | null;
};

export type SafeUser = Omit<UsuarioComRelacoes, 'senha_hash'>;
