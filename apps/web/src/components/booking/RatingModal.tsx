import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import { Star, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { backendDb } from "@/integrations/backend/client";
import { useToast } from "@/hooks/use-toast";

interface RatingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  revieweeId: string;
  revieweeName: string;
  reviewerId: string;
  type: "professional" | "clinic";
  onSuccess?: () => void;
}

const RatingModal = ({
  open,
  onOpenChange,
  bookingId,
  revieweeId,
  revieweeName,
  reviewerId,
  type,
  onSuccess,
}: RatingModalProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({
        title: t("rating.selectRating"),
        description: t("rating.selectRatingDesc"),
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Insert rating
      const { error: ratingError } = await backendDb.from("ratings").insert({
        booking_id: bookingId,
        reviewer_id: reviewerId,
        reviewee_id: revieweeId,
        rating,
        comment: comment.trim() || null,
      });

      if (ratingError) throw ratingError;

      // Update booking status to completed if not already
      await backendDb
        .from("bookings")
        .update({ status: "completed" })
        .eq("id", bookingId);

      // Update average rating for the reviewee
      const table = type === "professional" ? "profiles" : "clinics";
      const idColumn = type === "professional" ? "id" : "id";

      // Fetch all ratings for this reviewee
      const { data: allRatings } = await backendDb
        .from("ratings")
        .select("rating")
        .eq("reviewee_id", revieweeId);

      if (allRatings && allRatings.length > 0) {
        const avgRating =
          allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length;

        await backendDb
          .from(table)
          .update({
            rating_avg: avgRating,
            rating_count: allRatings.length,
          })
          .eq(idColumn, revieweeId);
      }

      toast({
        title: t("rating.submitted"),
        description: t("rating.submittedDesc"),
      });

      onSuccess?.();
      onOpenChange(false);
      setRating(0);
      setComment("");
    } catch (error) {
      console.error("Rating error:", error);
      toast({
        title: t("common.error"),
        description: t("rating.submitError"),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("rating.rateExperience")}</DialogTitle>
          <DialogDescription>
            {t("rating.rateDesc", { name: revieweeName })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Star Rating */}
          <div className="flex flex-col items-center gap-3">
            <p className="text-sm text-muted-foreground">
              {t("rating.howWasIt")}
            </p>
            <div
              className="flex gap-1"
              role="radiogroup"
              aria-label={t("rating.starRating")}
            >
              {[1, 2, 3, 4, 5].map((star) => (
                <motion.button
                  key={star}
                  type="button"
                  role="radio"
                  aria-checked={rating === star}
                  aria-label={`${star} ${star === 1 ? t("rating.star") : t("rating.stars")}`}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                >
                  <Star
                    className={`w-10 h-10 transition-colors ${
                      star <= (hoveredRating || rating)
                        ? "fill-warning text-warning"
                        : "text-muted-foreground/30"
                    }`}
                  />
                </motion.button>
              ))}
            </div>
            {rating > 0 && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm font-medium text-foreground"
              >
                {rating === 5
                  ? t("rating.excellent")
                  : rating === 4
                    ? t("rating.good")
                    : rating === 3
                      ? t("rating.okay")
                      : rating === 2
                        ? t("rating.poor")
                        : t("rating.terrible")}
              </motion.p>
            )}
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <label
              htmlFor="comment"
              className="text-sm font-medium text-foreground"
            >
              {t("rating.addComment")}{" "}
              <span className="text-muted-foreground">
                ({t("common.optional")})
              </span>
            </label>
            <Textarea
              id="comment"
              placeholder={t("rating.commentPlaceholder")}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-end">
              {comment.length}/500
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              className="flex-1"
              onClick={handleSubmit}
              disabled={isSubmitting || rating === 0}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                t("rating.submit")
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RatingModal;
