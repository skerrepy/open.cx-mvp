"use client";

import { useState, useEffect } from "react";
import { Star } from "lucide-react";

interface CustomerSatisfactionProps {
  ticketId: string;
}

export default function CustomerSatisfaction({ ticketId }: CustomerSatisfactionProps) {
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  useEffect(() => {
    checkExistingReview();
  }, [ticketId]);

  const checkExistingReview = async () => {
    try {
      const response = await fetch(`/api/tickets/${ticketId}/reviews`);
      const data = await response.json();
      const customerReview = data.reviews?.find((r: any) => r.reviewer_type === "customer");
      if (customerReview) {
        setRating(customerReview.rating);
        setComment(customerReview.comment || "");
        setHasSubmitted(true);
      }
    } catch (error) {
      console.error("Error checking review:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!rating) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/tickets/${ticketId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewerType: "customer",
          rating,
          comment: comment.trim() || null,
        }),
      });

      if (response.ok) {
        setHasSubmitted(true);
      }
    } catch (error) {
      console.error("Error submitting review:", error);
      alert("Failed to submit rating. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return null;
  }

  if (hasSubmitted) {
    return (
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-3">
        <div className="flex items-center gap-2">
          <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
          <div>
            <p className="font-semibold text-sm">Thank you for your feedback!</p>
            <p className="text-xs text-gray-600">
              You rated us {rating}/5 {comment && `• "${comment}"`}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-3">
      <h3 className="font-semibold text-sm mb-2">How was your experience?</h3>
      <div className="flex gap-1 mb-2">
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = hoverRating ? star <= hoverRating : (rating ? star <= rating : false);
          return (
            <button
              key={star}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(null)}
              className="transition-transform hover:scale-110 focus:outline-none"
              type="button"
            >
              <Star
                className={`w-6 h-6 transition-colors ${
                  isFilled
                    ? "fill-yellow-400 text-yellow-400"
                    : "fill-none text-gray-300"
                }`}
              />
            </button>
          );
        })}
      </div>
      <textarea
        placeholder="Optional: Share your thoughts..."
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        className="w-full border border-gray-300 rounded px-3 py-2 text-sm mb-2"
        rows={2}
      />
      <button
        onClick={handleSubmit}
        disabled={!rating || isSubmitting}
        className="w-full bg-blue-600 text-white rounded px-3 py-2 text-sm hover:bg-blue-700 disabled:bg-gray-300"
      >
        {isSubmitting ? "Submitting..." : "Submit Rating"}
      </button>
    </div>
  );
}

