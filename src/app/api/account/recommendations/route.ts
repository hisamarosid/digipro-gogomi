import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/session';
import { RecommendationService } from '@/services/recommendation.service';

export async function GET() {
  try {
    const session = await getCurrentSession();
    const data = await RecommendationService.getRecommendationsForUser(session?.userId || null, 8);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
