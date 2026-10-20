import { AppShell } from "@/components/AppShell";
import { DemoProvider } from "@/lib/state";

export default function Home() {
  return (
    <DemoProvider>
      <AppShell />
    </DemoProvider>
  );
}
