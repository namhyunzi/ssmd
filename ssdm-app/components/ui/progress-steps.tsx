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
    <div className="text-xs">
      {steps.map((step, index) => {
        const isCurrent = step.number === currentStep
        
        return (
          <span key={step.number}>
            <span className={`
              ${isCurrent 
                ? 'text-primary' 
                : 'text-gray-500'
              }
            `}>
              {step.number} {step.title}
            </span>
            {index < steps.length - 1 && <span className="mx-1 text-gray-500">→</span>}
          </span>
        )
      })}
    </div>
  )
}
