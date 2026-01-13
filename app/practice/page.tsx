import PracticePageClient from './practice-client';
import { getSupabaseServerClient } from '@/lib/supabase/server-client';
import { getSupabaseServiceRoleClient } from '@/lib/supabase/server';
import { mapProgressRows, type ProgressListRow, type RemoteProgressRow } from '@/lib/progress-rows';

export default async function PracticePage() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  let initialRemoteRows: ProgressListRow[] = [];

  if (user?.id) {
    const admin = getSupabaseServiceRoleClient();
    const { data } = await admin
      .from('verse_progress')
      .select('verse_id, best_accuracy, total_attempts, last_attempt_at, translation, reference, source, perfect_counts')
      .eq('user_id', user.id)
      .is('deleted_at', null);
    if (Array.isArray(data)) {
      initialRemoteRows = mapProgressRows(data as RemoteProgressRow[]);
    }
  }

  return <PracticePageClient initialRemoteRows={initialRemoteRows} />;
}
