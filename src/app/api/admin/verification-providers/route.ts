import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/session';
import { db } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAdmin();
    const rules = await (db as any).verificationProviderRule.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const defaultProviders = ['NETFLIX', 'ADOBE', 'CANVA', 'SPOTIFY', 'CHATGPT', 'CLAUDE', 'OTHER', 'GENERIC'];

    return NextResponse.json({ success: true, data: rules, defaultProviders });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();

    const {
      providerName,
      enabled,
      allowedSenders,
      subjectPatterns,
      bodyKeywords,
      codeType,
      allowedCodeLengths,
      codeTtlMinutes,
      recentLookbackMinutes,
      confidenceThreshold,
    } = body;

    if (!providerName || !providerName.trim()) {
      return NextResponse.json({ success: false, error: 'Nama provider wajib diisi' }, { status: 400 });
    }

    const cleanName = providerName.trim().toUpperCase();

    const rule = await (db as any).verificationProviderRule.upsert({
      where: { providerName: cleanName },
      update: {
        enabled: enabled !== undefined ? Boolean(enabled) : true,
        allowedSenders: Array.isArray(allowedSenders) ? allowedSenders : [],
        subjectPatterns: Array.isArray(subjectPatterns) ? subjectPatterns : [],
        bodyKeywords: Array.isArray(bodyKeywords) ? bodyKeywords : [],
        codeType: codeType || 'NUMERIC',
        allowedCodeLengths: Array.isArray(allowedCodeLengths) ? allowedCodeLengths : [4, 6],
        codeTtlMinutes: codeTtlMinutes ? Number(codeTtlMinutes) : 15,
        recentLookbackMinutes: recentLookbackMinutes ? Number(recentLookbackMinutes) : 5,
        confidenceThreshold: confidenceThreshold || 'HIGH',
      },
      create: {
        providerName: cleanName,
        enabled: enabled !== undefined ? Boolean(enabled) : true,
        allowedSenders: Array.isArray(allowedSenders) ? allowedSenders : [],
        subjectPatterns: Array.isArray(subjectPatterns) ? subjectPatterns : [],
        bodyKeywords: Array.isArray(bodyKeywords) ? bodyKeywords : [],
        codeType: codeType || 'NUMERIC',
        allowedCodeLengths: Array.isArray(allowedCodeLengths) ? allowedCodeLengths : [4, 6],
        codeTtlMinutes: codeTtlMinutes ? Number(codeTtlMinutes) : 15,
        recentLookbackMinutes: recentLookbackMinutes ? Number(recentLookbackMinutes) : 5,
        confidenceThreshold: confidenceThreshold || 'HIGH',
      },
    });

    return NextResponse.json({ success: true, data: rule });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
