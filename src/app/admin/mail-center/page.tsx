import { requireAdmin } from '@/lib/auth/session';
import { db } from '@/lib/db/prisma';
import { decryptPayload } from '@/lib/security/encryption';
import { AdminMailCenterClient } from './AdminMailCenterClient';

export const dynamic = 'force-dynamic';

export default async function AdminMailCenterPage() {
  await requireAdmin();

  const [rules, mailboxes, rawEvents] = await Promise.all([
    (db as any).verificationProviderRule.findMany({ orderBy: { createdAt: 'desc' } }),
    (db as any).mailbox.findMany({ orderBy: { lastReceivedAt: 'desc' } }),
    (db as any).verificationCodeEvent.findMany({
      orderBy: { receivedAt: 'desc' },
      take: 50,
    }),
  ]);

  const formattedRules = rules.map((r: any) => ({
    id: r.id,
    providerName: r.providerName,
    enabled: r.enabled,
    allowedSenders: r.allowedSenders || [],
    codeType: r.codeType || 'NUMERIC',
    allowedCodeLengths: r.allowedCodeLengths || [4, 6],
    codeTtlMinutes: r.codeTtlMinutes || 15,
    recentLookbackMinutes: r.recentLookbackMinutes || 5,
  }));

  const displayRules =
    formattedRules.length > 0
      ? formattedRules
      : [
          { providerName: 'NETFLIX', enabled: true, allowedSenders: ['@account.netflix.com'], codeType: 'NUMERIC', allowedCodeLengths: [4, 6], codeTtlMinutes: 15, recentLookbackMinutes: 5 },
          { providerName: 'CHATGPT', enabled: true, allowedSenders: ['@openai.com'], codeType: 'NUMERIC', allowedCodeLengths: [6], codeTtlMinutes: 15, recentLookbackMinutes: 5 },
          { providerName: 'ADOBE', enabled: true, allowedSenders: ['@adobe.com'], codeType: 'NUMERIC', allowedCodeLengths: [6], codeTtlMinutes: 15, recentLookbackMinutes: 5 },
          { providerName: 'CANVA', enabled: true, allowedSenders: ['@canva.com'], codeType: 'NUMERIC', allowedCodeLengths: [6], codeTtlMinutes: 15, recentLookbackMinutes: 5 },
          { providerName: 'SPOTIFY', enabled: true, allowedSenders: ['@spotify.com'], codeType: 'NUMERIC', allowedCodeLengths: [6], codeTtlMinutes: 15, recentLookbackMinutes: 5 },
          { providerName: 'CLAUDE', enabled: true, allowedSenders: ['@anthropic.com'], codeType: 'NUMERIC', allowedCodeLengths: [6], codeTtlMinutes: 15, recentLookbackMinutes: 5 },
        ];

  const formattedEvents = rawEvents.map((ev: any) => {
    let plainCode = '';
    try {
      plainCode = decryptPayload(ev.codeEncrypted);
    } catch {
      plainCode = ev.codeEncrypted;
    }

    return {
      id: ev.id,
      mailboxId: ev.mailboxId,
      provider: ev.provider,
      sender: ev.sender,
      subject: ev.subject,
      code: plainCode,
      confidence: ev.confidence,
      status: ev.status,
      receivedAt: ev.receivedAt ? new Date(ev.receivedAt).toISOString() : '',
    };
  });

  return (
    <AdminMailCenterClient
      initialRules={displayRules}
      initialMailboxes={mailboxes.map((m: any) => ({
        id: m.id,
        email: m.email,
        status: m.status,
        provider: m.provider || 'TMAIL',
        lastWebhookAt: m.lastWebhookAt ? new Date(m.lastWebhookAt).toISOString() : null,
        lastReceivedAt: m.lastReceivedAt ? new Date(m.lastReceivedAt).toISOString() : null,
      }))}
      initialEvents={formattedEvents}
    />
  );
}
