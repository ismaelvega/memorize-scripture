import PracticeModeClient from './practice-mode-client';
import { getSupabaseServerClient } from '@/lib/supabase/server-client';
import { getSupabaseServiceRoleClient } from '@/lib/supabase/server';
import { mapAttemptRows, type RemoteAttemptRow } from '@/lib/attempts-map';

interface PracticeModePageProps {
  params: { mode: string } | Promise<{ mode: string }>;
  searchParams?: { id?: string } | Promise<{ id?: string }>;
}

export default async function PracticeModePage({ params, searchParams }: PracticeModePageProps) {
  const resolvedParams = await Promise.resolve(params);
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const verseId = resolvedSearchParams?.id ?? null;

  let initialRemoteAttempts: ReturnType<typeof mapAttemptRows> = [];
  let initialRemoteFetched = false;

  if (user?.id && verseId) {
    initialRemoteFetched = true;
    const admin = getSupabaseServiceRoleClient();
    const { data } = await admin
      .from('verse_attempts')
      .select('id, mode, accuracy, missed_count, extra_count, created_at, diff, transcription, speech_duration, confidence_score, stealth_stats, sequence_stats, reference, translation, source, verse_text')
      .eq('user_id', user.id)
      .eq('verse_id', verseId)
      .order('created_at', { ascending: false });
    if (Array.isArray(data)) {
      initialRemoteAttempts = mapAttemptRows(data as RemoteAttemptRow[]);
    }
  }

  return (
    <PracticeModeClient
      mode={resolvedParams?.mode ?? ''}
      initialRemoteAttempts={initialRemoteAttempts}
      initialRemoteAttemptsId={verseId}
      initialRemoteFetched={initialRemoteFetched}
    />
  );
}
