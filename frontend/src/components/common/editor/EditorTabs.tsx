import { X } from 'lucide-react';

export type Tab = {
  path: string;
  dirty: boolean;
};

export default function EditorTabs({
  tabs,
  active,
  onSelect,
  onClose,
}: {
  tabs: Tab[];
  active: string | null;
  onSelect: (path: string) => void;
  onClose: (path: string) => void;
}) {
  return (
    <div className='flex bg-slate-900 border-b border-slate-800'>
      {tabs.map((tab) => (
        <div
          key={tab.path}
          className={`flex items-center gap-2 px-3 py-1 cursor-pointer border-r border-slate-800 ${
            active === tab.path
              ? 'bg-slate-800 text-white'
              : 'text-slate-400 hover:bg-slate-800'
          }`}
          onClick={() => onSelect(tab.path)}
        >
          <span className='text-xs'>
            {tab.path.split('/').pop()}
            {tab.dirty && ' •'}
          </span>

          <X
            size={12}
            className='hover:text-red-400'
            onClick={(e) => {
              e.stopPropagation();
              onClose(tab.path);
            }}
          />
        </div>
      ))}
    </div>
  );
}
