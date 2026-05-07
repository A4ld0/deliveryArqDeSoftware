import { routeByRole } from './role-routing';

describe('routeByRole', () => {
  it('returns the default client route', () => {
    expect(routeByRole('client')).toBe('/');
  });

  it('returns the module route for operational roles', () => {
    expect(routeByRole('restaurant')).toBe('/restaurant');
    expect(routeByRole('driver')).toBe('/driver');
    expect(routeByRole('admin')).toBe('/admin');
  });
});
