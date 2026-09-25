import { RolesGuard } from './roles.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  function mockContext(role: UserRole): ExecutionContext {
    return {
      getHandler: () => {},
      getClass: () => {},
      switchToHttp: () => ({
        getRequest: () => ({
          user: { id: 1, role, name: 'Test User' },
        }),
      }),
    } as any;
  }

  it('should allow access if no roles are required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(null);
    const ctx = mockContext(UserRole.STAFF);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should allow ADMIN when ADMIN role is required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN]);
    const ctx = mockContext(UserRole.ADMIN);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should throw ForbiddenException when STAFF tries to access ADMIN route', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN]);
    const ctx = mockContext(UserRole.STAFF);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });
});
