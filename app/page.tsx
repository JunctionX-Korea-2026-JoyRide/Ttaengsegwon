import { ChatInterface } from "@/components/ChatInterface";

export default function Home() {
  return (
    <main className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 bg-slate-100 flex flex-col justify-center">
      <ChatInterface />
    </main>
  );
}
