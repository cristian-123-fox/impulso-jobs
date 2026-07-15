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
import { Role as PlatformRole } from '@/common/types/role.enum';
import { MAILER_PORT } from '@/modules/iam/auth/services/mailer.port';
import { User } from '@/modules/iam/users/entities/user.entity';
import { UserRole } from '@/modules/iam/users/entities/user-role.entity';
import { Company } from '@/modules/companies/entities/company.entity';
import { CompanyUser } from '@/modules/companies/entities/company-user.entity';
import { CandidateProfile } from '@/modules/candidates/entities/candidate-profile.entity';
import { CompanyMemberRole } from '@/modules/companies/enums/company-member-role.enum';

describe('Register (e2e)', () => {
  let app: INestApplication;
  let userRepo: Repository<User>;
  let userRoleRepo: Repository<UserRole>;
  let companyRepo: Repository<Company>;
  let companyUserRepo: Repository<CompanyUser>;
  let profileRepo: Repository<CandidateProfile>;

  const sendEmailVerification = jest.fn().mockResolvedValue(undefined);
  const mailer = { sendEmailVerification, sendPasswordReset: jest.fn() };

  const stamp = Date.now();
  const suffix6 = String(stamp % 1000000).padStart(6, '0');
  const companyEmail = `m5-co-${stamp}@test.io`;
  const companyEmail2 = `m5-co2-${stamp}@test.io`;
  const candidateEmail = `m5-ca-${stamp}@test.io`;
  const candidateEmail2 = `m5-ca2-${stamp}@test.io`;
  const rfc = `ITA${suffix6}AB2`;
  const documentNumber = `GARA${suffix6}MJCXXX09`;
  const allEmails = [
    companyEmail,
    companyEmail2,
    candidateEmail,
    candidateEmail2,
  ];

  const companyBody = {
    accountType: 'company',
    email: companyEmail,
    password: 'Secreta#123',
    company: {
      businessName: 'Impulso Talent',
      legalName: 'Impulso Talent SA de CV',
      rfc,
      taxRegime: '601',
      postalCode: '44100',
      state: 'JAL',
      municipality: 'Guadalajara',
    },
  };

  const candidateBody = {
    accountType: 'candidate',
    email: candidateEmail,
    password: 'Secreta#123',
    candidate: {
      firstName: 'Ana',
      lastName: 'García',
      documentType: 'CURP',
      documentNumber,
      curp: documentNumber,
      birthDate: '1990-05-20',
      state: 'JAL',
      municipality: 'Zapopan',
    },
  };

  const req = () => request(app.getHttpServer());

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
    userRoleRepo = moduleRef.get(getRepositoryToken(UserRole));
    companyRepo = moduleRef.get(getRepositoryToken(Company));
    companyUserRepo = moduleRef.get(getRepositoryToken(CompanyUser));
    profileRepo = moduleRef.get(getRepositoryToken(CandidateProfile));

    await cleanup();
  });

  async function cleanup(): Promise<void> {
    const users = await userRepo.find({ where: { email: In(allEmails) } });
    const ids = users.map((u) => u.id);
    if (ids.length) await userRoleRepo.delete({ userId: In(ids) });
    await companyRepo.delete({ rfc: In([rfc]) });
    await userRepo.delete({ email: In(allEmails) });
  }

  afterAll(async () => {
    if (userRepo) await cleanup();
    await app?.close();
  });

  it('registra una EMPRESA en una transacción y dispara verificación', async () => {
    const res = await req()
      .post('/api/v1/auth/register')
      .send(companyBody)
      .expect(201);

    expect(res.body.content).toMatchObject({
      accountType: 'company',
      email: companyEmail,
      verificationRequired: true,
    });
    expect(sendEmailVerification).toHaveBeenCalled();

    const user = await userRepo.findOneByOrFail({ email: companyEmail });
    expect(user.role).toBe(PlatformRole.EMPLOYER);
    expect(user.emailVerifiedAt).toBeNull();

    const company = await companyRepo.findOneByOrFail({ rfc });
    const member = await companyUserRepo.findOneByOrFail({
      companyId: company.id,
      userId: user.id,
    });
    expect(member.role).toBe(CompanyMemberRole.OWNER);

    const rolesCount = await userRoleRepo.count({ where: { userId: user.id } });
    expect(rolesCount).toBe(1);
  });

  it('registra un CANDIDATO y dispara verificación', async () => {
    const before = sendEmailVerification.mock.calls.length;
    const res = await req()
      .post('/api/v1/auth/register')
      .send(candidateBody)
      .expect(201);

    expect(res.body.content.accountType).toBe('candidate');
    expect(sendEmailVerification.mock.calls.length).toBe(before + 1);

    const user = await userRepo.findOneByOrFail({ email: candidateEmail });
    expect(user.role).toBe(PlatformRole.CANDIDATE);
    expect(user.emailVerifiedAt).toBeNull();

    const profile = await profileRepo.findOneByOrFail({ userId: user.id });
    expect(profile.documentNumber).toBe(documentNumber);
  });

  it('bloquea el login hasta verificar (coordina M4)', async () => {
    const res = await req()
      .post('/api/v1/auth/login')
      .send({ email: candidateEmail, password: 'Secreta#123' })
      .expect(403);
    expect(res.body.errorCode).toBe(ErrorCode.AUTH_EMAIL_NOT_VERIFIED);
  });

  it('rechaza correo duplicado (409)', async () => {
    const res = await req()
      .post('/api/v1/auth/register')
      .send(companyBody)
      .expect(409);
    expect(res.body.errorCode).toBe(ErrorCode.AUTH_EMAIL_ALREADY_EXISTS);
  });

  it('rechaza RFC duplicado (409)', async () => {
    const res = await req()
      .post('/api/v1/auth/register')
      .send({ ...companyBody, email: companyEmail2 })
      .expect(409);
    expect(res.body.errorCode).toBe(ErrorCode.COMPANY_RFC_ALREADY_EXISTS);
  });

  it('rechaza document_number duplicado (409)', async () => {
    const res = await req()
      .post('/api/v1/auth/register')
      .send({ ...candidateBody, email: candidateEmail2 })
      .expect(409);
    expect(res.body.errorCode).toBe(
      ErrorCode.CANDIDATE_DOCUMENT_ALREADY_EXISTS,
    );
  });

  it('rechaza RFC con formato inválido (400)', async () => {
    const res = await req()
      .post('/api/v1/auth/register')
      .send({
        ...companyBody,
        email: `m5-badrfc-${stamp}@test.io`,
        company: { ...companyBody.company, rfc: 'NOPE' },
      })
      .expect(400);
    expect(res.body.errorCode).toBe(ErrorCode.VALIDATION_ERROR);
  });

  it('rechaza fecha de nacimiento futura (400)', async () => {
    const res = await req()
      .post('/api/v1/auth/register')
      .send({
        ...candidateBody,
        email: `m5-futuro-${stamp}@test.io`,
        candidate: {
          ...candidateBody.candidate,
          documentType: 'INE',
          documentNumber: `INE-futuro-${stamp}`,
          curp: undefined,
          birthDate: '2999-01-01',
        },
      })
      .expect(400);
    expect(res.body.errorCode).toBe(ErrorCode.INVALID_BIRTH_DATE);
  });

  it('rechaza accountType inválido (400)', async () => {
    await req()
      .post('/api/v1/auth/register')
      .send({ accountType: 'robot', email: 'x@y.io', password: 'Secreta#123' })
      .expect(400);
  });
});
