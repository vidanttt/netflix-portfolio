'use client';

export default function LoadingScreen({ profileName }: { profileName: string }) {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        {/* Netflix Logo */}
        <div className="mb-8">
          <h1 className="text-netflix-red text-6xl font-bold tracking-wide">
            NETFLIX
          </h1>
        </div>
        
        {/* Loading animation */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 border-4 border-netflix-red border-t-transparent rounded-full animate-spin"></div>
        </div>
        
        <p className="text-white text-xl">Loading {profileName}...</p>
      </div>
    </div>
  );
}
