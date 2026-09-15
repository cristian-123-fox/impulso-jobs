import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IjCell } from '@/shared/ui/table/cell.directive';
import { IjTable } from '@/shared/ui/table/table';
import { IjColumn, IjSortState } from '@/shared/ui/table/table.models';

interface Row extends Record<string, unknown> {
  id: string;
  name: string;
  age: number;
}

const ROWS: Row[] = [
  { id: 'c', name: 'Carmen', age: 41 },
  { id: 'a', name: 'Ana', age: 33 },
  { id: 'b', name: 'Bruno', age: 28 },
];

const COLUMNS: IjColumn<Row>[] = [
  { id: 'name', header: 'Nombre', sortable: true, value: (r) => r.name },
  { id: 'age', header: 'Edad', sortable: true, value: (r) => r.age },
  { id: 'actions', header: 'Acciones' },
];

@Component({
  imports: [IjTable, IjCell],
  template: `
    <ij-table
      [data]="data()"
      [columns]="columns"
      [sortMode]="sortMode()"
      [selectable]="selectable()"
      [rowId]="rowId"
      [(sort)]="sort"
      (selectionChange)="selected.set($event)"
    >
      <ng-template ijCell="name" [ijCellOf]="data()" let-row>
        <span class="cell-name">{{ row.name }}</span>
      </ng-template>
    </ij-table>
  `,
})
class HostComponent {
  readonly data = signal<Row[]>([...ROWS]);
  readonly columns = COLUMNS;
  readonly sortMode = signal<'client' | 'server'>('client');
  readonly selectable = signal(false);
  readonly sort = signal<IjSortState | null>(null);
  readonly selected = signal<readonly Row[]>([]);
  readonly rowId = (row: Row) => row.id;
}

describe('IjTable', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  function bodyText(columnIndex: number): string[] {
    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    return Array.from(rows).map((row) =>
      (
        (row as HTMLElement).querySelectorAll('td')[columnIndex]
          ?.textContent ?? ''
      ).trim(),
    );
  }

  function headerButton(label: string): HTMLButtonElement {
    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('thead button'),
    ) as HTMLButtonElement[];
    const found = buttons.find((b) => b.textContent?.includes(label));
    if (!found) throw new Error(`No hay cabecera ordenable "${label}"`);
    return found;
  }

  it('pinta las filas con la plantilla ijCell de cada columna', () => {
    expect(bodyText(0)).toEqual(['Carmen', 'Ana', 'Bruno']);
    expect(
      fixture.nativeElement.querySelectorAll('.cell-name').length,
    ).toBe(3);
  });

  it('usa el accesor cuando la columna no tiene plantilla', () => {
    expect(bodyText(1)).toEqual(['41', '33', '28']);
  });

  it('ordena en cliente al pulsar la cabecera', () => {
    headerButton('Nombre').click();
    fixture.detectChanges();

    expect(host.sort()).toEqual({ column: 'name', order: 'ASC' });
    expect(bodyText(0)).toEqual(['Ana', 'Bruno', 'Carmen']);
  });

  it('el ciclo de la cabecera es ascendente, descendente y sin orden', () => {
    const button = headerButton('Nombre');

    button.click();
    fixture.detectChanges();
    expect(host.sort()?.order).toBe('ASC');

    button.click();
    fixture.detectChanges();
    expect(host.sort()?.order).toBe('DESC');
    expect(bodyText(0)).toEqual(['Carmen', 'Bruno', 'Ana']);

    button.click();
    fixture.detectChanges();
    // Sin orden se vuelve al de origen, que en servidor es el del backend.
    expect(host.sort()).toBeNull();
    expect(bodyText(0)).toEqual(['Carmen', 'Ana', 'Bruno']);
  });

  it('en modo servidor avisa del orden pero NO reordena las filas', () => {
    host.sortMode.set('server');
    fixture.detectChanges();

    headerButton('Nombre').click();
    fixture.detectChanges();

    expect(host.sort()).toEqual({ column: 'name', order: 'ASC' });
    // Reordenar aquí daría un orden falso: sólo tenemos la página visible.
    expect(bodyText(0)).toEqual(['Carmen', 'Ana', 'Bruno']);
  });

  it('no hace ordenable una columna sin sortable', () => {
    expect(() => headerButton('Acciones')).toThrow();
  });

  it('marca el sentido de orden en aria-sort', () => {
    headerButton('Nombre').click();
    fixture.detectChanges();

    const headers = fixture.nativeElement.querySelectorAll('thead th');
    expect(headers[0].getAttribute('aria-sort')).toBe('ascending');
    expect(headers[1].getAttribute('aria-sort')).toBe('none');
    // Una columna no ordenable no anuncia orden ninguno.
    expect(headers[2].getAttribute('aria-sort')).toBeNull();
  });

  it('sin selección activada no pinta la columna de casillas', () => {
    expect(
      fixture.nativeElement.querySelectorAll('tbody input[type="checkbox"]')
        .length,
    ).toBe(0);
  });

  it('selecciona filas y las publica hacia fuera', () => {
    host.selectable.set(true);
    fixture.detectChanges();

    const boxes = fixture.nativeElement.querySelectorAll(
      'tbody input[type="checkbox"]',
    ) as NodeListOf<HTMLInputElement>;
    boxes[1].click();
    fixture.detectChanges();

    expect(host.selected().map((r) => r.id)).toEqual(['a']);
  });

  it('la casilla de la cabecera selecciona y deselecciona todo', () => {
    host.selectable.set(true);
    fixture.detectChanges();

    const all = fixture.nativeElement.querySelector(
      'thead input[type="checkbox"]',
    ) as HTMLInputElement;

    all.click();
    fixture.detectChanges();
    expect(host.selected().length).toBe(3);

    all.click();
    fixture.detectChanges();
    expect(host.selected().length).toBe(0);
  });

  it('la selección sigue a la fila aunque cambie el orden', () => {
    host.selectable.set(true);
    fixture.detectChanges();

    const boxes = fixture.nativeElement.querySelectorAll(
      'tbody input[type="checkbox"]',
    ) as NodeListOf<HTMLInputElement>;
    boxes[0].click(); // Carmen, la primera sin ordenar
    fixture.detectChanges();
    expect(host.selected().map((r) => r.id)).toEqual(['c']);

    headerButton('Nombre').click();
    fixture.detectChanges();

    // Es lo que garantiza `rowId`: sin él TanStack cae al índice y la
    // selección saltaría a otra persona al reordenar.
    expect(host.selected().map((r) => r.id)).toEqual(['c']);
  });
});
