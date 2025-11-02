import { redirect } from 'next/navigation';

export default function Page() {
  // Redirect root to /practice immediately on the server
  redirect('/practice');
}
