import { NextResponse } from 'next/server';

export async function GET() {
  // Admin web notification polling has been migrated to Telegram Bot
  return NextResponse.json({
    success: true,
    count: 0,
    migrated: true,
    message: 'Admin notifications migrated to Telegram',
  });
}
