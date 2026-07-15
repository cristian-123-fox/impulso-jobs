import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { AuditService } from '@/modules/audit/audit.service';
import { Role } from '@/modules/iam/roles/entities/role.entity';
import { IRoleRepository } from '@/modules/iam/roles/repositories/role.repository.interface';
import { CreateRoleUseCase } from '@/modules/iam/roles/use-cases/create-role.use-case';

describe('CreateRoleUseCase', () => {
  let roles: jest.Mocked<IRoleRepository>;
  let audit: jest.Mocked<AuditService>;
  let useCase: CreateRoleUseCase;

  beforeEach(() => {
    roles = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByCode: jest.fn(),
      findByIds: jest.fn(),
      existsByCode: jest.fn(),
      save: jest.fn((role: Role) =>
        Promise.resolve(Object.assign(role, { id: 'new-id' })),
      ),
    };
    audit = { record: jest.fn() } as unknown as jest.Mocked<AuditService>;
    useCase = new CreateRoleUseCase(roles, audit);
  });

  const command = {
    code: 'content_manager',
    name: 'Gestor de contenidos',
    actorUserId: 'admin-1',
    ip: '127.0.0.1',
    userAgent: 'jest',
  };

  it('crea un rol normalizando el código a mayúsculas', async () => {
    roles.existsByCode.mockResolvedValue(false);

    const role = await useCase.execute(command);

    expect(role.code).toBe('CONTENT_MANAGER');
    expect(role.isSystem).toBe(false);
    expect(roles.save).toHaveBeenCalledTimes(1);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'roles.create' }),
    );
  });

  it('rechaza un código duplicado con 409', async () => {
    roles.existsByCode.mockResolvedValue(true);

    const thrown = await useCase
      .execute({ ...command, code: 'ADMIN' })
      .catch((e: unknown) => e);
    expect(thrown).toBeInstanceOf(AppException);
    expect((thrown as AppException).getStatus()).toBe(409);
    expect((thrown as AppException).getResponse()).toMatchObject({
      errorCode: ErrorCode.ROLE_ALREADY_EXISTS,
    });
    expect(roles.save).not.toHaveBeenCalled();
  });
});
