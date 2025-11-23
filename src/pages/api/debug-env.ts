// src/pages/api/debug-env.ts
import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  return res.status(200).json({
    AVA_URL: process.env.AVA_URL || "❌ MISSING",
    AVA_USERNAME: process.env.AVA_USERNAME || "❌ MISSING",
    AVA_PASSWORD: process.env.AVA_PASSWORD ? "✔ PRESENT" : "❌ MISSING",
    AVA_CONTRACTOR_ID: process.env.AVA_CONTRACTOR_ID || "❌ MISSING",
    NODE_ENV: process.env.NODE_ENV,
  });
}
