/**
 * components/SplashScreen.tsx — Full-screen loading overlay shown while the auth session is initialising.
 *
 * Displayed by ProtectedRoute while AuthContext is still resolving the stored access token.
 * Renders a plain white overlay with the token logo centred, matching the native app icon so
 * the transition from the OS-level PWA launch splash feels like a single continuous screen.
 * Disappears as soon as isLoading becomes false in AuthContext.
 */
export default function SplashScreen() {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: '#ffffff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
    }}>
      <img
        src="/icons/token-logo-SF.png"
        alt="PRIM'O"
        style={{ width: 140, height: 'auto' }}
      />
    </div>
  );
}
