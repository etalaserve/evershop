import { findDublicatedMiddleware } from '../../findDublicatedMiddleware.js';

describe('Test findDublicatedMiddleware function', () => {
  it('It should find a duplicate if routed middlewareID is existed', () => {
    expect(
      findDublicatedMiddleware(
        [
          {
            id: 'routeOne',
            routeId: 'home'
          }
        ],
        {
          id: 'routeOne',
          routeId: 'home'
        }
      )
    ).not.toEqual(-1);
  });

  it('It should find a duplicate if admin level middlewareID is existed', () => {
    expect(
      findDublicatedMiddleware(
        [
          {
            id: 'routeOne',
            routeId: 'admin'
          }
        ],
        {
          id: 'routeOne',
          routeId: 'admin'
        }
      )
    ).not.toEqual(-1);
  });

  it('It should find a duplicate if admin level middlewareID is existed with the same scope', () => {
    expect(
      findDublicatedMiddleware(
        [
          {
            id: 'routeOne',
            routeId: 'admin',
            scope: 'admin'
          }
        ],
        {
          id: 'routeOne',
          routeId: 'admin',
          scope: 'admin'
        }
      )
    ).not.toEqual(-1);
  });

  it('It should find a duplicate if frontStore level middlewareID is existed', () => {
    expect(
      findDublicatedMiddleware(
        [
          {
            id: 'routeOne',
            routeId: 'frontStore'
          }
        ],
        {
          id: 'routeOne',
          routeId: 'frontStore'
        }
      )
    ).not.toEqual(-1);
  });

  it('It should find a duplicate if application level middlewareID is existed', () => {
    expect(
      findDublicatedMiddleware(
        [
          {
            id: 'routeOne',
            routeId: null
          }
        ],
        {
          id: 'routeOne',
          routeId: null
        }
      )
    ).not.toEqual(-1);
  });

  it('It should find a duplicate if the existing routeId is null', () => {
    expect(
      findDublicatedMiddleware(
        [
          {
            id: 'routeOne',
            routeId: null
          }
        ],
        {
          id: 'routeOne',
          routeId: 'home'
        }
      )
    ).not.toEqual(-1);
  });

  it('It should find a duplicate if the existing routeId is admin', () => {
    expect(
      findDublicatedMiddleware(
        [
          {
            id: 'routeOne',
            routeId: 'admin'
          }
        ],
        {
          id: 'routeOne',
          routeId: 'home'
        }
      )
    ).not.toEqual(-1);
  });

  it('It should find a duplicate if the existing routeId is frontStore', () => {
    expect(
      findDublicatedMiddleware(
        [
          {
            id: 'routeOne',
            routeId: 'frontStore'
          }
        ],
        {
          id: 'routeOne',
          routeId: 'home'
        }
      )
    ).not.toEqual(-1);
  });

  it('It should return -1 if routeId is different', () => {
    expect(
      findDublicatedMiddleware(
        [
          {
            id: 'routeOne',
            routeId: 'home'
          }
        ],
        {
          id: 'routeOne',
          routeId: 'category'
        }
      )
    ).toEqual(-1);
  });
});
