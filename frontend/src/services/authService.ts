import { UserAccount } from '../types';
import { STORAGE_KEYS, storageService } from './storageService';

interface StoredUserRecord extends UserAccount {
  passwordHash: string;
}

const DEMO_USER: StoredUserRecord = {
  id: 'usr-demo-claire',
  fullName: 'Claire Bennett',
  email: 'claire.bennett@nutrilens.demo',
  passwordHash: 'demo1234',
  createdAt: '2026-10-01T08:00:00.000Z',
};

function getUsers(): StoredUserRecord[] {
  const existing = storageService.get<StoredUserRecord[]>(STORAGE_KEYS.USERS, []);
  const hasDemo = existing.some(
    (u) => u.email.toLowerCase() === DEMO_USER.email.toLowerCase()
  );
  if (!hasDemo) {
    const seeded = [DEMO_USER, ...existing];
    storageService.set(STORAGE_KEYS.USERS, seeded);
    return seeded;
  }
  return existing;
}

function toPublicAccount(record: StoredUserRecord): UserAccount {
  return {
    id: record.id,
    fullName: record.fullName,
    email: record.email,
    createdAt: record.createdAt,
  };
}

export const authService = {
  getCurrentUser(): UserAccount | null {
    return storageService.get<UserAccount | null>(STORAGE_KEYS.SESSION, null);
  },

  login(email: string, password: string): { user?: UserAccount; error?: string } {
    const normalizedEmail = email.trim().toLowerCase();
    const users = getUsers();
    const found = users.find((u) => u.email.toLowerCase() === normalizedEmail);

    if (!found) {
      return {
        error:
          'No account found with that email. Try signing in with the demo account or create a new account.',
      };
    }

    if (found.passwordHash !== password) {
      return { error: 'Incorrect password. Please double-check and try again.' };
    }

    const account = toPublicAccount(found);
    storageService.set(STORAGE_KEYS.SESSION, account);
    return { user: account };
  },

  loginDemo(): UserAccount {
    getUsers();
    const account = toPublicAccount(DEMO_USER);
    storageService.set(STORAGE_KEYS.SESSION, account);
    return account;
  },

  register(payload: {
    fullName: string;
    email: string;
    password: string;
  }): { user?: UserAccount; error?: string } {
    const normalizedEmail = payload.email.trim().toLowerCase();
    const users = getUsers();

    if (users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
      return { error: 'An account with this email address already exists.' };
    }

    const newUser: StoredUserRecord = {
      id: `usr-${Date.now()}`,
      fullName: payload.fullName.trim(),
      email: normalizedEmail,
      passwordHash: payload.password,
      createdAt: new Date().toISOString(),
    };

    storageService.set(STORAGE_KEYS.USERS, [...users, newUser]);
    const account = toPublicAccount(newUser);
    storageService.set(STORAGE_KEYS.SESSION, account);
    return { user: account };
  },

  updateAccount(
    userId: string,
    updates: { fullName: string; email: string }
  ): { user?: UserAccount; error?: string } {
    const normalizedEmail = updates.email.trim().toLowerCase();
    const users = getUsers();

    const duplicate = users.find(
      (u) => u.id !== userId && u.email.toLowerCase() === normalizedEmail
    );
    if (duplicate) {
      return { error: 'That email address is already associated with another account.' };
    }

    let updatedRecord: StoredUserRecord | null = null;
    const nextUsers = users.map((u) => {
      if (u.id === userId) {
        updatedRecord = {
          ...u,
          fullName: updates.fullName.trim(),
          email: normalizedEmail,
        };
        return updatedRecord;
      }
      return u;
    });

    if (!updatedRecord) {
      return { error: 'Account record could not be located.' };
    }

    storageService.set(STORAGE_KEYS.USERS, nextUsers);
    const account = toPublicAccount(updatedRecord);
    storageService.set(STORAGE_KEYS.SESSION, account);
    return { user: account };
  },

  changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): { ok: boolean; error?: string } {
    const users = getUsers();
    const target = users.find((u) => u.id === userId);
    if (!target) return { ok: false, error: 'Account record not found.' };

    if (target.passwordHash !== currentPassword) {
      return { ok: false, error: 'Current password is incorrect.' };
    }

    const nextUsers = users.map((u) =>
      u.id === userId ? { ...u, passwordHash: newPassword } : u
    );
    storageService.set(STORAGE_KEYS.USERS, nextUsers);
    return { ok: true };
  },

  logout(): void {
    storageService.remove(STORAGE_KEYS.SESSION);
  },

  deleteAccount(userId: string): void {
    const users = getUsers().filter((u) => u.id !== userId);
    storageService.set(STORAGE_KEYS.USERS, users);
    storageService.clearAllAppData();
  },
};
