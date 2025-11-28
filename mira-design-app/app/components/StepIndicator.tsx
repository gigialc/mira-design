interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

export default function StepIndicator({ currentStep, totalSteps }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: totalSteps }).map((_, index) => {
        const step = index + 1;
        const isActive = step === currentStep;
        const isCompleted = step < currentStep;
        
        return (
          <div key={step} className="flex items-center">
            <div
              className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all
                ${isActive 
                  ? 'bg-black text-white dark:bg-white dark:text-black' 
                  : isCompleted
                  ? 'bg-gray-300 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                  : 'bg-gray-200 text-gray-400 dark:bg-gray-800 dark:text-gray-600'
                }
              `}
            >
              {isCompleted ? '✓' : step}
            </div>
            {step < totalSteps && (
              <div
                className={`
                  w-12 h-0.5 mx-2 transition-all
                  ${isCompleted ? 'bg-gray-300 dark:bg-gray-700' : 'bg-gray-200 dark:bg-gray-800'}
                `}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

