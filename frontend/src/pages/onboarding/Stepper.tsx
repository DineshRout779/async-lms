type Step = 'college' | 'batch' | 'subject';

const steps: Step[] = ['college', 'batch', 'subject'];

export function Stepper({ current }: { current: Step }) {
  return (
    <div className='flex items-center justify-center gap-4 mb-6'>
      {steps.map((step, i) => (
        <div key={step} className='flex items-center gap-2'>
          <div
            className={`h-6 w-6 rounded-full text-xs flex items-center justify-center
              ${
                current === step
                  ? 'bg-black text-white'
                  : 'bg-muted text-muted-foreground'
              }`}
          >
            {i + 1}
          </div>
          <span className='text-sm capitalize'>{step}</span>
        </div>
      ))}
    </div>
  );
}
