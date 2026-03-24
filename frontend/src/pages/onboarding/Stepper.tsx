type Step = 'college' | 'batch' | 'subject';

const steps: Step[] = ['college', 'batch', 'subject'];

export function Stepper({ current }: { current: Step }) {
  const currentIndex = steps.indexOf(current);

  return (
    <div className='flex items-start justify-center mb-6'>
      {steps.map((step, i) => (
        <div key={step} className='flex items-start'>
          <div className='flex flex-col items-center gap-2'>
            <div
              className={`h-7 w-7 rounded-full text-xs flex items-center justify-center font-medium
                ${
                  i <= currentIndex
                    ? 'bg-accent text-white'
                    : 'bg-muted text-muted-foreground'
                }`}
            >
              {i + 1}
            </div>
            <span className='text-xs capitalize text-muted-foreground'>{step}</span>
          </div>

          {i < steps.length - 1 && (
            <div
              className={`h-px w-12 mt-3.5 mx-2 ${
                i < currentIndex ? 'bg-accent' : 'bg-border'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
