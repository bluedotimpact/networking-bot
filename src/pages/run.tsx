import { ArrowUturnLeftIcon } from '@heroicons/react/24/outline';
import Link from 'src/components/Link';
import { Page } from 'src/components/Page';
import { H1 } from 'src/components/Text';
import { withAuth } from 'src/lib/client/withAuth';

const Run: React.FC = withAuth(() => {
  // const [status, setStatus] = useState('Loading...');
  // useEffect(() => {
  //   axios<StatusResponse>({
  //     method: 'get',
  //     url: '/api/status',
  //   }).then((res) => {
  //     setStatus(res.data.status);
  //   }).catch((err) => {
  //     setStatus(`Error: ${isAxiosError(err) ? err.message : String(err)}`);
  //   });
  // }, []);

  return (
    <Page>
      <Link href="/" className="flex flex-row gap-2 mb-4 text-gray-600 hover:text-gray-800"><ArrowUturnLeftIcon className="h-5 w-5" /> Back home</Link>
      <H1>Run bot on installations</H1>
      <p>TODO</p>
    </Page>
  );
});

export default Run;
