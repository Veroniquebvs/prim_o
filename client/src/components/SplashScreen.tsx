/**
 * components/SplashScreen.tsx — Full-screen loading overlay shown while the auth session is initialising.
 *
 * Displayed by ProtectedRoute while AuthContext is still resolving the stored access token.
 * Renders a fixed white overlay with a subtle green gradient at the top and the PRIM'O logo
 * centred on screen. Disappears as soon as isLoading becomes false in AuthContext.
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
      {/* Teinte verte en haut */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '35%',
        background: 'linear-gradient(to bottom, rgba(0, 184, 148, 0.12) 0%, transparent 100%)',
        pointerEvents: 'none',
      }} />

      <img
        src="/logo_page-chargement.png"
        alt="PRIM'O"
        style={{ width: 160, height: 'auto', position: 'relative' }}
      />
    </div>
  );
}
