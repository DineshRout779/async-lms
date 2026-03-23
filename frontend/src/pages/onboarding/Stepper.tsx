

type Step = 'college' | 'batch' | 'program' | 'confirm';

const steps = [
  { id: 'college', label: 'College' },
  { id: 'batch', label: 'Batch' },
  { id: 'program', label: 'Program' },
  { id: 'confirm', label: 'Confirm' },
];

export function Stepper({ current }: { current: Step }) {
  const currentIndex = steps.findIndex((s) => s.id === current);

  return (
    <div className='flex items-center justify-between w-full relative max-w-[320px] mx-auto z-10'>
      <div className='absolute top-3.5 left-[12%] right-[12%] h-[2px] bg-slate-200 -z-10'></div>
      {steps.map((step, i) => {
        const isActive = i === currentIndex;
        
        return (
          <div key={step.id} className='flex flex-col items-center gap-2 bg-white px-2 py-1'>
            <div
              className={`h-7 w-7 rounded-full text-[13px] font-bold flex items-center justify-center transition-colors
                ${
                  isActive
                    ? 'bg-[#344499] text-white shadow-md'
                    : 'bg-slate-200 text-white'
                }`}
            >
              {i + 1}
            </div>
            <span className={`text-[10px] font-bold tracking-wide ${isActive ? 'text-[#344499]' : 'text-slate-400'}`}>
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
