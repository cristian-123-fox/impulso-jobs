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
import { Role } from '@/common/types/role.enum';
import { UserStatus } from '@/common/types/user-status.enum';
import { hashPassword } from '@/common/utils/password.util';
import { User } from '@/modules/iam/users/entities/user.entity';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let users: Repository<User>;

  const password = 'Secreta#123';
  const stamp = Date.now();
  const verifiedEmail = `e2e-verified-${stamp}@test.io`;
  const unverifiedEmail = `e2e-unverified-${stamp}@test.io`;
  const blockEmail = `e2e-block-${stamp}@test.io`;
  const seededEmails = [verifiedEmail, unverifiedEmail, blockEmail];

  let accessToken: string;
  let refreshToken: string;

  const server = () => app.getHttpServer();
  const login = (email: string, pass: string) =>
    request(server())
      .post('/api/v1/auth/login')
      .send({ email, password: pass });

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

    users = moduleRef.get<Repository<User>>(getRepositoryToken(User));
    await users.delete({ email: In(seededEmails) });

    const hash = await hashPassword(password);
    await users.save([
      users.create({
        email: verifiedEmail,
        passwordHash: hash,
        role: Role.CANDIDATE,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
      }),
      users.create({
        email: unverifiedEmail,
        passwordHash: hash,
        role: Role.EMPLOYER,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: null,
      }),
      users.create({
        email: blockEmail,
        passwordHash: hash,
        role: Role.CANDIDATE,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
      }),
    ]);
  });

  afterAll(async () => {
    if (users) await users.delete({ email: In(seededEmails) });
    await app?.close();
  });

  it('POST /auth/login inicia sesión y devuelve access + refresh', async () => {
    const res = await login(verifiedEmail, password).expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.content.accessToken).toEqual(expect.any(String));
    expect(res.body.content.refreshToken).toEqual(expect.any(String));
    expect(res.body.content.user).toMatchObject({
      email: verifiedEmail,
      role: Role.CANDIDATE,
    });
    accessToken = res.body.content.accessToken;
    refreshToken = res.body.content.refreshToken;
  });

  it('bloquea la cuenta tras 3 intentos fallidos', async () => {
    await login(blockEmail, 'WrongPass#1').expect(401);
    await login(blockEmail, 'WrongPass#1').expect(401);
    const third = await login(blockEmail, 'WrongPass#1').expect(423);
    expect(third.body.errorCode).toBe(ErrorCode.AUTH_ACCOUNT_BLOCKED);

    // Incluso con la contraseña correcta, sigue bloqueada.
    const blocked = await login(blockEmail, password).expect(423);
    expect(blocked.body.errorCode).toBe(ErrorCode.AUTH_ACCOUNT_BLOCKED);
  });

  it('rechaza el login si el correo no está verificado', async () => {
    const res = await login(unverifiedEmail, password).expect(403);
    expect(res.body.errorCode).toBe(ErrorCode.AUTH_EMAIL_NOT_VERIFIED);
  });

  it('POST /auth/refresh devuelve un nuevo access token', async () => {
    const res = await request(server())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken })
      .expect(200);
    expect(res.body.content.accessToken).toEqual(expect.any(String));
  });

  it('POST /auth/logout revoca los tokens y la blacklist los rechaza', async () => {
    await request(server())
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ refreshToken })
      .expect(200);

    // El refresh revocado ya no sirve.
    const refused = await request(server())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken })
      .expect(401);
    expect(refused.body.errorCode).toBe(ErrorCode.AUTH_TOKEN_REVOKED);

    // El access revocado es rechazado por el guard en una ruta protegida.
    const guarded = await request(server())
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ refreshToken })
      .expect(401);
    expect(guarded.body.errorCode).toBe(ErrorCode.AUTH_TOKEN_REVOKED);
  });
});
