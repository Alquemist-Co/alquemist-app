import { NextRequest } from "next/server";

const CRON_SECRET = process.env.CRON_SECRET;

export function validateCronRequest(request: NextRequest): boolean {
  if (!CRON_SECRET) return false;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${CRON_SECRET}`;
}
