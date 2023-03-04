import { NextApiRequest, NextApiResponse } from "next";
import type { Request, Response } from 'express';
import { createMocks } from "node-mocks-http";
import handle from "./status";
import { describe, expect, test } from "vitest";

describe('/api/status', () => {
  test('returns an online status', async () => {
    const { req, res } = createMocks<
      NextApiRequest & Request,
      NextApiResponse & Response
    >({ method: 'GET' });

    await handle(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toEqual({
        status: 'Online',
    });
  })
})
