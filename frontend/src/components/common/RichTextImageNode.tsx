import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { X } from 'lucide-react';

export default function RichTextImageNode({ node, deleteNode }: NodeViewProps) {
  return (
    <NodeViewWrapper className='relative inline-block group my-2'>
      <img
        src={node.attrs.src}
        alt={node.attrs.alt ?? ''}
        className='max-w-full rounded-md block'
      />
      <button
        type='button'
        onClick={deleteNode}
        className='absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 hover:bg-red-600 text-white rounded-full p-0.5 shadow'
        title='Remove image'
      >
        <X className='w-3.5 h-3.5' />
      </button>
    </NodeViewWrapper>
  );
}
