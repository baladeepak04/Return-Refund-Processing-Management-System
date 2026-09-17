import { useState } from 'react';
import Modal from '../ui/Modal';
import { submitSatisfactionFeedback } from '../../lib/api';
import { useToast } from '../../lib/ToastContext';

export default function FeedbackModal({ isOpen, onClose, returnRequest, onSubmitted }) {
  const [rating, setRating] = useState(10);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const { addToast } = useToast();

  if (!isOpen || !returnRequest) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await submitSatisfactionFeedback(returnRequest.id, {
        rating: parseInt(rating, 10),
        comment: comment.trim() || 'Prompt and seamless return pickup and refund settlement.'
      });
      addToast(`Thank you! Your ${rating}/10 rating has been recorded.`, 'success', 'Rating Submitted');
      if (onSubmitted) onSubmitted();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || 'Failed to submit rating');
    } finally {
      setSubmitting(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 9) return 'bg-emerald-600 text-white';
    if (score >= 7) return 'bg-amber-500 text-white';
    return 'bg-rose-500 text-white';
  };

  const getScoreLabel = (score) => {
    if (score >= 9) return 'Promoter: Highly Likely to Recommend! 🎉';
    if (score >= 7) return 'Passive: Satisfied with the service 👍';
    return 'Detractor: Needs service improvement ⚠️';
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Rate Your Return & Refund Experience" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <p className="text-xs text-text-secondary leading-relaxed">
            How likely are you to recommend ReturnFlow reverse logistics to a friend or colleague?
          </p>
          <div className="mt-3 flex justify-between gap-1 overflow-x-auto pb-1">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => {
              const isSelected = rating === score;
              return (
                <button
                  key={score}
                  type="button"
                  onClick={() => setRating(score)}
                  className={`w-8 h-9 rounded text-xs font-bold transition-all ${
                    isSelected
                      ? getScoreColor(score) + ' shadow-md scale-105'
                      : 'bg-gray-100 hover:bg-gray-200 text-text'
                  }`}
                >
                  {score}
                </button>
              );
            })}
          </div>
          <div className="flex justify-between text-[10px] text-text-muted mt-1 px-1">
            <span>0 - Not Likely</span>
            <span>10 - Extremely Likely</span>
          </div>
          <div className="mt-2 text-center text-xs font-semibold text-text">
            {getScoreLabel(rating)}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-text mb-1">
            Additional Comments or Suggestions (Optional)
          </label>
          <textarea
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Tell us what you liked or how we can improve our return & pickup process…"
            className="w-full text-xs p-2.5 border border-border rounded-lg focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        {error && (
          <div className="p-2.5 bg-danger-50 border border-danger-200 text-danger text-xs rounded-md">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs border border-border rounded-lg text-text-secondary hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 text-xs bg-primary text-white rounded-lg hover:bg-primary-dark font-medium shadow-xs disabled:opacity-50"
          >
            {submitting ? 'Submitting…' : 'Submit Feedback'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
