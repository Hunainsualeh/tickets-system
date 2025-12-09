import { redirect } from 'next/navigation';

export default function Home() {
  // Redirect to login page by default
  // The login page will handle checking if user is already logged in
  redirect('/login');
}
