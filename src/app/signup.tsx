import { Redirect } from 'expo-router';

// Signup is now handled in login.tsx via the tab switcher
export default function SignupScreen() {
  return <Redirect href="/login" />;
}
