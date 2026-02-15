import { useAuthStore } from '../../src/stores/auth';

describe('Auth Store', () => {
  beforeEach(() => {
    // Reset store to initial state
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: true,
    });
  });

  it('should have correct initial state', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isLoading).toBe(true);
  });

  it('should set auth data', () => {
    const user = { id: '1', email: 'test@test.com', displayName: 'Test', avatarUrl: null };

    useAuthStore.getState().setAuth(user, 'access-token', 'refresh-token');

    const state = useAuthStore.getState();
    expect(state.user).toEqual(user);
    expect(state.accessToken).toBe('access-token');
    expect(state.refreshToken).toBe('refresh-token');
    expect(state.isAuthenticated).toBe(true);
    expect(state.isLoading).toBe(false);
  });

  it('should update tokens', () => {
    const user = { id: '1', email: 'test@test.com', displayName: 'Test', avatarUrl: null };
    useAuthStore.getState().setAuth(user, 'old-access', 'old-refresh');

    useAuthStore.getState().setTokens('new-access', 'new-refresh');

    const state = useAuthStore.getState();
    expect(state.accessToken).toBe('new-access');
    expect(state.refreshToken).toBe('new-refresh');
    // User should remain unchanged
    expect(state.user).toEqual(user);
  });

  it('should logout and clear state', () => {
    const user = { id: '1', email: 'test@test.com', displayName: 'Test', avatarUrl: null };
    useAuthStore.getState().setAuth(user, 'access', 'refresh');

    useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isLoading).toBe(false);
  });

  it('should hydrate from storage when data exists', () => {
    // The MMKV mock stores data in memory, so setAuth stores it
    const user = { id: '1', email: 'test@test.com', displayName: 'Test', avatarUrl: null };
    useAuthStore.getState().setAuth(user, 'access-token', 'refresh-token');

    // Reset state (simulating app restart)
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: true,
    });

    useAuthStore.getState().hydrate();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.isLoading).toBe(false);
    expect(state.user?.email).toBe('test@test.com');
  });

  it('should set isLoading false when hydrating with no stored data', () => {
    // Logout clears storage
    useAuthStore.getState().logout();

    useAuthStore.setState({ isLoading: true });
    useAuthStore.getState().hydrate();

    expect(useAuthStore.getState().isLoading).toBe(false);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});
