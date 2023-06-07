import axios from 'axios';
// We are using oidc-client rather than oidc-client-ts because it supports
// the implicit flow, which is currently needed for Google authentication
// https://github.com/authts/oidc-client-ts/issues/152
import { UserManager, UserManagerSettings } from 'oidc-client';
import { useState } from 'react';

import { Page } from './Page';
import { H1 } from './Text';
import env from '../lib/client/env';
import { useAuthState } from '../lib/client/authState';
import { LoginResponse } from '../pages/api/user/login/google';
import Button from './Button';

export const LoginPage: React.FC = () => {
  const [loading, setLoading] = useState<boolean | string>(false);
  const [error, setError] = useState<string | undefined>();

  return (
    <Page>
      <H1>BlueBot Login</H1>
      {error && <p className="text-red-800 font-bold my-4">Error: {error}</p>}
      {loading ? (
        <p className="my-4">{typeof loading === 'string' ? loading : 'Logging in...'}</p>
      ) : (
        <GoogleLoginButton setError={setError} setLoading={setLoading} />
      )}
    </Page>
  );
};

interface LoginButtonProps {
  setError: (error: string | undefined) => void,
  setLoading: (loading: boolean | string) => void,
}

const googleRequiredScopes = [
  'email',
  'profile',
  'openid',
  'https://www.googleapis.com/auth/userinfo.profile',
];

export const googleUserManagerSettings: UserManagerSettings = {
  authority: 'https://accounts.google.com',
  client_id: env.NEXT_PUBLIC_GOOGLE_LOGIN_CLIENT_ID,
  redirect_uri: `${(typeof window !== 'undefined') ? window.location.origin : ''}/oauth-callback`,
  scope: googleRequiredScopes.join(' '),
  response_type: 'id_token',
};

const GoogleLoginButton: React.FC<LoginButtonProps> = ({ setError, setLoading }) => {
  const [, setAuthState] = useAuthState();

  return (
    <Button
      onClick={async () => {
        setLoading('Waiting on Google login...');
        setError(undefined);
        try {
          const user = await new UserManager(googleUserManagerSettings).signinPopup({
            extraQueryParams: {
              hd: 'bluedotimpact.org',
            },
          });
          setLoading(true);

          const missingScopes = googleRequiredScopes.filter((s) => !user.scopes.includes(s));
          if (missingScopes.length > 0) {
            throw new Error(`Missing scopes: ${JSON.stringify(missingScopes)}`);
          }

          const loginResponse = await axios<LoginResponse>({
            method: 'post',
            url: '/api/user/login/google',
            data: { idToken: user.id_token },
          });

          setAuthState({
            token: loginResponse.data.accessToken,
            expiresAt: loginResponse.data.expiresAt,
          });
        } catch (err) {
          setError(err instanceof Error ? err.message : JSON.stringify(err));
        }
        setLoading(false);
      }}
    >
      Google Login
    </Button>
  );
};
