import { ActionsBlock as SlackActionsBlock, BlockAction, Button, ButtonAction, Middleware, SectionBlock, SlackActionMiddlewareArgs } from "@slack/bolt";
import { UsersListResponse } from '@slack/web-api'
import { Participant } from "./tables";

export const ACTION_IDS = {
  "CONFIRM_MEETING_BUTTON": "CONFIRM_MEETING_BUTTON",
  "COMPLETE_MEETING_BUTTON": "COMPLETE_MEETING_BUTTON",
  "DECLINE_MEETING_BUTTON": "DECLINE_MEETING_BUTTON",
  "RATE_MEETING_BUTTON_1": "RATE_MEETING_BUTTON_1",
  "RATE_MEETING_BUTTON_2": "RATE_MEETING_BUTTON_2",
  "RATE_MEETING_BUTTON_3": "RATE_MEETING_BUTTON_3",
  "RATE_MEETING_BUTTON_4": "RATE_MEETING_BUTTON_4",
  "RATE_MEETING_BUTTON_5": "RATE_MEETING_BUTTON_5",
} as const;

export type ActionId = keyof typeof ACTION_IDS;

type ActionsBlock = SlackActionsBlock & { elements: (Button & { action_id: ActionId })[] }

// All messages should be of the format
export type MessageBlocks<HasActions = boolean> =
  HasActions extends false ?
    /** Text only */
    | [SectionBlock]
    /** Text, action confirmation */
    | [SectionBlock, SectionBlock]
  :
    /** Text, actions */
    | [SectionBlock, ActionsBlock]

interface ButtonDefinition {
  text: string,
  id: ActionId,
  value: string,
}

export function makeMessage(markdown: string): MessageBlocks<false>;
export function makeMessage(markdown1: string, markdown2: string): MessageBlocks<false>;
export function makeMessage(markdown: string, actions: ButtonDefinition[]): MessageBlocks<true>;
export function makeMessage(arg1: string, arg2?: string | ButtonDefinition[]): MessageBlocks {
  if (typeof arg2 === "undefined") {
    return [{
      type: 'section',
      text: { type: 'mrkdwn', text: arg1 },
    }]
  }

  if (typeof arg2 === "string") {
    return [{
      type: 'section',
      text: { type: 'mrkdwn', text: arg1 },
    }, {
      type: 'section',
      text: { type: 'mrkdwn', text: arg2 },
    }]
  }

  return [{
    type: 'section',
    text: { type: 'mrkdwn', text: arg1 },
  }, {
    type: "actions",
    elements: arg2.map(({ text, id, value }) => {
      return {
        type: "button",
        text: {
          type: "plain_text",
          text: text,
        },
        action_id: id,
        value: value,
      }
    }),
  }]
}

export const acknowledgeSlackButton: Middleware<SlackActionMiddlewareArgs<BlockAction<ButtonAction>>> = async (args) => {
  await args.ack();

  const previousMessage: MessageBlocks = args.body.message?.blocks;
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

  await args.next();
}

export const findSlackId = (
  participant: Participant,
  members: NonNullable<UsersListResponse["members"]>
): string => {
  const slackId = members.find(m => {
    return m.is_email_confirmed && m.profile?.email === participant.slackEmail
  })?.id;
  if (slackId === undefined) {
    throw new Error(`Failed to find Slack member for participant ${participant.id}`)
  }
  return slackId;
}
