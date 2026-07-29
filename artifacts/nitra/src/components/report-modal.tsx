import { useState } from 'react';
import { Flag, X, Loader2 } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';

const REASONS = ['Spam', 'Inappropriate', 'Misleading', 'Other'] as const;
type Reason = typeof REASONS[number];

interface ReportModalProps {
  prototypeId: number;
  prototypeTitle: string;
  onClose: () => void;
}

export function ReportModal({ prototypeId, prototypeTitle, onClose }: ReportModalProps) {
  const { toast } = useToast();
  const currentUser = getCurrentUser();
  const [reason, setReason] = useState<Reason | ''>('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason || !currentUser) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reporterId: currentUser.id, prototypeId, reason }),
      });
      if (res.status === 409) {
        toast({ title: 'Already reported', description: "You've already reported this post." });
        onClose();
        return;
      }
      if (!res.ok) throw new Error('Failed');
      toast({ title: 'Report submitted', description: 'Thanks — our team will review it.' });
      onClose();
    } catch {
      toast({ title: 'Could not submit report', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 md:left-1/2 md:-translate-x-1/2 md:w-[380px] md:bottom-auto md:top-1/2 md:-translate-y-1/2 bg-background rounded-t-2xl md:rounded-2xl shadow-2xl border border-border animate-in slide-in-from-bottom-4 duration-200">
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Flag className="h-4 w-4 text-destructive" />
            <p className="font-semibold text-sm">Report post</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-muted transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <p className="text-xs text-muted-foreground truncate">"{prototypeTitle}"</p>
          <div className="space-y-2">
            <p className="text-sm font-medium">Why are you reporting this?</p>
            <div className="grid grid-cols-2 gap-2">
              {REASONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setReason(r)}
                  className={`px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors text-left ${
                    reason === r
                      ? 'bg-destructive/10 border-destructive text-destructive'
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <button
            disabled={!reason || submitting}
            onClick={handleSubmit}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold hover:bg-destructive/90 transition-colors disabled:opacity-50"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Submit Report
          </button>
        </div>
      </div>
    </>
  );
}
