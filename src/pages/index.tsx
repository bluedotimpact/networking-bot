import {
  BookOpenIcon, CodeBracketIcon, PlayIcon, PlusIcon,
} from '@heroicons/react/24/outline';
import { ActionButton } from '../components/ActionButton';
import Button from '../components/Button';
import { Page } from '../components/Page';
import { H1 } from '../components/Text';
import { withAuth } from '../lib/client/withAuth';

const Home: React.FC = withAuth(({ setAuthState }) => {
  return (
    <Page>
      <div className="flex">
        <H1 className="flex-1">BlueBot control panel</H1>
        <Button onClick={() => { setAuthState(undefined); }}>Sign out</Button>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <ActionButton icon={PlayIcon} href="/run">
          Run
        </ActionButton>

        <ActionButton icon={PlusIcon} href="/api/slack/install">
          Add installation
        </ActionButton>

        <ActionButton icon={BookOpenIcon} href="https://www.notion.so/bluedot-impact/Networking-bot-89bec8d266884408839970b6d9512c62">
          Read docs
        </ActionButton>

        <ActionButton icon={CodeBracketIcon} href="https://github.com/bluedotimpact/networking-bot">
          View code
        </ActionButton>
      </div>
    </Page>
  );
});

export default Home;
