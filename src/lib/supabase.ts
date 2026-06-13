import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// A helper to determine if we have a valid Supabase project configured.
// If not configured, we gracefully run in mock/localStorage mode.
export const isSupabaseConfigured = !!(
  supabaseUrl &&
  supabaseUrl !== 'https://placeholder.supabase.co' &&
  supabaseAnonKey &&
  supabaseAnonKey !== 'placeholder-key'
);

class MockAuth {
  private listeners: Array<(event: string, session: any) => void> = [];

  constructor() {
    this.seedDemoUser();
    window.addEventListener('storage', (e) => {
      if (e.key === 'littlepages_session') {
        this.triggerChange();
      }
    });
  }

  private seedDemoUser() {
    const usersStr = localStorage.getItem('littlepages_users');
    let users = [];
    if (usersStr) {
      try {
        users = JSON.parse(usersStr);
      } catch {
        users = [];
      }
    }
    
    // Seed demo user if not exists
    if (!users.find((u: any) => u.email === 'demo@demo.com')) {
      const demoUserId = 'demo-user-id-123456';
      users.push({
        id: demoUserId,
        email: 'demo@demo.com',
        password: 'password123',
        user_metadata: { full_name: 'Demo User' },
        created_at: new Date().toISOString(),
      });
      localStorage.setItem('littlepages_users', JSON.stringify(users));

      // Also seed profile for demo user
      const profilesStr = localStorage.getItem('littlepages_db_profiles') || '[]';
      let profiles = [];
      try {
        profiles = JSON.parse(profilesStr);
      } catch {
        profiles = [];
      }
      if (!profiles.find((p: any) => p.id === demoUserId)) {
        profiles.push({
          id: demoUserId,
          email: 'demo@demo.com',
          full_name: 'Demo User',
          avatar_url: '',
          preferences: { theme: 'light' },
          updated_at: new Date().toISOString(),
        });
        localStorage.setItem('littlepages_db_profiles', JSON.stringify(profiles));
      }
    }
  }

  private triggerChange() {
    const session = this.getCurrentSession();
    this.listeners.forEach((cb) => cb(session ? 'SIGNED_IN' : 'SIGNED_OUT', session));
  }

  private getCurrentSession() {
    const sessionStr = localStorage.getItem('littlepages_session');
    if (!sessionStr) return null;
    try {
      return JSON.parse(sessionStr);
    } catch {
      return null;
    }
  }

  private getUsers() {
    const usersStr = localStorage.getItem('littlepages_users') || '[]';
    try {
      return JSON.parse(usersStr);
    } catch {
      return [];
    }
  }

  private saveUsers(users: any[]) {
    localStorage.setItem('littlepages_users', JSON.stringify(users));
  }

  async getSession() {
    return { data: { session: this.getCurrentSession() }, error: null };
  }

  async getUser() {
    const session = this.getCurrentSession();
    return { data: { user: session ? session.user : null }, error: null };
  }

  onAuthStateChange(callback: (event: string, session: any) => void) {
    this.listeners.push(callback);
    const session = this.getCurrentSession();
    callback(session ? 'INITIAL_SESSION' : 'SIGNED_OUT', session);

    return {
      data: {
        subscription: {
          unsubscribe: () => {
            this.listeners = this.listeners.filter((cb) => cb !== callback);
          },
        },
      },
    };
  }

  async signUp({ email, password, options }: any) {
    const users = this.getUsers();
    if (users.find((u: any) => u.email.toLowerCase() === email.toLowerCase())) {
      return { data: { user: null, session: null }, error: { message: 'A user with this email already exists.' } };
    }

    const newUser = {
      id: crypto.randomUUID(),
      email,
      user_metadata: options?.data || {},
      created_at: new Date().toISOString(),
    };

    users.push({ ...newUser, password });
    this.saveUsers(users);

    // Create profile
    const profilesStr = localStorage.getItem('littlepages_db_profiles') || '[]';
    let profiles = [];
    try {
      profiles = JSON.parse(profilesStr);
    } catch {
      profiles = [];
    }
    const newProfile = {
      id: newUser.id,
      email: newUser.email,
      full_name: options?.data?.full_name || '',
      avatar_url: '',
      preferences: { theme: 'light' },
      updated_at: new Date().toISOString(),
    };
    profiles.push(newProfile);
    localStorage.setItem('littlepages_db_profiles', JSON.stringify(profiles));

    // Sign in automatically
    const session = {
      access_token: 'mock-token-' + Math.random(),
      user: newUser,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    };
    localStorage.setItem('littlepages_session', JSON.stringify(session));
    this.triggerChange();

    return { data: { user: newUser, session }, error: null };
  }

  async signInWithPassword({ email, password }: any) {
    const users = this.getUsers();
    const user = users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
    if (!user || user.password !== password) {
      return { data: { user: null, session: null }, error: { message: 'Invalid email or password.' } };
    }

    const { password: _, ...userWithoutPassword } = user;
    const session = {
      access_token: 'mock-token-' + Math.random(),
      user: userWithoutPassword,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    };
    localStorage.setItem('littlepages_session', JSON.stringify(session));
    this.triggerChange();

    return { data: { user: userWithoutPassword, session }, error: null };
  }

  async signInWithOAuth({ provider, options }: any) {
    const newUser = {
      id: 'mock-oauth-' + provider + '-' + Math.random().toString(36).substring(2, 9),
      email: `${provider}-user@littlepages.app`,
      user_metadata: { full_name: `${provider.charAt(0).toUpperCase() + provider.slice(1)} User` },
      created_at: new Date().toISOString(),
    };

    const session = {
      access_token: 'mock-token-' + Math.random(),
      user: newUser,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    };
    localStorage.setItem('littlepages_session', JSON.stringify(session));
    this.triggerChange();

    // Create a mock profile if not exists
    const profilesStr = localStorage.getItem('littlepages_db_profiles') || '[]';
    let profiles = [];
    try {
      profiles = JSON.parse(profilesStr);
    } catch {
      profiles = [];
    }
    if (!profiles.find((p: any) => p.id === newUser.id)) {
      profiles.push({
        id: newUser.id,
        email: newUser.email,
        full_name: newUser.user_metadata.full_name,
        avatar_url: '',
        preferences: { theme: 'light' },
        updated_at: new Date().toISOString(),
      });
      localStorage.setItem('littlepages_db_profiles', JSON.stringify(profiles));
    }

    // Redirect or succeed
    if (options?.redirectTo) {
      window.location.href = options.redirectTo;
    }
    return { data: { provider, url: options?.redirectTo || window.location.origin }, error: null };
  }

  async signOut() {
    localStorage.removeItem('littlepages_session');
    this.triggerChange();
    return { error: null };
  }
}

class MockQueryBuilder {
  private tableName: string;
  private operation: 'select' | 'insert' | 'upsert' | 'update' | 'delete' = 'select';
  private payload: any = null;
  private filters: Array<(row: any) => boolean> = [];
  private orders: Array<{ column: string; ascending: boolean }> = [];
  private limitCount: number | null = null;
  private isSingle: boolean = false;
  private isMaybeSingle: boolean = false;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  private getTableData(): any[] {
    const key = `littlepages_db_${this.tableName}`;
    const dataStr = localStorage.getItem(key) || '[]';
    try {
      return JSON.parse(dataStr);
    } catch {
      return [];
    }
  }

  private saveTableData(data: any[]) {
    const key = `littlepages_db_${this.tableName}`;
    localStorage.setItem(key, JSON.stringify(data));
  }

  select(_fields?: string) {
    return this;
  }

  insert(data: any) {
    this.operation = 'insert';
    this.payload = data;
    return this;
  }

  upsert(data: any) {
    this.operation = 'upsert';
    this.payload = data;
    return this;
  }

  update(data: any) {
    this.operation = 'update';
    this.payload = data;
    return this;
  }

  delete() {
    this.operation = 'delete';
    return this;
  }

  eq(column: string, value: any) {
    this.filters.push((row) => row[column] === value);
    return this;
  }

  neq(column: string, value: any) {
    this.filters.push((row) => row[column] !== value);
    return this;
  }

  gt(column: string, value: any) {
    this.filters.push((row) => row[column] > value);
    return this;
  }

  gte(column: string, value: any) {
    this.filters.push((row) => row[column] >= value);
    return this;
  }

  lt(column: string, value: any) {
    this.filters.push((row) => row[column] < value);
    return this;
  }

  lte(column: string, value: any) {
    this.filters.push((row) => row[column] <= value);
    return this;
  }

  like(column: string, pattern: string) {
    const regex = new RegExp('^' + pattern.replace(/%/g, '.*') + '$', 'i');
    this.filters.push((row) => regex.test(row[column] || ''));
    return this;
  }

  ilike(column: string, pattern: string) {
    return this.like(column, pattern);
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orders.push({ column, ascending: options?.ascending !== false });
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  maybeSingle() {
    this.isMaybeSingle = true;
    return this;
  }

  async then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
    try {
      const result = await this.execute();
      if (onfulfilled) {
        return onfulfilled(result);
      }
      return result;
    } catch (error) {
      if (onrejected) {
        return onrejected(error);
      }
      throw error;
    }
  }

  private async execute() {
    let data = this.getTableData();

    if (this.operation === 'insert') {
      const rowsToInsert = Array.isArray(this.payload) ? this.payload : [this.payload];
      const processedRows = rowsToInsert.map((row) => ({
        id: row.id || crypto.randomUUID(),
        created_at: row.created_at || new Date().toISOString(),
        ...row,
      }));
      data.push(...processedRows);
      this.saveTableData(data);
      return { data: Array.isArray(this.payload) ? processedRows : processedRows[0], error: null };
    }

    if (this.operation === 'upsert') {
      const rowsToUpsert = Array.isArray(this.payload) ? this.payload : [this.payload];
      for (const row of rowsToUpsert) {
        let index = -1;
        if (row.id) {
          index = data.findIndex((r) => r.id === row.id);
        } else if (this.tableName === 'mood_logs') {
          index = data.findIndex((r) => r.user_id === row.user_id && r.logged_at === row.logged_at);
        } else if (this.tableName === 'habit_logs') {
          index = data.findIndex((r) => r.habit_id === row.habit_id && r.completed_at === row.completed_at);
        }

        const id = row.id || (index !== -1 ? data[index].id : crypto.randomUUID());
        const created_at = row.created_at || (index !== -1 ? data[index].created_at : new Date().toISOString());

        const mergedRow = {
          id,
          created_at,
          ...row,
          updated_at: new Date().toISOString(),
        };

        if (index !== -1) {
          data[index] = mergedRow;
        } else {
          data.push(mergedRow);
        }
      }
      this.saveTableData(data);
      return { data: this.payload, error: null };
    }

    if (this.operation === 'update') {
      data = data.map((row) => {
        const match = this.filters.every((filter) => filter(row));
        if (match) {
          return { ...row, ...this.payload, updated_at: new Date().toISOString() };
        }
        return row;
      });
      this.saveTableData(data);
      return { data: null, error: null };
    }

    if (this.operation === 'delete') {
      data = data.filter((row) => !this.filters.every((filter) => filter(row)));
      this.saveTableData(data);
      return { data: null, error: null };
    }

    // Default select operation
    let filteredData = data.filter((row) => this.filters.every((filter) => filter(row)));

    if (this.orders.length > 0) {
      filteredData.sort((a, b) => {
        for (const order of this.orders) {
          const valA = a[order.column];
          const valB = b[order.column];
          if (valA < valB) return order.ascending ? -1 : 1;
          if (valA > valB) return order.ascending ? 1 : -1;
        }
        return 0;
      });
    }

    if (this.limitCount !== null) {
      filteredData = filteredData.slice(0, this.limitCount);
    }

    if (this.isSingle) {
      if (filteredData.length === 0) {
        return { data: null, error: { message: 'No rows found' } };
      }
      return { data: filteredData[0], error: null };
    }

    if (this.isMaybeSingle) {
      return { data: filteredData.length > 0 ? filteredData[0] : null, error: null };
    }

    return { data: filteredData, error: null };
  }
}

// Instantiate either real Supabase or our localStorage mock
const realSupabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

if (!isSupabaseConfigured) {
  console.info(
    '🌸 Little Pages: running in Local Offline Mode. Data will be saved locally in your browser.'
  );
}

export const supabase = isSupabaseConfigured
  ? (realSupabase as any)
  : {
      auth: new MockAuth(),
      from: (tableName: string) => new MockQueryBuilder(tableName),
    };
