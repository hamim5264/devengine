import type { NextApiRequest, NextApiResponse } from "next";
const { securityMonitoringHandler } = require("@/lib/server/security/handlers");

export const maxDuration = 60;
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "1mb",
    },
  },
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  return securityMonitoringHandler(req, res);
}

