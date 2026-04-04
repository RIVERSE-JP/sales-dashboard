import { NextRequest, NextResponse } from "next/server";

const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN!;
const AUTH0_CLIENT_ID = process.env.AUTH0_CLIENT_ID!;

export async function POST(request: NextRequest) {
  const { email } = (await request.json()) as { email: string };

  // 이메일 존재 여부와 무관하게 동일 응답 (열거 공격 방지)
  await fetch(`https://${AUTH0_DOMAIN}/dbconnections/change_password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: AUTH0_CLIENT_ID,
      email,
      connection: "Username-Password-Authentication",
    }),
  }).catch(() => {});

  return NextResponse.json({ success: true });
}
