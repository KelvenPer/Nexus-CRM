"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import React, { useState } from "react";

import loginIllustration from "../../../img/login1.png";
import nexusLogo from "../../../img/logo.png";

type TenantInfo = {
  email: string;
  userName: string;
  tenantId: string;
  tenantName: string;
  tenantLogoUrl?: string;
};

type CheckEmailResponse = TenantInfo;

type TokenResponse = {
  access_token: string;
  token_type: string;
  userName: string;
  tenantId: string;
  tenantName: string;
  tenantLogoUrl?: string;
  roles?: string[];
};

const LoginPage: React.FC = () => {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "password">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleEmailSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email) {
      setErrorMessage("Informe um e-mail valido.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/auth/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        throw new Error("E-mail nao encontrado.");
      }

      const data: CheckEmailResponse = await response.json();
      setTenantInfo(data);
      setStep("password");
    } catch (error) {
      console.error(error);
      setErrorMessage("Nao encontramos esse e-mail em nossa base.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!tenantInfo) {
      setErrorMessage("Reinicie o fluxo de login.");
      setStep("email");
      return;
    }
    if (!password) {
      setErrorMessage("Digite sua senha.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/auth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: tenantInfo.email, password }),
      });

      if (!response.ok) {
        throw new Error("Senha invalida.");
      }

      const data: TokenResponse = await response.json();
      if (typeof window !== "undefined") {
        localStorage.setItem("nexus_token", data.access_token);
        localStorage.setItem("nexus_user", JSON.stringify(data));
      }
      router.push("/");
    } catch (error) {
      console.error(error);
      setErrorMessage("Senha incorreta. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToEmail = () => {
    setStep("email");
    setTenantInfo(null);
    setPassword("");
  };

  const renderEmailStep = () => (
    <form onSubmit={handleEmailSubmit} className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Bem-vindo ao Nexus CRM</h2>
        <p className="text-sm text-gray-500 mt-1">Digite seu e-mail profissional para continuar.</p>
      </div>
      <div>
        <label htmlFor="email" className="text-sm font-medium text-gray-700">
          Seu e-mail profissional
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-cyan-500 focus:outline-none"
          placeholder="voce@empresa.com"
          autoFocus
        />
      </div>
      {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-lg bg-cyan-500 px-4 py-3 text-white font-semibold hover:bg-cyan-600 disabled:opacity-50"
      >
        {isLoading ? "Verificando..." : "Avancar"}
      </button>
      <p className="text-xs text-gray-500 text-center">
        Nao tem uma conta?{" "}
        <a href="mailto:contato@nexuscrm.com" className="text-cyan-600 font-medium">
          Fale conosco
        </a>
      </p>
    </form>
  );

  const renderPasswordStep = () => (
    <form onSubmit={handlePasswordSubmit} className="space-y-6">
      <div>
        <p className="text-sm text-gray-500">Logando como</p>
        <h2 className="text-2xl font-semibold text-gray-900">Ola, {tenantInfo?.userName}!</h2>
        <p className="text-sm text-gray-500 mt-1">
          Fazendo login em: <span className="font-medium">{tenantInfo?.tenantName}</span>
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
          {tenantInfo?.tenantLogoUrl ? (
            <Image
              src={tenantInfo.tenantLogoUrl}
              alt="Logomarca do tenant"
              width={48}
              height={48}
              className="h-12 w-12 object-cover"
              unoptimized
            />
          ) : (
            <Image src={nexusLogo} alt="Nexus" className="h-10 w-10 object-contain" />
          )}
        </div>
        <div>
          <p className="text-xs text-gray-500">Conta selecionada</p>
          <p className="text-sm font-medium text-gray-800">{tenantInfo?.email}</p>
        </div>
      </div>

      <div>
        <label htmlFor="password" className="text-sm font-medium text-gray-700">
          Senha
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-lime-500 focus:outline-none"
          placeholder="Digite sua senha"
          autoFocus
        />
      </div>
      {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-lg bg-lime-400 px-4 py-3 text-black font-semibold hover:bg-lime-300 disabled:opacity-50"
      >
        {isLoading ? "Entrando..." : "Entrar"}
      </button>
      <div className="flex items-center justify-between text-xs text-gray-500">
        <button type="button" onClick={handleBackToEmail} className="underline">
          Voltar
        </button>
        <button type="button" className="underline" onClick={() => alert("Fluxo de senha em desenvolvimento.")}>
          Esqueci minha senha
        </button>
      </div>
    </form>
  );

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      <div className="relative hidden lg:flex h-full flex-col bg-[#0E1F2F] text-white">
        <div className="p-10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center text-xl font-bold">
              N
            </div>
            <div>
              <p className="text-sm uppercase tracking-wide text-cyan-300">Nexus CRM</p>
              <p className="text-xs text-gray-300">Conectando dados, impulsionando vendas.</p>
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center px-10">
          <div className="space-y-6">
            <div className="rounded-3xl bg-white/5 p-8 backdrop-blur">
              <Image src={loginIllustration} alt="Nexus login" className="w-full h-auto object-cover" />
            </div>
            <p className="text-sm text-gray-300 leading-relaxed">
              O Nexus CRM e o cerebro que conecta os modulos de Vendas, Marketing e Area de Dados em uma unica
              experiencia. Seguranca multi-tenant e insights personalizados desde o login.
            </p>
          </div>
        </div>
        <div className="p-10 text-xs text-gray-400">
          Conectando Dados. Impulsionando Vendas. Gerando Crescimento.
        </div>
      </div>

      <div className="bg-white flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md space-y-6">
          {step === "email" ? renderEmailStep() : renderPasswordStep()}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

