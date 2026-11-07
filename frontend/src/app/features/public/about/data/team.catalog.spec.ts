import { TEAM_MEMBERS } from '@/features/public/about/data/team.catalog';

describe('TEAM_MEMBERS', () => {
  it('no repite ids ni órdenes', () => {
    const ids = TEAM_MEMBERS.map((member) => member.id);
    const orders = TEAM_MEMBERS.map((member) => member.order);

    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(orders).size).toBe(orders.length);
  });

  it('cada miembro tiene nombre, puesto y bio', () => {
    for (const member of TEAM_MEMBERS) {
      expect(member.name.trim().length).toBeGreaterThan(0);
      expect(member.roleKey).toMatch(/^about\.team\.members\.[a-z0-9-]+\.role$/);
      expect(member.bioKey).toMatch(/^about\.team\.members\.[a-z0-9-]+\.bio$/);
    }
  });

  it('las fotos, si existen, son rutas públicas de /assets', () => {
    for (const member of TEAM_MEMBERS.filter((item) => item.photo)) {
      expect(member.photo).toMatch(/^\/assets\/images\/team\//);
    }
  });

  it('los enlaces de LinkedIn, si existen, son https', () => {
    for (const member of TEAM_MEMBERS.filter((item) => item.linkedin)) {
      expect(member.linkedin).toMatch(/^https:\/\//);
    }
  });

  it('el equipo real no está marcado como placeholder', () => {
    expect(TEAM_MEMBERS.some((member) => member.isPlaceholder)).toBe(false);
  });
});
