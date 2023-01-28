import { update } from "@/lib/db";
import { meetingsTable } from "@/lib/tables";
import { ActionsBlock, AllMiddlewareArgs, BlockAction, Button, ButtonAction, Middleware, SectionBlock, SlackActionMiddlewareArgs } from "@slack/bolt";
import type { NextApiRequest, NextApiResponse } from 'next'
import { app, appRunner } from './_app';

// All messages should be of the format
export type MessageBlocks<HasActions = boolean> =
  HasActions extends false ?
    /** Text only */
    | [SectionBlock]
    /** Text, action confirmation */
    | [SectionBlock, SectionBlock]
  :
    /** Text, actions */
    | [SectionBlock, ActionsBlock & { elements: Button[] }]
    /** Text, action confirmation, actions */
    | [SectionBlock, SectionBlock, ActionsBlock & { elements: Button[] }];

const acknowledge: Middleware<SlackActionMiddlewareArgs<BlockAction<ButtonAction>>> = async (args) => {
  await args.ack()

  await args.next();

  const previousMessage: MessageBlocks<true> = args.body.message?.blocks;

  const newMessage: MessageBlocks = [
    previousMessage[0],
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `<@${args.body.user.id}> clicked *${args.payload.text.text}*`,
      },
    },
  ]

  await args.respond({
    blocks: newMessage,
    replace_original: true,
  })
}

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" })
    return;
  }
  await appRunner.handleEvents(req, res);
}

export const ACTION_IDS = {
  "CONFIRM_MEETING_BUTTON": "CONFIRM_MEETING_BUTTON",
  "COMPLETE_MEETING_BUTTON": "COMPLETE_MEETING_BUTTON",
  "CANCEL_MEETING_BUTTON": "CANCEL_MEETING_BUTTON",
}

app.action<BlockAction<ButtonAction>>(
  ACTION_IDS.CONFIRM_MEETING_BUTTON,
  acknowledge,
  async (args) => {
    const meeting = await update(meetingsTable, {
      id: args.action.value,
      lastModifiedAt: Math.floor(new Date().getTime() / 1000),
      state: 'CONFIRMED',
    })

    const text = `Thanks for confirming your meeting, I hope it goes well! Keep me updated on how it goes.\n\nTip: Want to share what your takeaways from the conversation were? You can use this shared Slack conversation as a record of what you learnt from each other.`;
    const blocks: MessageBlocks<true> = [{
      type: 'section',
      text: {
        type: 'mrkdwn',
        text,
      },
    }, {
      type: "actions",
      elements: [
        {
          type: "button",
          text: {
            type: "plain_text",
            text: ":raised_hands: We met!",
            emoji: true,
          },
          action_id: ACTION_IDS.COMPLETE_MEETING_BUTTON,
          value: meeting.id,
        },
        {
          type: "button",
          text: {
            type: "plain_text",
            text: ":x: We cancelled our meeting",
            emoji: true,
          },
          action_id: ACTION_IDS.CANCEL_MEETING_BUTTON,
          value: meeting.id,
        },
      ],
    }]
    await args.say({ text, blocks })
  },
)
