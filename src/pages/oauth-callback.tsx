import { UserManager } from 'oidc-client';
import { useEffect, useState } from 'react';
import { googleUserManagerSettings } from '../components/LoginPage';
import { Page } from '../components/Page';
import { H1 } from '../components/Text';

const OauthCallback: React.FC = () => {
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    try {
      new UserManager(googleUserManagerSettings).signinCallback();
    } catch (err) {
      setError(err instanceof Error ? err.message : JSON.stringify(err));
    }
  }, []);

  return (
    <Page>
      <H1>BlueBot Login</H1>
      {error && <p className="text-red-800 font-bold my-4">Error: {error}</p>}
      {!error && <p className="my-4">Logging you in...</p>}
    </Page>
  );
};

export default OauthCallback;
