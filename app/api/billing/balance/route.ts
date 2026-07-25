import { getChatGPTUser } from "../../../chatgpt-auth";
import { ensureCreditAccount, getCreditBalance } from "../../../../lib/billing";

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in is required." }, { status: 401 });

  const userId = user.email.toLowerCase();
  await ensureCreditAccount(userId, user.email);
  const balanceMicroUsd = await getCreditBalance(userId);
  return Response.json({ balanceMicroUsd, balanceUsd: balanceMicroUsd / 1_000_000 });
}
