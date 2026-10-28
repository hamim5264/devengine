import type { NextApiRequest, NextApiResponse } from "next";
const { devkittyAdminHandler } = require("@/lib/server/devkitty/handlers");

export const maxDuration = 60;
export const config = { api: { bodyParser: { sizeLimit: "1mb" } } };

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  return devkittyAdminHandler(req, res);
}
