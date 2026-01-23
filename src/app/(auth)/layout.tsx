import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { FlipWords } from "ui/flip-words";
import { BackgroundPaths } from "ui/background-paths";

export default async function AuthLayout({
  children,
}: { children: React.ReactNode }) {
  const t = await getTranslations("Auth.Intro");
  return (
    <main className="relative w-full flex flex-col h-screen">
      <div className="flex-1">
        <div className="flex min-h-screen w-full">
          <div className="hidden lg:flex lg:w-1/2 bg-muted border-r flex-col p-18 relative">
            <div className="absolute inset-0 w-full h-full">
              <BackgroundPaths />
            </div>
            <h1 className="animate-in fade-in duration-1000">
              <Image
                src="/samba-resources/logos/agentic-suite-logo.png"
                alt="Agentic Suite"
                width={904}
                height={91}
                className="h-[32px] w-auto max-w-full"
                priority
                unoptimized
              />
            </h1>
            <div className="flex-1" />
            <FlipWords
              words={[t("description")]}
              className=" mb-4 text-muted-foreground"
            />
          </div>

          <div className="w-full lg:w-1/2 p-6">{children}</div>
        </div>
      </div>
    </main>
  );
}
