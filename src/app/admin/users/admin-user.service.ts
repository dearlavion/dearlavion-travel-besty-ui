import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type UserRole = 'ADMIN' | 'STAFF' | 'USER';

export interface AdminUser {
  username: string;
  email?: string;
  firstname?: string;
  lastname?: string;
  phone?: string;
  activeProfile?: UserRole;
  active?: boolean;
}

export interface CreateUserInput {
  username: string;
  email: string;
  password: string;
  firstname?: string;
  lastname?: string;
  phone?: string;
  activeProfile?: UserRole;
}

export interface UpdateUserInput {
  email?: string;
  firstname?: string;
  lastname?: string;
  phone?: string;
  activeProfile?: UserRole;
}

const ADMIN_BASE = `${environment.authUrl}/admin/users`;

/**
 * Admin user management (list/create/edit/deactivate/reset-password) — real-backend only, no
 * mock-mode branch. Unlike customer-facing services, this is a pure back-office surface with no
 * offline-demo use case.
 */
@Injectable({ providedIn: 'root' })
export class AdminUserService {
  private readonly http = inject(HttpClient);
  private readonly tenantHeaders = { 'X-Customer': environment.customer };

  list(): Observable<AdminUser[]> {
    return this.http.get<AdminUser[]>(ADMIN_BASE, { headers: this.tenantHeaders });
  }

  get(username: string): Observable<AdminUser> {
    return this.http.get<AdminUser>(`${ADMIN_BASE}/${username}`, { headers: this.tenantHeaders });
  }

  create(input: CreateUserInput): Observable<AdminUser> {
    return this.http.post<AdminUser>(ADMIN_BASE, input, { headers: this.tenantHeaders });
  }

  update(username: string, input: UpdateUserInput): Observable<AdminUser> {
    return this.http.patch<AdminUser>(`${ADMIN_BASE}/${username}`, input, { headers: this.tenantHeaders });
  }

  setActive(username: string, active: boolean): Observable<AdminUser> {
    return this.http.patch<AdminUser>(`${ADMIN_BASE}/${username}/active`, { active }, { headers: this.tenantHeaders });
  }

  setPassword(username: string, password: string): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(
      `${ADMIN_BASE}/${username}/password`,
      { password },
      { headers: this.tenantHeaders },
    );
  }
}
