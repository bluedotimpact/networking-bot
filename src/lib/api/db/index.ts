import env from '../env';
import { TypedAirtable } from './common';

export default new TypedAirtable({
  apiKey: env.AIRTABLE_PERSONAL_ACCESS_TOKEN,
});
