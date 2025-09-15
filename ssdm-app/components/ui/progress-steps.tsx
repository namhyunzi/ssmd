"use client"

interface ProgressStepsProps {
  currentStep: number
  steps: {
    number: number
    title: string
  }[]
}

export default function ProgressSteps({ currentStep, steps }: ProgressStepsProps) {
  return (
    <div className="w-full max-w-2xl mx-auto mb-8">
      <div className="flex items-center justify-center space-x-8">
        {steps.map((step) => {
          const isCurrent = step.number === currentStep
          
          return (
            <div key={step.number} className="text-center">
              <div className={`
                text-lg font-medium
                ${isCurrent 
                  ? 'text-blue-600' 
                  : 'text-gray-400'
                }
              `}>
                {step.number} {step.title}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
