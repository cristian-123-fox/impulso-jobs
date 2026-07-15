import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { In, Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '@/common/filters/all-exceptions.filter';
import { ResponseInterceptor } from '@/common/interceptors/response.interceptor';
import { ErrorCode } from '@/common/types/error-code.enum';
import { Role as RoleEnum } from '@/common/types/role.enum';
import { UserStatus } from '@/common/types/user-status.enum';
import { hashPassword } from '@/common/utils/password.util';
import { User } from '@/modules/iam/users/entities/user.entity';
import { UserRole } from '@/modules/iam/users/entities/user-role.entity';
import { Role } from '@/modules/iam/roles/entities/role.entity';

describe('Roles / RBAC (e2e)', () => {
  let app: INestApplication;
  let userRepo: Repository<User>;
  let userRoleRepo: Repository<UserRole>;
  let roleRepo: Repository<Role>;

  const password = 'Secreta#123';
  const stamp = Date.now();
  const adminEmail = `e2e-rbac-admin-${stamp}@test.io`;
  const employerEmail = `e2e-rbac-emp-${stamp}@test.io`;
  const emails = [adminEmail, employerEmail];
  const createdRoleCode = `E2E_ROLE_${stamp}`;

  let adminToken = '';
  let employerToken = '';

  const server = () => app.getHttpServer();
  const login = (email: string) =>
    request(server()).post('/api/v1/auth/login').send({ email, password });
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalInterceptors(new ResponseInterceptor(app.get(Reflector)));
    await app.init();

    userRepo = moduleRef.get(getRepositoryToken(User));
    userRoleRepo = moduleRef.get(getRepositoryToken(UserRole));
    roleRepo = moduleRef.get(getRepositoryToken(Role));

    await userRepo.delete({ email: In(emails) });
    await roleRepo.delete({ code: createdRoleCode });

    const hash = await hashPassword(password);
    const admin = await userRepo.save(
      userRepo.create({
        email: adminEmail,
        passwordHash: hash,
        role: RoleEnum.ADMIN,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
      }),
    );
    const employer = await userRepo.save(
      userRepo.create({
        email: employerEmail,
        passwordHash: hash,
        role: RoleEnum.EMPLOYER,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
      }),
    );
    const adminRole = await roleRepo.findOneOrFail({
      where: { code: 'ADMIN' },
    });
    const employerRole = await roleRepo.findOneOrFail({
      where: { code: 'EMPLOYER' },
    });
    await userRoleRepo.save(
      userRoleRepo.create({ userId: admin.id, roleId: adminRole.id }),
    );
    await userRoleRepo.save(
      userRoleRepo.create({ userId: employer.id, roleId: employerRole.id }),
    );

    adminToken = (await login(adminEmail).expect(200)).body.content.accessToken;
    employerToken = (await login(employerEmail).expect(200)).body.content
      .accessToken;
  });

  afterAll(async () => {
    if (roleRepo) await roleRepo.delete({ code: createdRoleCode });
    if (userRepo) await userRepo.delete({ email: In(emails) });
    await app?.close();
  });

  it('ADMIN lista los roles (incluye los base)', async () => {
    const res = await request(server())
      .get('/api/v1/roles')
      .set(auth(adminToken))
      .expect(200);
    const codes: string[] = res.body.content.map(
      (r: { code: string }) => r.code,
    );
    expect(codes).toEqual(
      expect.arrayContaining(['ADMIN', 'EMPLOYER', 'CANDIDATE']),
    );
  });

  it('ADMIN crea un rol nuevo', async () => {
    const res = await request(server())
      .post('/api/v1/roles')
      .set(auth(adminToken))
      .send({ code: createdRoleCode, name: 'Rol e2e' })
      .expect(201);
    expect(res.body.content.code).toBe(createdRoleCode);
    expect(res.body.content.isSystem).toBe(false);
  });

  it('rechaza un código de rol duplicado (409)', async () => {
    const res = await request(server())
      .post('/api/v1/roles')
      .set(auth(adminToken))
      .send({ code: 'ADMIN', name: 'Duplicado' })
      .expect(409);
    expect(res.body.errorCode).toBe(ErrorCode.ROLE_ALREADY_EXISTS);
  });

  it('EMPLOYER sin permiso NO puede crear roles (403) — prueba negativa del guard', async () => {
    const res = await request(server())
      .post('/api/v1/roles')
      .set(auth(employerToken))
      .send({ code: 'X_ROLE', name: 'X' })
      .expect(403);
    expect(res.body.errorCode).toBe(ErrorCode.PERMISSION_DENIED);
  });

  it('EMPLOYER tampoco puede listar roles (403)', async () => {
    await request(server())
      .get('/api/v1/roles')
      .set(auth(employerToken))
      .expect(403);
  });

  it('sin token de acceso → 401', async () => {
    await request(server()).get('/api/v1/roles').expect(401);
  });
});
