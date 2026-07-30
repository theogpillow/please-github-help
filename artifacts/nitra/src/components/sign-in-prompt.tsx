import { useLocation } from 'wouter';
import { X, LogIn } from 'lucide-react';

interface SignInPromptProps {
  action: 'like' | 'save';
  onClose: () => void;
}

export function SignInPrompt({ action, onClose }: SignInPromptProps) {
  const [, setLocation] = useLocation();

  const handleSignIn = () => {
    onClose();
    setLocation('/login');
  };

  return (
    <>
      {/* Backdrop — clicking dismisses */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Toast-style prompt anchored near the bottom */}
      <div
        className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm
                   bg-black/90 backdrop-blur-md border border-white/15 rounded-2xl shadow-2xl
                   flex items-center gap-3 px-4 py-3 animate-in slide-in-from-bottom-4 fade-in duration-200"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Sign in to ${action} this post`}
      >
        {/* Icon */}
        <div className="shrink-0 h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center">
          <LogIn className="h-4 w-4 text-primary" />
        </div>

        {/* Message */}
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-semibold leading-tight">
            Sign in to {action} this post
          </p>
          <p className="text-white/50 text-xs mt-0.5">
            Join Nitra to interact with founders
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleSignIn}
            className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-full hover:bg-primary/90 transition-colors"
          >
            Sign In
          </button>
          <button
            onClick={onClose}
            className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5 text-white/60" />
          </button>
        </div>
      </div>
    </>
  );
}
