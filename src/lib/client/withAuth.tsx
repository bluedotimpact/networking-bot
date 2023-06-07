import { LoginPage } from '../../components/LoginPage';
import { AuthState, useAuthState } from './authState';

export const withAuth = (Component: React.FC<{ authState: AuthState, setAuthState: (s: AuthState | undefined) => void }>): React.FC => {
  return () => {
    const [state, setAuthState] = useAuthState();

    if (!state) {
      return <LoginPage />;
    }

    return <Component authState={state} setAuthState={setAuthState} />;
  };
};
