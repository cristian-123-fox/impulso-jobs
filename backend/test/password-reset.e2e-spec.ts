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
import { MAILER_PORT } from '@/modules/iam/auth/services/mailer.port';
import { User } from '@/modules/iam/users/entities/user.entity';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('Password reset (e2e)', () => {
  let app: INestApplication;
  let userRepo: Repository<User>;

  let capturedLink = '';
  const sendPasswordReset = jest.fn((email: { link: string }) => {
    capturedLink = email.link;
    return Promise.resolve();
  });

  const password = 'Secreta#123';
  const newPassword = 'NuevaClave#456';
  const stamp = Date.now();
  const email = `e2e-reset-${stamp}@test.io`;

  let oldAccess = '';
  let oldRefresh = '';
  let resetToken = '';

  const server = () => app.getHttpServer();
  const req = () => request(server());

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MAILER_PORT)
      .useValue({ sendPasswordReset })
      .compile();

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
    await userRepo.delete({ email: In([email]) });
    await userRepo.save(
      userRepo.create({
        email,
        passwordHash: await hashPassword(password),
        role: RoleEnum.CANDIDATE,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
      }),
    );

    const login = await req()
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);
    oldAccess = login.body.content.accessToken;
    oldRefresh = login.body.content.refreshToken;

    // Garantiza que el reset ocurra en un segundo posterior al login (iat).
    await sleep(1100);
  });

  afterAll(async () => {
    if (userRepo) await userRepo.delete({ email: In([email]) });
    await app?.close();
  });

  it('request devuelve respuesta genérica y emite el enlace', async () => {
    const res = await req()
      .post('/api/v1/auth/password-reset/request')
      .send({ email })
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(sendPasswordReset).toHaveBeenCalled();
    resetToken = new URL(capturedLink).searchParams.get('token') ?? '';
    expect(resetToken.length).toBeGreaterThan(20);
  });

  it('validate acepta el token', async () => {
    const res = await req()
      .post('/api/v1/auth/password-reset/validate')
      .send({ token: resetToken })
      .expect(200);
    expect(res.body.content.valid).toBe(true);
  });

  it('confirm rechaza si las contraseñas no coinciden', async () => {
    const res = await req()
      .post('/api/v1/auth/password-reset/confirm')
      .send({ token: resetToken, newPassword, confirmPassword: 'Distinta#9' })
      .expect(400);
    expect(res.body.errorCode).toBe(ErrorCode.AUTH_PASSWORD_MISMATCH);
  });

  it('confirm cambia la contraseña', async () => {
    await req()
      .post('/api/v1/auth/password-reset/confirm')
      .send({ token: resetToken, newPassword, confirmPassword: newPassword })
      .expect(200);
  });

  it('el token NO es reutilizable (DoD)', async () => {
    const res = await req()
      .post('/api/v1/auth/password-reset/confirm')
      .send({ token: resetToken, newPassword, confirmPassword: newPassword })
      .expect(400);
    expect(res.body.errorCode).toBe(ErrorCode.AUTH_INVALID_RESET_TOKEN);
  });

  it('invalida las sesiones previas: refresh anterior rechazado (DoD)', async () => {
    const res = await req()
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: oldRefresh })
      .expect(401);
    expect(res.body.errorCode).toBe(ErrorCode.AUTH_TOKEN_REVOKED);
  });

  it('invalida las sesiones previas: access anterior rechazado', async () => {
    const res = await req()
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${oldAccess}`)
      .send({ refreshToken: oldRefresh })
      .expect(401);
    expect(res.body.errorCode).toBe(ErrorCode.AUTH_TOKEN_REVOKED);
  });

  it('permite iniciar sesión con la nueva contraseña y rechaza la anterior', async () => {
    await req()
      .post('/api/v1/auth/login')
      .send({ email, password: newPassword })
      .expect(200);
    await req()
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(401);
  });

  it('aplica el límite de 3 solicitudes por 24h', async () => {
    const before = sendPasswordReset.mock.calls.length;
    for (let i = 0; i < 4; i++) {
      await req()
        .post('/api/v1/auth/password-reset/request')
        .send({ email })
        .expect(200);
    }
    expect(sendPasswordReset.mock.calls.length - before).toBe(3);
  });
});
