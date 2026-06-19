import { motion } from "framer-motion";
import { Check } from "lucide-react";

interface Step {
  key: string;
  label: string;
  icon: React.ElementType;
}

interface OnboardingProgressProps {
  steps: Step[];
  currentStep: string;
}

const OnboardingProgress = ({
  steps,
  currentStep,
}: OnboardingProgressProps) => {
  const currentIndex = steps.findIndex((s) => s.key === currentStep);

  return (
    <nav className="mb-8" aria-label="Onboarding progress">
      <div
        className="flex items-center justify-between relative"
        role="list"
        aria-label={`Step ${currentIndex + 1} of ${steps.length}`}
      >
        {/* Progress line background */}
        <div
          className="absolute top-5 left-0 right-0 h-0.5 bg-border"
          style={{ marginLeft: "20px", marginRight: "20px" }}
        />

        {/* Progress line fill */}
        <motion.div
          className="absolute top-5 left-0 h-0.5 bg-primary"
          style={{ marginLeft: "20px" }}
          initial={{ width: "0%" }}
          animate={{
            width: `${currentIndex === 0 ? 0 : (currentIndex / (steps.length - 1)) * 100}%`,
          }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        />

        {steps.map((step, index) => {
          const isCompleted = currentIndex > index;
          const isCurrent = currentIndex === index;
          const StepIcon = step.icon;

          return (
            <div
              key={step.key}
              className="flex flex-col items-center z-10"
              role="listitem"
              aria-current={isCurrent ? "step" : undefined}
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: index * 0.1 }}
                className={`flex items-center justify-center w-11 h-11 md:w-12 md:h-12 rounded-full border-2 transition-all duration-300 ${
                  isCompleted
                    ? "border-primary bg-primary text-primary-foreground"
                    : isCurrent
                      ? "border-primary bg-primary text-primary-foreground ring-4 ring-primary/20"
                      : "border-border bg-background text-muted-foreground"
                }`}
                aria-label={`${step.label}${isCompleted ? " - completed" : isCurrent ? " - current step" : ""}`}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5" aria-hidden="true" />
                ) : (
                  <StepIcon className="w-5 h-5" aria-hidden="true" />
                )}
              </motion.div>
              <span
                className={`text-xs mt-2 font-medium transition-colors text-center max-w-[80px] ${
                  isCurrent
                    ? "text-primary"
                    : isCompleted
                      ? "text-foreground"
                      : "text-muted-foreground"
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </nav>
  );
};

export default OnboardingProgress;
