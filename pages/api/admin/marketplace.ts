import type { NextApiRequest, NextApiResponse } from "next";
const { marketplaceAdminHandler } = require("@/lib/server/marketplace/handlers");

export const maxDuration = 60;
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "4mb",
    },
  },
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  return marketplaceAdminHandler(req, res);
}
