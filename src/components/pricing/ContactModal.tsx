'use client';

import { useState, FormEvent } from 'react';
import { submitContact, ContactFormData } from '@/lib/contact';

interface ContactModalProps {
  isOpen: boolean;
  initialPlan: 'free' | 'basic' | 'plus' | 'pro' | 'demo';
  onClose: () => void;
}

export function ContactModal({ isOpen, initialPlan, onClose }: ContactModalProps) {
  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    organization: '',
    email: '',
    plan: initialPlan,
    message: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const res = await submitContact(formData);
      setSuccessMessage(res.message);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to submit request. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={handleResetAndClose}
    >
      <div
        className="w-full max-w-lg rounded-sm border-2 border-border bg-paper shadow-2xl p-6 sm:p-8 space-y-5 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border pb-4">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-brass font-bold">
              {formData.plan === 'demo' ? 'Custom Demo' : `${formData.plan.toUpperCase()} Tier Ingestion`}
            </span>
            <h3 id="contact-modal-title" className="font-heading text-xl sm:text-2xl font-bold text-green-deep mt-0.5">
              {formData.plan === 'demo'
                ? 'Request a Live Walkthrough'
                : formData.plan === 'plus'
                ? 'Request Chamber Access (Plus)'
                : 'Enterprise Consultation (Pro)'}
            </h3>
          </div>

          <button
            type="button"
            onClick={handleResetAndClose}
            aria-label="Close modal"
            className="p-1 rounded-xs text-ink-muted hover:text-ink hover:bg-paper-dark font-mono text-sm focus-visible:ring-2 focus-visible:ring-brass focus-visible:outline-hidden cursor-pointer"
          >
            ✕
          </button>
        </div>

        {successMessage ? (
          /* Success Screen */
          <div className="space-y-4 py-4 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-green-deep/10 text-green-deep flex items-center justify-center text-2xl font-bold">
              ✓
            </div>
            <p className="font-sans text-sm text-ink leading-relaxed max-w-md mx-auto">
              {successMessage}
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={handleResetAndClose}
                className="px-6 py-2 rounded-xs bg-green-deep text-paper font-sans text-sm font-semibold hover:bg-green-mid transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* Form Screen */
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && (
              <div className="p-3 rounded-xs bg-vermillion/10 border border-vermillion/30 text-vermillion font-mono text-xs">
                {errorMessage}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono font-bold text-ink mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Adv. Rafiqul Islam"
                  className="w-full px-3 py-2 rounded-xs border border-border bg-paper-light text-xs font-sans text-ink focus-visible:ring-2 focus-visible:ring-brass focus-visible:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-ink mb-1">
                  Chamber / Institution *
                </label>
                <input
                  type="text"
                  required
                  value={formData.organization}
                  onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                  placeholder="Islam & Associates / Bank"
                  className="w-full px-3 py-2 rounded-xs border border-border bg-paper-light text-xs font-sans text-ink focus-visible:ring-2 focus-visible:ring-brass focus-visible:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono font-bold text-ink mb-1">
                Work Email *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="rafiqul@lawchamber.com.bd"
                className="w-full px-3 py-2 rounded-xs border border-border bg-paper-light text-xs font-sans text-ink focus-visible:ring-2 focus-visible:ring-brass focus-visible:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-mono font-bold text-ink mb-1">
                Selected Tier
              </label>
              <select
                value={formData.plan}
                onChange={(e) => setFormData({ ...formData, plan: e.target.value as ContactFormData['plan'] })}
                className="w-full px-3 py-2 rounded-xs border border-border bg-paper-light text-xs font-mono text-ink focus-visible:ring-2 focus-visible:ring-brass focus-visible:outline-hidden"
              >
                <option value="plus">Plus Tier (Chambers & Developers)</option>
                <option value="pro">Pro Tier (Banks & Multi-User)</option>
                <option value="demo">General Product Demo</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono font-bold text-ink mb-1">
                Specific Vetting Requirements (Optional)
              </label>
              <textarea
                rows={3}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Tell us about your monthly deed volume or title vetting workflows..."
                className="w-full px-3 py-2 rounded-xs border border-border bg-paper-light text-xs font-sans text-ink focus-visible:ring-2 focus-visible:ring-brass focus-visible:outline-hidden resize-none"
              />
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-border">
              <span className="text-[11px] font-mono text-ink-muted">
                No credit card required.
              </span>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xs bg-green-deep hover:bg-green-mid text-paper font-sans text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
