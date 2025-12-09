import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  steps: string[];
}

export const StepIndicator = ({ currentStep, totalSteps, steps }: StepIndicatorProps) => {
  return (
    <div className="w-full py-4">
      <div className="flex justify-between relative">
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-100 -z-10 transform -translate-y-1/2" />
        <div 
          className="absolute top-1/2 left-0 h-0.5 bg-primary -z-10 transform -translate-y-1/2 transition-all duration-500 ease-in-out"
          style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
        />
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === currentStep;
          const isCompleted = stepNumber < currentStep;

          return (
            <div key={step} className="flex flex-col items-center bg-white px-2">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                  isActive ? "border-primary bg-primary text-white scale-110 shadow-lg" : 
                  isCompleted ? "border-primary bg-primary text-white" : "border-gray-200 text-gray-400 bg-white"
                )}
              >
                {isCompleted ? <Check className="w-4 h-4" /> : <span className="text-xs font-bold">{stepNumber}</span>}
              </div>
              <span className={cn("text-xs mt-2 font-medium transition-colors duration-300 hidden md:block", isActive || isCompleted ? "text-primary" : "text-gray-400")}>
                {step}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
