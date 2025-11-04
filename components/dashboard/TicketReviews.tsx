"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface Review {
  id: string;
  reviewer_type: "admin" | "customer";
  rating: number | null;
  comment: string | null;
  created_at: string;
}

interface TicketReviewsProps {
  ticketId: string;
  isClosed: boolean;
}

export default function TicketReviews({ ticketId, isClosed }: TicketReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [adminRating, setAdminRating] = useState<number | null>(null);
  const [adminComment, setAdminComment] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReviews();
  }, [ticketId]);

  const fetchReviews = async () => {
    try {
      const response = await fetch(`/api/tickets/${ticketId}/reviews`);
      const data = await response.json();
      setReviews(data.reviews || []);
      
      const adminReview = data.reviews?.find((r: Review) => r.reviewer_type === "admin");
      if (adminReview) {
        setAdminRating(adminReview.rating);
        setAdminComment(adminReview.comment || "");
      }
    } catch (error) {
      console.error("Error fetching reviews:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAdminReview = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/tickets/${ticketId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewerType: "admin",
          rating: adminRating,
          comment: adminComment,
        }),
      });

      if (response.ok) {
        await fetchReviews();
        setAdminComment("");
      }
    } catch (error) {
      console.error("Error saving review:", error);
      alert("Failed to save review");
    } finally {
      setIsSaving(false);
    }
  };

  const customerReview = reviews.find((r) => r.reviewer_type === "customer");

  if (loading) {
    return <div className="text-sm text-gray-500">Loading reviews...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Admin Review Section */}
      <div className="border rounded-lg p-4 bg-gray-50">
        <h3 className="font-semibold mb-3">Admin Review</h3>
        
        <div className="mb-3">
          <label className="block text-sm font-medium mb-2">Rating (1-5)</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                onClick={() => setAdminRating(rating)}
                className={`w-10 h-10 rounded-full border-2 transition-colors ${
                  adminRating === rating
                    ? "bg-blue-600 border-blue-600 text-white"
                    : "bg-white border-gray-300 text-gray-600 hover:border-blue-400"
                }`}
              >
                {rating}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-3">
          <label className="block text-sm font-medium mb-2">Internal Notes</label>
          <Textarea
            value={adminComment}
            onChange={(e) => setAdminComment(e.target.value)}
            placeholder="Add internal notes about this ticket..."
            className="min-h-[100px]"
          />
        </div>

        <Button
          onClick={handleSaveAdminReview}
          disabled={isSaving || !adminRating}
          size="sm"
        >
          {isSaving ? "Saving..." : "Save Review"}
        </Button>
      </div>

      {/* Customer Review */}
      {customerReview && (
        <div className="border rounded-lg p-4 bg-blue-50">
          <h3 className="font-semibold mb-2">Customer Satisfaction</h3>
          {customerReview.rating && (
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">⭐</span>
              <span className="font-bold">{customerReview.rating}/5</span>
            </div>
          )}
          {customerReview.comment && (
            <p className="text-sm text-gray-700">{customerReview.comment}</p>
          )}
        </div>
      )}
    </div>
  );
}

