'use client';

interface AddProfileCardProps {
  onClick: () => void;
}

export default function AddProfileCard({ onClick }: AddProfileCardProps) {
  return (
    <div 
      className="flex flex-col items-center cursor-pointer group"
      onClick={onClick}
    >
      <div className="relative transition-transform duration-200 group-hover:scale-110">
        <div className="w-32 h-32 md:w-40 md:h-40 rounded-lg overflow-hidden border-2 border-transparent group-hover:border-white transition-colors duration-200 bg-gray-600 flex items-center justify-center">
          <div className="text-white text-6xl md:text-7xl font-light">+</div>
        </div>
      </div>
      <p className="mt-3 text-gray-400 text-base md:text-lg transition-colors duration-200 group-hover:text-white">
        Add Profile
      </p>
    </div>
  );
}
