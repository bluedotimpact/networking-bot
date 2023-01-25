import { ArrowUturnLeftIcon } from '@heroicons/react/24/outline';
import axios, { AxiosResponse } from 'axios';
import useAxios from 'axios-hooks';
import { useState } from 'react';
import Button from 'src/components/Button';
import Link from 'src/components/Link';
import { Page } from 'src/components/Page';
import { H1 } from 'src/components/Text';
import { Installation } from 'src/lib/api/db/tables';
import { AuthState } from 'src/lib/client/authState';
import { withAuth } from 'src/lib/client/withAuth';
import { RunResponse } from './api/scheduler/run';
import { RunRequest } from './api/user/run';

const Run: React.FC = withAuth(({ authState }) => {
  const [{ data, loading, error }] = useAxios<{
    installations: Installation[],
    baseId: string,
    tableId: string,
  }>({
    url: '/api/user/installations',
    headers: { authorization: `Bearer ${authState.token}` },
  });

  return (
    <Page>
      <Link href="/" className="flex flex-row gap-2 mb-4 text-gray-600 hover:text-gray-800"><ArrowUturnLeftIcon className="h-5 w-5" /> Back home</Link>
      <H1>Run bot on installations</H1>
      {error && <p className="text-red-500 font-bold">Error: {error.message}</p>}
      {loading && <p>Loading...</p>}
      {data && (
      <div>
        {data.installations.map((installation) => <InstallationRow installation={installation} baseId={data.baseId} tableId={data.tableId} authState={authState} />)}
      </div>
      )}
    </Page>
  );
});

export default Run;

interface InstallationRowProps {
  installation: Installation
  baseId: string
  tableId: string
  authState: AuthState
}

const InstallationRow: React.FC<InstallationRowProps> = ({
  installation, baseId, tableId, authState,
}) => {
  const [runState, setRunState] = useState<
  | { type: 'loading' }
  | { type: 'success' }
  | { type: 'failure', message: string }
  | undefined
  >();

  return (
    <div className="flex items-center rounded hover:bg-slate-200 p-2 gap-4">
      <p className="flex-1">
        {installation.name}
        {' '}
        (
        <Link href={`https://app.slack.com/client/${installation.slackTeamId}`} className="text-blue-500 hover:text-blue-400 underline">Slack</Link>
        ,{' '}
        <Link href={`https://airtable.com/${baseId}/${tableId}/${installation.id}`} className="text-blue-500 hover:text-blue-400 underline">Airtable</Link>
        )
      </p>
      {runState?.type === 'success' && <p>Last run: Success</p>}
      {runState?.type === 'failure' && <p>Last run: Failure: {runState.message}</p>}
      <Button
        onClick={async () => {
          setRunState({ type: 'loading' });
          try {
            await axios.request<RunResponse, AxiosResponse<RunResponse>, RunRequest>({
              method: 'post',
              url: '/api/user/run',
              data: { installationId: installation.id },
              headers: { authorization: `Bearer ${authState.token}` },
            });
            setRunState({ type: 'success' });
          } catch (err) {
            setRunState({ type: 'failure', message: err instanceof Error ? err.message : String(err) });
          }
        }}
        disabled={runState?.type === 'loading'}
      >
        {runState?.type === 'loading' ? 'Running...' : 'Run'}
      </Button>
    </div>
  );
};
