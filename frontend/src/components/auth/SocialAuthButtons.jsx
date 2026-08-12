import React, { useState, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../utils/api';
import { AuthContext } from '../../context/AuthContext';
import { useToast } from '../ui/ToastProvider';
import { motion } from 'framer-motion';

// ─── SVG Icons ───────────────────────────────────────────────────────────────
const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
  </svg>
);

const FacebookIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#1877F2">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

// ─── Load GIS script once and return promise ──────────────────────────────────
let gisScriptPromise = null;
const loadGoogleIdentityServices = () => {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (gisScriptPromise) return gisScriptPromise;

  gisScriptPromise = new Promise((resolve, reject) => {
    // Check again after promise was created in case it was loaded between checks
    if (window.google?.accounts?.id) return resolve();

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(script);
  });

  return gisScriptPromise;
};

// ─── Load Facebook SDK once and return promise ────────────────────────────────
let fbSdkPromise = null;
const loadFacebookSDK = (appId) => {
  if (window.FB) return Promise.resolve();
  if (fbSdkPromise) return fbSdkPromise;

  fbSdkPromise = new Promise((resolve, reject) => {
    if (window.FB) return resolve();

    window.fbAsyncInit = () => {
      window.FB.init({
        appId,
        cookie: true,
        xfbml: false,
        version: 'v19.0',
      });
      resolve();
    };

    const script = document.createElement('script');
    script.id = 'facebook-jssdk';
    script.src = 'https://connect.facebook.net/en_US/sdk.js';
    script.async = true;
    script.defer = true;
    script.onerror = () => reject(new Error('Failed to load Facebook SDK'));
    document.head.appendChild(script);
  });

  return fbSdkPromise;
};

// ─── SocialAuthButtons Component ─────────────────────────────────────────────
const SocialAuthButtons = ({ actionText = 'Continue with' }) => {
  const [loadingProvider, setLoadingProvider] = useState(null);
  const { login } = useContext(AuthContext);
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const handleAuthSuccess = (resData) => {
    showToast(resData.isNewUser ? 'Welcome to EduVerse! 🎉' : 'Welcome back!', 'success');
    login(resData.token, resData.user);
    const from = location.state?.from?.pathname || '/';
    navigate(from, { replace: true });
  };

  // ── Google: ID Token flow via google.accounts.id.prompt() ──────────────────
  const handleGoogleAuth = async () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    if (!clientId) {
      showToast('Google login is not configured yet. Please contact support.', 'warning');
      return;
    }

    setLoadingProvider('google');

    try {
      await loadGoogleIdentityServices();

      // Initialize GIS with the One Tap / popup credential flow
      // This gives us a real `credential` (JWT ID token signed by Google)
      await new Promise((resolve, reject) => {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response) => {
            // response.credential is the verified Google ID token
            if (!response.credential) {
              reject(new Error('No credential returned from Google'));
              return;
            }

            try {
              // Send the real Google ID token to backend for cryptographic verification
              const res = await api.post('/auth/google', { idToken: response.credential });
              handleAuthSuccess(res.data);
              resolve();
            } catch (err) {
              const msg = err.response?.data?.message || 'Google authentication failed';
              showToast(msg, 'warning');
              reject(err);
            }
          },
          error_callback: (err) => {
            // popup_closed_by_user is not an error — handle gracefully
            if (err?.type === 'popup_closed') {
              showToast('Google sign-in was cancelled', 'info');
            } else if (err?.type === 'popup_failed_to_open') {
              showToast('Popup was blocked. Please allow popups for this site and try again.', 'warning');
            } else {
              showToast('Google login failed. Please try again.', 'warning');
            }
            reject(new Error(err?.type || 'google_error'));
          },
          ux_mode: 'popup',
          cancel_on_tap_outside: true,
        });

        // Trigger the Google account selection popup
        window.google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed()) {
            // Fallback: prompt was suppressed — use the accounts chooser popup directly
            window.google.accounts.id.renderButton(
              document.createElement('div'), // dummy container
              { theme: 'outline', size: 'large' }
            );
            // Use the click-based flow for environments where prompt is suppressed
            showToast('Popup was suppressed. Please check browser permissions.', 'warning');
            reject(new Error('prompt_not_displayed'));
          }
        });
      });
    } catch (err) {
      // Silently ignore user-cancelled flows; show toast for real errors
      if (err?.message !== 'popup_closed' && err?.message !== 'prompt_not_displayed') {
        if (err?.message !== 'google_error') {
          showToast('Google login failed. Please try again.', 'warning');
        }
      }
    } finally {
      setLoadingProvider(null);
    }
  };

  // ── Facebook: Access Token flow via FB.login() ─────────────────────────────
  const handleFacebookAuth = async () => {
    const appId = import.meta.env.VITE_FACEBOOK_APP_ID;

    if (!appId) {
      showToast('Facebook login is not configured yet. Please contact support.', 'warning');
      return;
    }

    setLoadingProvider('facebook');

    try {
      await loadFacebookSDK(appId);

      const fbResponse = await new Promise((resolve, reject) => {
        window.FB.login(
          (response) => {
            if (response.authResponse?.accessToken) {
              resolve(response);
            } else if (response.status === 'unknown' || !response.authResponse) {
              reject(new Error('fb_cancelled'));
            } else {
              reject(new Error('fb_failed'));
            }
          },
          { scope: 'email,public_profile', return_scopes: true }
        );
      });

      const { accessToken } = fbResponse.authResponse;

      // Send the real Facebook access token to backend for Graph API verification
      const res = await api.post('/auth/facebook', { accessToken });
      handleAuthSuccess(res.data);
    } catch (err) {
      if (err?.message === 'fb_cancelled') {
        showToast('Facebook sign-in was cancelled', 'info');
      } else if (err?.message === 'Failed to load Facebook SDK') {
        showToast('Could not load Facebook SDK. Please check your connection.', 'warning');
      } else {
        const msg = err.response?.data?.message || 'Facebook login failed. Please try again.';
        showToast(msg, 'warning');
      }
    } finally {
      setLoadingProvider(null);
    }
  };

  return (
    <div className="w-full space-y-4 my-6">
      <div className="relative flex items-center justify-center my-6">
        <div className="border-t border-white/10 w-full"></div>
        <span className="bg-background px-4 text-[11px] font-bold tracking-widest text-gray-500 uppercase shrink-0">
          OR {actionText}
        </span>
        <div className="border-t border-white/10 w-full"></div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Google Login Button */}
        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleGoogleAuth}
          disabled={loadingProvider !== null}
          className="w-full flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white font-semibold text-sm rounded-2xl py-3 px-4 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loadingProvider === 'google' ? (
            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
          ) : (
            <>
              <GoogleIcon />
              <span>Google</span>
            </>
          )}
        </motion.button>

        {/* Facebook Login Button */}
        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleFacebookAuth}
          disabled={loadingProvider !== null}
          className="w-full flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white font-semibold text-sm rounded-2xl py-3 px-4 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loadingProvider === 'facebook' ? (
            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
          ) : (
            <>
              <FacebookIcon />
              <span>Facebook</span>
            </>
          )}
        </motion.button>
      </div>
    </div>
  );
};

export default SocialAuthButtons;
