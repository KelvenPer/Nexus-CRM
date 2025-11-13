"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/auth";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    const run = async () => {
      await logout();
      router.replace("/login");
    };
    run();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0E1F2F] text-white">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-semibold">Encerrando sessao</h1>
        <p className="text-sm text-gray-300">Aguarde enquanto desconectamos sua conta com seguranca.</p>
      </div>
    </div>
  );
}
