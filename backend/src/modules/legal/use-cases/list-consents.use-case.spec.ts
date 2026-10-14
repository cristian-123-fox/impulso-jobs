import { LegalDocumentCode } from '@/modules/legal/enums/legal.enums';
import { ConsentSource } from '@/modules/legal/enums/legal.enums';
import { ListConsentsQueryDto } from '@/modules/legal/dto/list-consents-query.dto';
import { ILegalConsentRepository } from '@/modules/legal/repositories/legal-consent.repository.interface';
import { ListConsentsUseCase } from '@/modules/legal/use-cases/list-consents.use-case';

/**
 * El resumen es lo que hace útil la pantalla: de nada sirve un listado de
 * aceptaciones si arriba no dice cuántas hay vigentes. Y el número vigente **no**
 * es `COUNT(granted = true)`, porque revocar inserta una fila nueva. Estos tests
 * fijan esa distinción.
 */
describe('ListConsentsUseCase', () => {
  let consents: jest.Mocked<ILegalConsentRepository>;
  let useCase: ListConsentsUseCase;

  const query = (
    overrides: Partial<ListConsentsQueryDto> = {},
  ): ListConsentsQueryDto =>
    Object.assign(new ListConsentsQueryDto(), {
      page: 1,
      limit: 10,
      ...overrides,
    });

  const summary = (overrides = {}) => ({
    total: 0,
    granted: 0,
    denied: 0,
    activeTerms: 0,
    activePrivacy: 0,
    activeImageRights: 0,
    ...overrides,
  });

  beforeEach(() => {
    consents = {
      create: jest.fn(),
      listBySubject: jest.fn().mockResolvedValue([]),
      hasActiveConsent: jest.fn().mockResolvedValue(false),
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
      summarize: jest.fn().mockResolvedValue(summary()),
    };
    useCase = new ListConsentsUseCase(consents);
  });

  it('devuelve el listado paginado junto al resumen', async () => {
    const result = await useCase.execute(query());

    expect(result).toMatchObject({ page: 1, total: 0, pages: 1 });
    expect(result.summary).toEqual(summary());
  });

  it('traduce la página y el límite a los criterios del repositorio', async () => {
    await useCase.execute(query({ page: 3, limit: 25 }));

    expect(consents.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ page: 3, limit: 25 }),
    );
  });

  it('calcula el total de páginas con el límite real', async () => {
    consents.findAndCount.mockResolvedValue([[], 57]);

    const result = await useCase.execute(query({ limit: 10 }));

    expect(result.total).toBe(57);
    expect(result.pages).toBe(6);
  });

  it('pasa los filtros al listado y al resumen por igual', async () => {
    // Si el resumen se calculara con otros filtros, la cabecera mentiría: diría
    // «120 aceptaciones» mientras la tabla muestra las de otro recorte.
    const criteria = {
      search: 'ana@',
      documentCode: LegalDocumentCode.TERMS,
      granted: true,
      source: ConsentSource.REGISTRATION,
    };

    await useCase.execute(query(criteria));

    for (const call of [consents.findAndCount, consents.summarize]) {
      expect(call).toHaveBeenCalledWith(expect.objectContaining(criteria));
    }
  });

  it('no invoca `summarize` con los filtros de paginación', async () => {
    await useCase.execute(query({ page: 4, limit: 50 }));

    // El resumen es global: si heredara `page`, mostraría una verdad distinta en
    // cada página del listado.
    expect(consents.summarize).toHaveBeenCalledWith(
      expect.not.objectContaining({ page: expect.anything() }),
    );
  });

  it('el resumen distingue aceptadas de denegadas', async () => {
    consents.summarize.mockResolvedValue(
      summary({ total: 100, granted: 94, denied: 6, activeTerms: 90 }),
    );

    const { summary: result } = await useCase.execute(query());

    expect(result.denied).toBe(6);
    // 94 aceptaciones históricas pero 90 vigentes: cuatro revocadas después.
    expect(result.granted).toBe(94);
    expect(result.activeTerms).toBe(90);
  });

  it('ordena por defecto del más reciente al más antiguo', async () => {
    await useCase.execute(query());

    expect(consents.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ sortBy: undefined, sortOrder: undefined }),
    );
  });
});
