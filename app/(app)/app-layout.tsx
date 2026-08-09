import TopNav from "@/components/top-nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0A1420] text-gray-100">
      <TopNav />
      {children}
    </div>
  );
}
