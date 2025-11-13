"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useRef, useState } from "react";

import nexusLogo from "../../../img/logo.png";
import {
  authenticate,
  checkEmail,
  getStoredSession,
  persistSession,
  TenantInfo,
} from "@/lib/auth";

const LoginPage: React.FC = () => {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "password">("email");
  const [email, setEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [password, setPassword] = useState("");
  const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [cardVisible, setCardVisible] = useState(false);
  const emailInputRef = useRef<HTMLInputElement | null>(null);
  const backgroundCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const isEmailValid = useMemo(
    () => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()),
    [email]
  );

  useEffect(() => {
    const session = getStoredSession();
    if (session) {
      router.replace("/dados/estudio-sql");
      return;
    }
    const timeout = setTimeout(() => setCardVisible(true), 150);
    return () => clearTimeout(timeout);
  }, [router]);

  useEffect(() => {
    if (step === "email") {
      emailInputRef.current?.focus();
    }
  }, [step]);

  useEffect(() => {
    const canvas = backgroundCanvasRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    type Shape = {
      points: { x: number; y: number }[];
      velocity: number;
      direction: number;
      alpha: number;
      drift: number;
      seed: number;
    };
    type Particle = { x: number; y: number; vx: number; vy: number };

    let animationFrame: number;
    let shapes: Shape[] = [];
    let particles: Particle[] = [];

    const createShape = (width: number, height: number): Shape => {
      const baseX = Math.random() * width;
      const baseY = Math.random() * height;
      const size = 80 + Math.random() * 140;
      return {
        points: Array.from({ length: 4 }, () => ({
          x: baseX + (Math.random() - 0.5) * size,
          y: baseY + (Math.random() - 0.5) * size,
        })),
        velocity: 0.12 + Math.random() * 0.2,
        direction: Math.random() > 0.5 ? 1 : -1,
        alpha: 0.2 + Math.random() * 0.2,
        drift: 0.1 + Math.random() * 0.25,
        seed: Math.random() * Math.PI * 2,
      };
    };

    const createParticles = (width: number, height: number) => {
      const count = Math.max(40, Math.floor((width + height) / 100));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
      }));
    };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const count = Math.max(10, Math.floor((canvas.width + canvas.height) / 180));
      shapes = Array.from({ length: count }, () => createShape(canvas.width, canvas.height));
      createParticles(canvas.width, canvas.height);
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.lineWidth = 0.8;

      for (let i = 0; i < shapes.length; i += 1) {
        const shape = shapes[i];
        shape.seed += 0.004;

        shape.points.forEach((point, idx) => {
          point.y += shape.velocity * shape.direction;
          point.x += Math.sin(shape.seed + idx) * shape.drift;
        });

        const offTop = shape.direction < 0 && shape.points.every((p) => p.y < -160);
        const offBottom =
          shape.direction > 0 && shape.points.every((p) => p.y > canvas.height + 160);
        if (offTop || offBottom) {
          shapes[i] = createShape(canvas.width, canvas.height);
          continue;
        }

        ctx.beginPath();
        ctx.moveTo(shape.points[0].x, shape.points[0].y);
        for (let j = 1; j < shape.points.length; j += 1) {
          ctx.lineTo(shape.points[j].x, shape.points[j].y);
        }
        ctx.closePath();
        ctx.strokeStyle = `rgba(14, 165, 233, ${shape.alpha})`;
        ctx.stroke();
      }

      particles.forEach((particle) => {
        ctx.fillStyle = "rgba(14, 165, 233, 0.25)";
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      });

      particles.forEach((particle) => {
        particle.x += particle.vx;
        particle.y += particle.vy;

        if (particle.x <= 0 || particle.x >= canvas.width) {
          particle.vx *= -1;
        }
        if (particle.y <= 0 || particle.y >= canvas.height) {
          particle.vy *= -1;
        }

        ctx.fillStyle = "rgba(14, 165, 233, 0.25)";
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      });

      animationFrame = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize);
    draw();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrame);
    };
  }, []);

  const handleEmailSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email || !isEmailValid) {
      setEmailTouched(true);
      setErrorMessage("Informe um e-mail válido.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const data = await checkEmail(email.trim().toLowerCase());
      setTenantInfo(data);
      setStep("password");
      setStatusMessage("Conta localizada. Digite sua senha para prosseguir.");
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error ? error.message : "Não encontramos esse e-mail em nossa base."
      );
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
    setStatusMessage("Validando credenciais...");

    try {
      const session = await authenticate(tenantInfo.email, password);
      persistSession(session);
      setStatusMessage("Tudo certo! Redirecionando para o console.");
      router.push("/dados/estudio-sql");
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error ? error.message : "Senha incorreta. Tente novamente."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToEmail = () => {
    setStep("email");
    setTenantInfo(null);
    setPassword("");
    setStatusMessage(null);
  };

  const handleSsoLogin = (provider: "google" | "microsoft") => {
    alert(`Integração SSO ${provider.toUpperCase()} em desenvolvimento.`);
  };

  const renderEmailStep = () => (
    <form onSubmit={handleEmailSubmit} className="auth-form">
      <div className="auth-header">
        <h2>Bem-vindo ao Nexus CRM</h2>
        <p>Entre para continuar.</p>
      </div>

      <div className="sso-stack">
        <button type="button" onClick={() => handleSsoLogin("google")} className="sso-block">
          <span className="icon">
            <svg viewBox="0 0 46 46" aria-hidden="true">
              <path
                fill="#EA4335"
                d="M23 9c3.2 0 6 1.1 8.2 3.1l6.1-6.1C34.6 2.6 29.7 0.5 23 0.5 14.1 0.5 6.5 5.7 2.7 13l7.4 5.8C11.5 13.6 16.8 9 23 9z"
              />
              <path
                fill="#34A853"
                d="M45.5 23.5c0-1.5-.1-2.7-.4-3.9H23v7.6h12.9c-.6 3.2-2.4 5.9-5.4 7.7l7.8 6c4.6-4.2 7.2-10.5 7.2-17.4z"
              />
              <path
                fill="#4A90E2"
                d="M9.9 28.5a14.3 14.3 0 010-10.9L2.7 11.6C-.9 17.6-.9 28 .7 34l9.2-5.5z"
              />
              <path
                fill="#FBBC05"
                d="M23 45.5c6.3 0 11.6-2 15.5-5.5l-7.8-6c-2.2 1.5-5 2.4-7.7 2.4-6.2 0-11.5-4.2-13.4-9.9l-7 5.5C6.4 40.5 14 45.5 23 45.5z"
              />
            </svg>
          </span>
          Continuar com Google
        </button>
        <button type="button" onClick={() => handleSsoLogin("microsoft")} className="sso-block">
          <span className="icon">
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path fill="#f25022" d="M1 1h8v8H1z" />
              <path fill="#00a4ef" d="M1 11h8v8H1z" />
              <path fill="#7fba00" d="M11 1h8v8h-8z" />
              <path fill="#ffb900" d="M11 11h8v8h-8z" />
            </svg>
          </span>
          Continuar com Microsoft
        </button>
      </div>

      <div className="divider">
        <span />
        <p>OU</p>
        <span />
      </div>

      <div className="label-row">
        <label htmlFor="email">Seu e-mail profissional</label>
        <button
          type="button"
          className="link-button"
          onClick={() => alert("Fluxo de redefinição em desenvolvimento.")}
        >
          Redefinir senha?
        </button>
      </div>

      <div className="input-wrapper">
        <input
          id="email"
          ref={emailInputRef}
          type="email"
          placeholder="voce@empresa.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          onBlur={() => setEmailTouched(true)}
        />
        {emailTouched && (
          <span className={`input-indicator ${isEmailValid ? "success" : "error"}`}>
            {isEmailValid ? "✓" : "!"}
          </span>
        )}
      </div>
      {errorMessage && step === "email" && <p className="login-error">{errorMessage}</p>}
      {statusMessage && step === "email" && <p className="login-status">{statusMessage}</p>}

      <button type="submit" className="primary-action" disabled={isLoading || !isEmailValid}>
        {isLoading ? <span className="spinner" /> : "Avançar"}
      </button>

      <p className="login-help">
        Não tem uma conta?{" "}
        <a className="link" href="mailto:contato@nexuscrm.com">
          Solicitar demonstração
        </a>
      </p>
    </form>
  );

  const renderPasswordStep = () => (
    <form onSubmit={handlePasswordSubmit} className="auth-form">
      <div className="auth-header">
        <h2>Olá, {tenantInfo?.userName ?? "admin"}!</h2>
        <p>
          Digite sua senha para acessar o console do tenant <strong>{tenantInfo?.tenantName}</strong>.
        </p>
      </div>

      <div className="tenant-card">
        <div className="tenant-avatar">
          {tenantInfo?.tenantLogoUrl ? (
            <Image
              src={tenantInfo.tenantLogoUrl}
              alt="Logomarca do tenant"
              width={48}
              height={48}
              unoptimized
            />
          ) : (
            <Image src={nexusLogo} alt="Nexus" width={40} height={40} />
          )}
        </div>
        <div>
          <p>Conta selecionada</p>
          <strong>{tenantInfo?.email}</strong>
        </div>
      </div>

      <div className="input-wrapper">
        <label htmlFor="password">Senha</label>
        <input
          id="password"
          type="password"
          placeholder="Digite sua senha"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoFocus
        />
      </div>

      {errorMessage && step === "password" && <p className="login-error">{errorMessage}</p>}
      {statusMessage && step === "password" && <p className="login-status">{statusMessage}</p>}

      <button type="submit" className="primary-action" disabled={isLoading}>
        {isLoading ? <span className="spinner" /> : "Entrar"}
      </button>

      <div className="login-actions">
        <button type="button" onClick={handleBackToEmail}>
          Escolher outro e-mail
        </button>
        <button type="button" onClick={() => alert("Fluxo de senha em desenvolvimento.")}>
          Esqueci minha senha
        </button>
      </div>
    </form>
  );

  return (
    <div className="login-page">
      <canvas ref={backgroundCanvasRef} className="login-constellation" aria-hidden />
      <div className="login-grid">
        <section className="login-brand-panel">
          <div className="logo-chip">
            <Image src={nexusLogo} alt="Nexus CRM" width={48} height={48} />
          </div>
          <h1>NEXUS CRM</h1>
          <p>
            Conectando <span>Dados.</span>
            <br />
            Impulsionando <span>Vendas.</span>
            <br />
            Gerando <span>Crescimento.</span>
          </p>
        </section>

        <section className={`login-content-panel ${cardVisible ? "enter" : ""}`}>
          {step === "email" ? renderEmailStep() : renderPasswordStep()}
        </section>
      </div>
    </div>
  );
};

export default LoginPage;
