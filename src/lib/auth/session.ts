import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { db } from '@/lib/db/prisma';
import { Role } from '@/../generated/prisma';
import { PermissionCode } from './permissions';
import { PermissionService } from '@/services/permission.service';

// SECURITY: never fall back to a hard-coded secret. Anyone who knows the signing secret
// can forge a session cookie. Known leaked/default values are rejected outright.
const KNOWN_WEAK_AUTH_SECRETS = new Set([
  'super-secret-auth-key-32-chars-min-length-xyz',
  'secret',
  'changeme',
]);

function getJwtSecret(): string {
  const secret = (process.env.AUTH_SECRET || '').trim();
  if (!secret || secret.length < 32 || KNOWN_WEAK_AUTH_SECRETS.has(secret)) {
    throw new Error('AUTH_SECRET is missing or insecure. Set a random value of at least 32 characters.');
  }
  return secret;
}
const COOKIE_NAME = 'digipro_session';

export interface UserSessionPayload {
  userId: string;
  email: string;
  name: string;
  role: Role;
  emailVerified?: boolean;
}

export function signSessionToken(payload: UserSessionPayload): string {
  const cleanPayload = {
    userId: payload.userId,
    email: payload.email,
    name: payload.name,
    role: payload.role,
    emailVerified: payload.emailVerified,
  };
  return jwt.sign(cleanPayload, getJwtSecret(), { expiresIn: '7d' });
}

export function verifySessionToken(token: string): UserSessionPayload | null {
  try {
    return jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] }) as UserSessionPayload;
  } catch (err: any) {
    if (err?.message?.startsWith('AUTH_SECRET')) console.error('[Auth]', err.message);
    return null;
  }
}

import { cache } from 'react';

export const getCurrentSession = cache(async (): Promise<UserSessionPayload | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = verifySessionToken(token);
  if (!payload) return null;

  // Verify user is not disabled in DB and get emailVerified status
  const user = await db.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, disabled: true, role: true, emailVerified: true },
  });

  if (!user || user.disabled) return null;

  return {
    userId: user.id,
    email: payload.email,
    name: payload.name,
    role: user.role,
    emailVerified: Boolean(user.emailVerified),
  };
});

export async function setSessionCookie(payload: UserSessionPayload) {
  const token = signSessionToken({
    userId: payload.userId,
    email: payload.email,
    name: payload.name,
    role: payload.role,
    emailVerified: payload.emailVerified,
  });
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function requireAuth(): Promise<UserSessionPayload> {
  const session = await getCurrentSession();
  if (!session) {
    throw new Error('UNAUTHORIZED');
  }
  return session;
}

export async function requireAdmin(allowedRoles: Role[] = [Role.SUPER_ADMIN, Role.ADMIN, Role.ORDER_STAFF, Role.SUPPORT, Role.EDITOR]): Promise<UserSessionPayload> {
  const session = await requireAuth();
  if (!allowedRoles.includes(session.role)) {
    throw new Error('FORBIDDEN');
  }
  return session;
}

/**
 * Ensures the authenticated user is a SUPER_ADMIN.
 */
export async function requireSuperAdmin(): Promise<UserSessionPayload> {
  const session = await requireAuth();
  if (session.role !== Role.SUPER_ADMIN) {
    throw new Error('FORBIDDEN');
  }
  return session;
}

/**
 * Ensures the current session has the specific permission.
 */
export async function requirePermission(permission: PermissionCode): Promise<UserSessionPayload> {
  const session = await requireAuth();
  const allowed = await PermissionService.hasPermission(session.userId, permission);
  if (!allowed) {
    throw new Error('FORBIDDEN');
  }
  return session;
}

/**
 * Ensures the current session has ANY of the specified permissions.
 */
export async function requireAnyPermission(permissions: PermissionCode[]): Promise<UserSessionPayload> {
  const session = await requireAuth();
  const allowed = await PermissionService.hasAnyPermission(session.userId, permissions);
  if (!allowed) {
    throw new Error('FORBIDDEN');
  }
  return session;
}

/**
 * Checks if the current admin session has permission without throwing, returning allowed status and session.
 */
export async function checkAdminPermission(permission: PermissionCode | PermissionCode[]): Promise<{
  allowed: boolean;
  session: UserSessionPayload;
  requiredPermission: string;
}> {
  const session = await requireAuth();
  if (session.role === Role.SUPER_ADMIN) {
    return {
      allowed: true,
      session,
      requiredPermission: Array.isArray(permission) ? permission.join(', ') : permission,
    };
  }

  const perms = Array.isArray(permission) ? permission : [permission];
  const allowed = await PermissionService.hasAnyPermission(session.userId, perms);

  return {
    allowed,
    session,
    requiredPermission: perms.join(', '),
  };
}

/**
 * Ensures the authenticated user is a verified customer (or staff/admin).
 * Throws EMAIL_VERIFICATION_REQUIRED if a customer has not verified their email.
 */
export async function requireVerifiedCustomer(): Promise<UserSessionPayload> {
  const session = await requireAuth();
  if (session.role === Role.CUSTOMER && !session.emailVerified) {
    throw new Error('EMAIL_VERIFICATION_REQUIRED');
  }
  return session;
}

import { NextResponse } from 'next/server';

/**
 * Handles common auth errors (UNAUTHORIZED, FORBIDDEN, EMAIL_VERIFICATION_REQUIRED)
 */
export function handleAuthError(error: any) {
  if (error?.message === 'EMAIL_VERIFICATION_REQUIRED') {
    return NextResponse.json(
      {
        success: false,
        error: 'EMAIL_VERIFICATION_REQUIRED',
        message: 'Verifikasi email terlebih dahulu untuk menggunakan fitur ini.',
      },
      { status: 403 }
    );
  }
  if (error?.message === 'UNAUTHORIZED') {
    return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 });
  }
  if (error?.message === 'FORBIDDEN') {
    return NextResponse.json({ success: false, error: 'FORBIDDEN' }, { status: 403 });
  }
  return NextResponse.json(
    { success: false, error: error?.message || 'Internal Server Error' },
    { status: 500 }
  );
}

/**
 * Helper to check current user's permission without throwing.
 */
export async function hasPermission(permission: PermissionCode): Promise<boolean> {
  const session = await getCurrentSession();
  if (!session) return false;
  return await PermissionService.hasPermission(session.userId, permission);
}
