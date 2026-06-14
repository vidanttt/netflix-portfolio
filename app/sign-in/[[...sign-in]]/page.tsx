import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return (
    <div 
      className="flex min-h-screen w-full items-center justify-center p-4 bg-[#080808]"
      style={{
        backgroundImage: 'radial-gradient(circle at center, rgba(30, 30, 30, 0.35) 0%, rgba(5, 5, 5, 1) 100%)'
      }}
    >
      <SignIn />
    </div>
  );
}
