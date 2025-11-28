'use client';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  placeholder?: string;
}

export default function ChatInput({
  value,
  onChange,
  onSubmit,
  isLoading,
  placeholder = 'What do you want to create?',
}: ChatInputProps) {
  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-4">
      <form onSubmit={onSubmit} className="w-full">
        <div className="relative">
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSubmit(e);
              }
            }}
            placeholder={placeholder}
            rows={4}
            className="w-full px-8 pt-8 pb-10 pr-20 text-sm font-normal rounded-2xl border border-gray-300 bg-white/20 backdrop-blur-md shadow-lg focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-gray-400 transition-all placeholder:text-neutral-500 placeholder:font-normal text-neutral-900 resize-none"
          />
          <button
            type="submit"
            disabled={!value.trim() || isLoading}
            className="absolute right-6 bottom-6 text-neutral-400 hover:text-neutral-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}

