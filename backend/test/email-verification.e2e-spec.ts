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

describe('Email verification (e2e)', () => {
  let app: INestApplication;
  let userRepo: Repository<User>;

  let capturedLink = '';
  const sendEmailVerification = jest.fn((email: { link: string }) => {
    capturedLink = email.link;
    return Promise.resolve();
  });
  const mailer = { sendEmailVerification, sendPasswordReset: jest.fn() };

  const password = 'Secreta#123';
  const stamp = Date.now();
  const email = `e2e-verify-${stamp}@test.io`;
  const rlEmail = `e2e-verify-rl-${stamp}@test.io`;

  let verifyToken = '';

  const server = () => app.getHttpServer();
  const req = () => request(server());

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MAILER_PORT)
      .useValue(mailer)
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
    await userRepo.delete({ email: In([email, rlEmail]) });
    const passwordHash = await hashPassword(password);
    // Ambos usuarios inician SIN verificar (email_verified_at NULL).
    await userRepo.save([
      userRepo.create({
        email,
        passwordHash,
        role: RoleEnum.CANDIDATE,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: null,
      }),
      userRepo.create({
        email: rlEmail,
        passwordHash,
        role: RoleEnum.CANDIDATE,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: null,
      }),
    ]);
  });

  afterAll(async () => {
    if (userRepo) await userRepo.delete({ email: In([email, rlEmail]) });
    await app?.close();
  });

  it('rechaza el login mientras el correo no esté verificado (DoD)', async () => {
    const res = await req()
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(403);
    expect(res.body.errorCode).toBe(ErrorCode.AUTH_EMAIL_NOT_VERIFIED);
  });

  it('resend devuelve respuesta genérica y emite el enlace', async () => {
    const res = await req()
      .post('/api/v1/auth/email-verification/resend')
      .send({ email })
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(sendEmailVerification).toHaveBeenCalled();
    verifyToken = new URL(capturedLink).searchParams.get('token') ?? '';
    expect(verifyToken.length).toBeGreaterThan(20);
  });

  it('confirm marca el timestamp y verifica la cuenta (DoD)', async () => {
    const res = await req()
      .get('/api/v1/auth/email-verification/confirm')
      .query({ token: verifyToken })
      .expect(200);
    expect(res.body.content.alreadyVerified).toBe(false);

    const saved = await userRepo.findOneByOrFail({ email });
    expect(saved.emailVerifiedAt).toBeTruthy();
  });

  it('el token NO es reutilizable (DoD)', async () => {
    const res = await req()
      .get('/api/v1/auth/email-verification/confirm')
      .query({ token: verifyToken })
      .expect(400);
    expect(res.body.errorCode).toBe(ErrorCode.AUTH_INVALID_VERIFICATION_TOKEN);
  });

  it('permite iniciar sesión una vez verificado', async () => {
    await req()
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);
  });

  it('rechaza un token manipulado', async () => {
    const res = await req()
      .get('/api/v1/auth/email-verification/confirm')
      .query({ token: `${verifyToken}tampered` })
      .expect(400);
    expect(res.body.success).toBe(false);
  });

  it('aplica el límite de 3 reenvíos por 24h', async () => {
    const before = sendEmailVerification.mock.calls.length;
    for (let i = 0; i < 4; i++) {
      await req()
        .post('/api/v1/auth/email-verification/resend')
        .send({ email: rlEmail })
        .expect(200);
    }
    expect(sendEmailVerification.mock.calls.length - before).toBe(3);
  });
});
