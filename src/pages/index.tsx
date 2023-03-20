import {
  BookOpenIcon, CodeBracketIcon, PlayIcon, PlusIcon,
} from '@heroicons/react/24/outline';
import { ActionButton } from 'src/components/ActionButton';
import { Page } from 'src/components/Page';
import { H1 } from 'src/components/Text';
import { withAuth } from 'src/lib/client/withAuth';

const Home: React.FC = withAuth(() => {
  return (
    <Page>
      <H1>BlueBot control panel</H1>
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
