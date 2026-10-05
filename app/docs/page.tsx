"use client";

import React from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  IconSparkles,
  IconSearch,
  IconBook,
  IconCode,
  IconBrain,
  IconDownload,
  IconApi,
  IconTerminal,
  IconChevronRight,
} from "@tabler/icons-react";

const NeuroNoise = dynamic(
  () => import("@paper-design/shaders-react").then((m) => m.NeuroNoise),
  { ssr: false, loading: () => <div className="w-full h-full" /> }
);

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">

      {/* ── Same transparent nav as model page ── */}
      <header className="sticky top-3 z-50 px-4 md:px-8 max-w-6xl mx-auto w-full">
        <div className="flex items-center justify-between px-5 py-2.5 rounded-full border border-white/10 bg-white/10 backdrop-blur-md shadow-sm">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <IconSparkles size={18} stroke={1.75} className="text-[var(--accent)]" />
            <span className="font-medium tracking-tight text-sm text-white/90">hf ease</span>
          </Link>

          <nav className="hidden sm:flex items-center gap-1 text-xs md:text-sm">
            <Link href="/" className="px-3 py-1.5 rounded-full text-white/60 hover:text-white transition">
              models
            </Link>
            <Link href="/docs" className="px-3 py-1.5 rounded-full bg-white/15 text-white font-medium">
              docs
            </Link>
          </nav>

          <button className="hidden sm:inline-flex ml-3 px-4 py-1.5 rounded-full text-xs font-medium bg-white/15 text-white border border-white/10 hover:bg-white/25 transition whitespace-nowrap cursor-pointer">
            sign in
          </button>
        </div>
      </header>

      {/* ── Same shader banner ── */}
      <div className="relative w-full h-[320px] md:h-[360px] overflow-hidden -mt-[72px]">
        <div className="absolute inset-0 w-full h-full">
          <NeuroNoise
            style={{ width: "100%", height: "100%" }}
            speed={0.3}
            colorFront="#ff7a3d"
            colorMid="#7928ca"
            colorBack="#0d0e15"
          />
        </div>
        {/* Docs page title over shader */}
        <div className="absolute inset-0 flex flex-col items-start justify-end max-w-6xl mx-auto px-4 md:px-8 pb-10">
          <p className="text-white/40 text-xs uppercase tracking-widest mb-2">hf ease</p>
          <h1 className="text-3xl md:text-4xl font-light tracking-tight text-white lowercase">
            documentation
          </h1>
        </div>
      </div>

      {/* ── Content ── */}
      <main className="max-w-6xl mx-auto px-4 md:px-8 py-14">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left — main content */}
          <div className="lg:col-span-2 space-y-10">

            <section className="space-y-4">
              <h2 className="text-lg font-light lowercase tracking-tight flex items-center gap-2">
                <IconBook size={18} stroke={1.5} className="text-[var(--accent)]" />
                overview
              </h2>
              <p className="text-sm text-[var(--ink-muted)] leading-relaxed">
                hf ease is a clean, no-clutter interface for Hugging Face Hub. Search any model by name
                and instantly see its real stats, model card, files with sizes, and a ready-to-copy
                Python snippet — without the noise of the official site.
              </p>
            </section>

            <div className="border-t border-[var(--glass-bdr)]" />

            <section className="space-y-4">
              <h2 className="text-lg font-light lowercase tracking-tight flex items-center gap-2">
                <IconSearch size={18} stroke={1.5} className="text-[var(--accent)]" />
                searching models
              </h2>
              <p className="text-sm text-[var(--ink-muted)] leading-relaxed">
                Type in the search bar in the top nav. Results are pulled live from the Hugging Face API
                as you type. Click any result to load that model's full card, file tree, and stats.
              </p>
              <div className="bg-[var(--paper-subtle)] border border-[var(--glass-bdr)] rounded-xl p-4 text-xs font-mono text-[var(--ink-muted)]">
                <span className="text-[var(--ink-faint)]"># example queries</span>
                <br />
                mistral · qwen2.5 · whisper · stable-diffusion · bert
              </div>
            </section>

            <div className="border-t border-[var(--glass-bdr)]" />

            <section className="space-y-4">
              <h2 className="text-lg font-light lowercase tracking-tight flex items-center gap-2">
                <IconCode size={18} stroke={1.5} className="text-[var(--accent)]" />
                quick run snippet
              </h2>
              <p className="text-sm text-[var(--ink-muted)] leading-relaxed">
                Every model card surfaces a copy-ready Python snippet configured for
                the model's pipeline task. Hit the copy button and paste straight into your script.
              </p>
              <div className="bg-[var(--paper-subtle)] border border-[var(--glass-bdr)] rounded-xl p-4 text-xs font-mono text-[var(--ink)] leading-relaxed">
                <span className="text-purple-500">from</span> transformers{" "}
                <span className="text-purple-500">import</span> pipeline
                <br /><br />
                pipe = pipeline(<span className="text-emerald-600">"text-generation"</span>,
                model=<span className="text-emerald-600">"Qwen/Qwen2.5-7B-Instruct"</span>)
                <br />
                output = pipe(<span className="text-emerald-600">"Hello!"</span>)
              </div>
            </section>

            <div className="border-t border-[var(--glass-bdr)]" />

            <section className="space-y-4">
              <h2 className="text-lg font-light lowercase tracking-tight flex items-center gap-2">
                <IconApi size={18} stroke={1.5} className="text-[var(--accent)]" />
                data sources
              </h2>
              <p className="text-sm text-[var(--ink-muted)] leading-relaxed">
                All data is fetched directly from the public Hugging Face API — no caching, no staleness.
              </p>
              <div className="space-y-2">
                {[
                  ["Model details", "huggingface.co/api/models/{id}"],
                  ["Search", "huggingface.co/api/models?search=..."],
                  ["File sizes", "huggingface.co/api/models/{id}/tree/main"],
                  ["Author avatar", "huggingface.co/api/quicksearch?q=..."],
                  ["Model card", "huggingface.co/{id}/raw/main/README.md"],
                ].map(([label, url]) => (
                  <div key={label} className="flex items-start gap-3 text-xs">
                    <IconChevronRight size={13} className="text-[var(--accent)] mt-0.5 shrink-0" />
                    <div>
                      <span className="text-[var(--ink)] font-medium">{label}</span>
                      <span className="text-[var(--ink-faint)] font-mono ml-2">{url}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

          </div>

          {/* Right sidebar */}
          <aside className="space-y-6">

            <div className="bg-[var(--surface)] border border-[var(--glass-bdr)] rounded-2xl p-6 space-y-4">
              <h3 className="text-xs font-medium uppercase tracking-wider text-[var(--ink-faint)]">on this page</h3>
              <div className="space-y-2">
                {[
                  ["overview", IconBook],
                  ["searching models", IconSearch],
                  ["quick run snippet", IconCode],
                  ["data sources", IconApi],
                ].map(([label, Icon]) => (
                  <div key={label as string} className="flex items-center gap-2 text-xs text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer transition">
                    <Icon size={13} stroke={1.5} className="text-[var(--ink-faint)]" />
                    {label as string}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[var(--surface)] border border-[var(--glass-bdr)] rounded-2xl p-6 space-y-4">
              <h3 className="text-xs font-medium uppercase tracking-wider text-[var(--ink-faint)]">stack</h3>
              <div className="space-y-2">
                {[
                  ["Next.js 16", IconTerminal],
                  ["@paper-design/shaders-react", IconBrain],
                  ["@tabler/icons-react", IconSparkles],
                  ["Tailwind CSS", IconCode],
                  ["Hugging Face API", IconDownload],
                ].map(([label, Icon]) => (
                  <div key={label as string} className="flex items-center gap-2 text-xs text-[var(--ink-muted)]">
                    <Icon size={13} stroke={1.5} className="text-[var(--ink-faint)]" />
                    {label as string}
                  </div>
                ))}
              </div>
            </div>

          </aside>
        </div>
      </main>
    </div>
  );
}
