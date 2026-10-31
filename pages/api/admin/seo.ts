import type { NextApiRequest, NextApiResponse } from "next";
const { seoHandler } = require("@/lib/server/seo/handlers");

export const maxDuration = 60;
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "1mb",
    },
  },
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  return seoHandler(req, res);
}

