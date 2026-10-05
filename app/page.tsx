"use client";

import React, { useState, useEffect, useRef } from "react";
import ShaderBanner from "@/components/ShaderBanner";
import ShaderAvatar from "@/components/ShaderAvatar";
import { gsap } from "gsap";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  IconSearch,
  IconHeart,
  IconHeartFilled,
  IconExternalLink,
  IconBook,
  IconFiles,
  IconMessages,
  IconFileText,
  IconCheck,
  IconCopy,
  IconDownload,
  IconSparkles,
  IconCpu,
  IconBrain,
  IconMicrophone,
  IconPhoto,
  IconCode,
  IconLanguage,
  IconLayersSubtract,
  IconApi,
  IconTerminal,
  IconChevronRight,
  IconMail,
  IconLock,
  IconLogout,
  IconUser,
  IconX,
} from "@tabler/icons-react";
import { createClient } from "@/lib/supabaseClient";

interface HFModelSearchResult {
  id: string;
  pipeline_tag?: string;
  downloads?: number;
  likes?: number;
}

interface HFModelDetail {
  id: string;
  pipeline_tag?: string;
  downloads?: number;
  likes?: number;
  author?: string;
  siblings?: Array<{ rfilename: string }>;
  tags?: string[];
}

interface HFFileItem {
  path: string;
  size?: number;
  type?: string;
}

function formatFileSize(bytes?: number): string {
  if (bytes === undefined || bytes === null || bytes === 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export default function ModelPage() {
  const [activeSection, setActiveSection] = useState<"models" | "docs">("models");
  const [activeTab, setActiveTab] = useState<"quickrun" | "card" | "files" | "community">("quickrun");
  const [modelId, setModelId] = useState<string>("meta-llama/Llama-3.1-8B-Instruct");
  const [modelDetail, setModelDetail] = useState<HFModelDetail | null>(null);
  const [modelFiles, setModelFiles] = useState<HFFileItem[]>([]);
  const [modelReadme, setModelReadme] = useState<string | null>(null);
  const [authorAvatar, setAuthorAvatar] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  // Nav refs
  const headerRef = useRef<HTMLElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const modelsNavRef = useRef<HTMLButtonElement>(null);
  const docsNavRef = useRef<HTMLButtonElement>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<HFModelSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Supabase Auth state
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [authEmail, setAuthEmail] = useState<string>("");
  const [authPassword, setAuthPassword] = useState<string>("");
  const [authMessage, setAuthMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [avatarImageUrl, setAvatarImageUrl] = useState<string | null>(null);

  // Like state
  const [liked, setLiked] = useState<boolean>(false);
  const [likesCount, setLikesCount] = useState<number>(0);

  // Initialize Supabase Auth listener
  useEffect(() => {
    try {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data: { user } }) => {
        setCurrentUser(user);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setCurrentUser(session?.user ?? null);
      });

      return () => {
        subscription.unsubscribe();
      };
    } catch (e) {
      console.warn("Supabase not yet configured with URL / anon key:", e);
    }
  }, []);


  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail.trim() || !authPassword.trim()) {
      setAuthMessage({ type: "error", text: "Please enter your email and password." });
      return;
    }
    setAuthLoading(true);
    setAuthMessage(null);

    try {
      const supabase = createClient();
      if (authMode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: authEmail.trim(),
          password: authPassword.trim(),
        });
        if (error) throw error;
        if (data.session) {
          setCurrentUser(data.user);
          setShowAuthModal(false);
        } else {
          setAuthMessage({
            type: "success",
            text: "Account created! Please check your email to confirm your account, or sign in if confirmation is disabled.",
          });
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: authEmail.trim(),
          password: authPassword.trim(),
        });
        if (error) throw error;
        setCurrentUser(data.user);
        setShowAuthModal(false);
      }
    } catch (err: any) {
      setAuthMessage({ type: "error", text: err.message || "Authentication failed." });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      setCurrentUser(null);
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

  // Fetch model details and author avatar
  useEffect(() => {
    let isCancelled = false;
    async function fetchModel() {
      try {
        setLoading(true);
        const res = await fetch(`/api/hf?path=${encodeURIComponent(`api/models/${modelId}`)}`);
        if (!res.ok) throw new Error("Failed to load model details");
        const data: HFModelDetail = await res.json();
        if (isCancelled) return;

        setModelDetail(data);
        setLikesCount(data.likes || 0);
        setLiked(false);

        // Fetch author/org avatar using Hugging Face quicksearch API
        const authorName = data.author || modelId.split("/")[0];
        if (authorName) {
          try {
            const qsRes = await fetch(
              `/api/hf?path=${encodeURIComponent(`api/quicksearch?q=${encodeURIComponent(authorName)}`)}`
            );
            if (qsRes.ok) {
              const qsData = await qsRes.json();
              const foundOrg = qsData.orgs?.find(
                (o: { name?: string }) => o.name?.toLowerCase() === authorName.toLowerCase()
              );
              const foundUser = qsData.users?.find(
                (u: { user?: string }) => u.user?.toLowerCase() === authorName.toLowerCase()
              );
              const rawAvatar = foundOrg?.avatarUrl || foundUser?.avatarUrl;
              if (rawAvatar && !isCancelled) {
                const fullAvatar = rawAvatar.startsWith("http")
                  ? rawAvatar
                  : `https://huggingface.co${rawAvatar}`;
                setAuthorAvatar(fullAvatar);
              } else if (!isCancelled) {
                setAuthorAvatar(null);
              }
            }
          } catch {
            if (!isCancelled) setAuthorAvatar(null);
          }
        }

        // Fetch file list with actual sizes from Hugging Face tree API
        try {
          const treeRes = await fetch(`/api/hf?path=${encodeURIComponent(`api/models/${modelId}/tree/main`)}`);
          if (treeRes.ok) {
            const treeData: HFFileItem[] = await treeRes.json();
            if (!isCancelled && Array.isArray(treeData)) {
              setModelFiles(treeData);
            }
          }
        } catch (treeErr) {
          console.error("Error fetching files tree:", treeErr);
        }

        // Fetch full raw README.md model card from Hugging Face (now authenticated!)
        try {
          const readmeRes = await fetch(`/api/hf?path=${encodeURIComponent(`${modelId}/raw/main/README.md`)}`);
          if (readmeRes.ok) {
            const text = await readmeRes.text();
            if (!isCancelled) {
              // Strip YAML frontmatter if present
              let cleaned = text;
              if (text.startsWith("---")) {
                const endYaml = text.indexOf("---", 3);
                if (endYaml !== -1) {
                  cleaned = text.substring(endYaml + 3).trim();
                }
              }
              setModelReadme(cleaned);
            }
          } else if (!isCancelled) {
            setModelReadme(null);
          }
        } catch {
          if (!isCancelled) setModelReadme(null);
        }

        setLoading(false);
        setTimeout(() => {
          if (typeof window !== "undefined" && (window as any).__lenis) {
            (window as any).__lenis.resize();
          }
        }, 100);
      } catch (err) {
        console.error("Error fetching model:", err);
        if (!isCancelled) setLoading(false);
      }
    }
    fetchModel();
    return () => {
      isCancelled = true;
    };
  }, [modelId]);

  // Debounced search using Hugging Face API
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const res = await fetch(
          `/api/hf?path=${encodeURIComponent(`api/models?search=${encodeURIComponent(searchQuery)}&limit=6`)}`
        );
        if (res.ok) {
          const data: HFModelSearchResult[] = await res.json();
          setSearchResults(data);
          setShowDropdown(true);
        }
      } catch (e) {
        console.error("Search fetch error:", e);
      } finally {
        setIsSearching(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectModel = (id: string) => {
    setModelId(id);
    setSearchQuery("");
    setShowDropdown(false);
  };

  // GSAP pill animation — slides the active highlight under the clicked nav item
  const switchSection = (section: "models" | "docs") => {
    const targetRef = section === "models" ? modelsNavRef : docsNavRef;
    if (pillRef.current && targetRef.current) {
      const navContainer = pillRef.current.parentElement;
      if (navContainer) {
        const containerRect = navContainer.getBoundingClientRect();
        const targetRect = targetRef.current.getBoundingClientRect();
        gsap.to(pillRef.current, {
          x: targetRect.left - containerRect.left,
          width: targetRect.width,
          duration: 0.35,
          ease: "power3.out",
        });
      }
    }
    setActiveSection(section);
  };

  // High-performance scroll listener: toggles .nav-dark directly on the DOM
  // Triggers late (past 380px) right as the floating nav pill overlaps the model white card
  useEffect(() => {
    let ticking = false;
    function handleScroll() {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollY = window.scrollY || document.documentElement.scrollTop;
          if (headerRef.current) {
            if (scrollY > 380) {
              headerRef.current.classList.add("nav-dark");
            } else {
              headerRef.current.classList.remove("nav-dark");
            }
          }
          ticking = false;
        });
        ticking = true;
      }
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Init pill position on mount
  useEffect(() => {
    if (pillRef.current && modelsNavRef.current) {
      const navContainer = pillRef.current.parentElement;
      if (navContainer) {
        const containerRect = navContainer.getBoundingClientRect();
        const targetRect = modelsNavRef.current.getBoundingClientRect();
        gsap.set(pillRef.current, {
          x: targetRect.left - containerRect.left,
          width: targetRect.width,
        });
      }
    }
  }, []);

  const toggleLike = () => {
    if (liked) {
      setLiked(false);
      setLikesCount((prev) => Math.max(0, prev - 1));
    } else {
      setLiked(true);
      setLikesCount((prev) => prev + 1);
    }
  };

  const copyCode = () => {
    const code = `from transformers import pipeline\n\npipe = pipeline("${pipelineTag}", model="${modelId}")\noutput = pipe("Hello, world!")`;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const author = modelDetail?.author || modelId.split("/")[0] || "model";
  const modelShortName = modelId.split("/")[1] || modelId;
  const pipelineTag = modelDetail?.pipeline_tag || "text-generation";

  // Task icon helper using Tabler icons
  const getTaskIcon = (tag: string) => {
    if (tag.includes("audio") || tag.includes("speech") || tag.includes("voice")) {
      return <IconMicrophone size={16} stroke={1.5} />;
    }
    if (tag.includes("image") || tag.includes("diffusion") || tag.includes("vision")) {
      return <IconPhoto size={16} stroke={1.5} />;
    }
    if (tag.includes("code")) {
      return <IconCode size={16} stroke={1.5} />;
    }
    if (tag.includes("translation")) {
      return <IconLanguage size={16} stroke={1.5} />;
    }
    if (tag.includes("multimodal")) {
      return <IconLayersSubtract size={16} stroke={1.5} />;
    }
    return <IconBrain size={16} stroke={1.5} />;
  };

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] selection:bg-[var(--accent)] selection:text-white">
      {/* ── Frosted Glass Navbar with GSAP animated sliding pill ── */}
      {/* Zero-jitter CSS class-based transition (.nav-dark) attached to headerRef */}
      <header ref={headerRef} className="sticky top-3 z-50 px-4 md:px-8 max-w-6xl mx-auto w-full">
        <div className="nav-pill-container flex items-center justify-between px-5 py-2.5 rounded-full border border-white/10 bg-white/10 backdrop-blur-md shadow-sm text-white">
          <button onClick={() => switchSection("models")} className="flex items-center gap-2 shrink-0 cursor-pointer">
            <IconSparkles size={18} stroke={1.75} className="text-[var(--accent)]" />
            <span className="nav-text-primary font-medium tracking-tight text-sm text-white/90">
              hf ease
            </span>
          </button>

          <div className="flex items-center gap-4">
            {/* GSAP sliding pill nav */}
            <nav className="hidden sm:flex items-center relative text-xs md:text-sm">
              {/* The sliding background pill — GSAP moves this */}
              <div
                ref={pillRef}
                className="nav-sliding-pill absolute top-0 bottom-0 rounded-full bg-white/15 pointer-events-none transition-colors duration-250"
                style={{ left: 0, width: 0 }}
              />
              <button
                ref={modelsNavRef}
                onClick={() => switchSection("models")}
                className={`relative z-10 px-3 py-1.5 rounded-full font-medium cursor-pointer transition-colors duration-250 ${
                  activeSection === "models"
                    ? "nav-text-primary text-white"
                    : "nav-text-secondary text-white/55 hover:text-white/80"
                }`}
              >
                models
              </button>
              <button
                ref={docsNavRef}
                onClick={() => switchSection("docs")}
                className={`relative z-10 px-3 py-1.5 rounded-full font-medium cursor-pointer transition-colors duration-250 ${
                  activeSection === "docs"
                    ? "nav-text-primary text-white"
                    : "nav-text-secondary text-white/55 hover:text-white/80"
                }`}
              >
                docs
              </button>
            </nav>
          </div>

          {/* Search Bar — CSS class based transition */}
          <div ref={searchRef} className="relative flex-1 max-w-xs md:max-w-sm ml-4">
            <div className="relative w-full">
              <div className="nav-search-icon absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-white/40">
                <IconSearch size={14} stroke={1.5} />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => {
                  if (searchResults.length > 0) setShowDropdown(true);
                }}
                placeholder="search Hugging Face models..."
                className="nav-search-input w-full pl-8 pr-8 py-1.5 rounded-full text-xs bg-white/10 text-white placeholder-white/35 border border-white/10 focus:outline-none focus:border-[var(--accent)] transition-colors duration-250"
              />
              <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-[10px]">
                {isSearching ? (
                  <span className="animate-spin text-xs text-white/50">⟳</span>
                ) : (
                  <kbd className="nav-search-kbd px-1.5 py-0.5 rounded border border-white/10 bg-white/10 text-white/40">
                    /
                  </kbd>
                )}
              </div>
            </div>

            {/* Live Search Dropdown — opaque for readability */}
            {showDropdown && searchResults.length > 0 && (
              <div className="absolute left-0 right-0 mt-2 py-2 bg-[var(--surface)] border border-[var(--glass-bdr)] rounded-2xl shadow-xl z-50 max-h-72 overflow-y-auto">
                <div className="px-3 pb-1.5 text-[10px] uppercase tracking-wider text-[var(--ink-faint)] border-b border-[var(--glass-bdr)]">
                  hugging face models
                </div>
                {searchResults.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => selectModel(item.id)}
                    className="w-full text-left px-3.5 py-2 hover:bg-[var(--paper-subtle)] transition flex items-center justify-between gap-3 text-xs cursor-pointer"
                  >
                    <div className="truncate flex items-center gap-2">
                      <span className="text-[var(--ink-muted)] shrink-0">
                        {getTaskIcon(item.pipeline_tag || "")}
                      </span>
                      <div className="truncate">
                        <div className="font-medium text-[var(--ink)] truncate">
                          {item.id}
                        </div>
                        {item.pipeline_tag && (
                          <div className="text-[10px] text-[var(--ink-faint)]">
                            {item.pipeline_tag}
                          </div>
                        )}
                      </div>
                    </div>
                    {item.downloads !== undefined && (
                      <span className="text-[10px] text-[var(--ink-faint)] shrink-0">
                        ↓ {(item.downloads / 1000).toFixed(0)}k
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {currentUser ? (
            <div className="flex items-center gap-2 ml-3">
              <ShaderAvatar
                email={currentUser.email || "user@example.com"}
                size={28}
                imageUrl={avatarImageUrl}
                onImageChange={(url) => setAvatarImageUrl(url)}
              />
              <span className="hidden md:inline text-xs font-mono opacity-80 max-w-[120px] truncate">
                {currentUser.email?.split("@")[0]}
              </span>
              <button
                onClick={handleSignOut}
                title="Sign out"
                className="nav-signin-btn p-1.5 rounded-full hover:bg-white/20 transition cursor-pointer"
              >
                <IconLogout size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              className="nav-signin-btn hidden sm:inline-flex ml-3 px-4 py-1.5 rounded-full text-xs font-medium bg-white/15 text-white border border-white/10 hover:bg-white/25 transition-all duration-250 whitespace-nowrap cursor-pointer"
            >
              sign in
            </button>
          )}
        </div>
      </header>

      {/* ── Top Shader Banner using @paper-design/shaders-react ── */}
      <ShaderBanner />

      {/* ── MODEL SECTION ── */}
      {activeSection === "models" && (
      <main className="max-w-6xl mx-auto px-4 md:px-8 -mt-16 md:-mt-20 relative z-10">
        <div className="bg-[var(--surface)] border border-[var(--glass-bdr)] rounded-2xl p-6 md:p-8 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              {/* Actual Author / Org Logo or clean direct icon */}
              {authorAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={authorAvatar}
                  alt={author}
                  className="w-12 h-12 object-contain shrink-0 rounded-full"
                  onError={() => setAuthorAvatar(null)}
                />
              ) : (
                <div className="text-[var(--accent)] shrink-0">
                  {React.cloneElement(getTaskIcon(pipelineTag), { size: 36, stroke: 1.25 })}
                </div>
              )}

              <div>
                <div className="flex items-center gap-2 text-xs text-[var(--ink-faint)] mb-1">
                  <span>{author}</span>
                  <span>/</span>
                  <span className="text-[var(--ink-muted)]">{modelShortName}</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-light tracking-tight text-[var(--ink)]">
                  {loading ? (
                    <span className="animate-pulse opacity-50">fetching details...</span>
                  ) : (
                    modelShortName
                  )}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={toggleLike}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full border text-xs md:text-sm font-medium transition cursor-pointer ${
                  liked
                    ? "border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/10"
                    : "border-[var(--glass-bdr)] text-[var(--ink-muted)] hover:border-[var(--ink)] hover:text-[var(--ink)]"
                }`}
              >
                {liked ? (
                  <IconHeartFilled size={15} className="text-[var(--accent)]" />
                ) : (
                  <IconHeart size={15} stroke={1.5} />
                )}
                <span>{likesCount.toLocaleString()}</span>
              </button>

              <a
                href={`https://huggingface.co/${modelId}`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-full text-xs md:text-sm font-medium bg-[var(--ink)] text-[var(--paper)] hover:opacity-90 transition cursor-pointer inline-flex items-center gap-1.5"
              >
                <span>view on hf</span>
                <IconExternalLink size={13} stroke={1.5} />
              </a>
            </div>
          </div>

          {/* ── Strict Task-Only Tags (Clean, uncluttered, no useless licenses) ── */}
          <div className="flex flex-wrap items-center gap-2 mt-6 pt-5 border-t border-[var(--glass-bdr)]">
            <span className="text-xs uppercase tracking-wider text-[var(--ink-faint)] mr-1 flex items-center gap-1">
              <IconCpu size={13} stroke={1.5} />
              tasks:
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              {getTaskIcon(pipelineTag)}
              {pipelineTag}
            </span>
            {modelDetail?.tags
              ?.filter(
                (t) =>
                  !t.startsWith("license:") &&
                  !t.startsWith("arxiv:") &&
                  !t.startsWith("region:") &&
                  t !== pipelineTag &&
                  (t.includes("generation") ||
                    t.includes("classification") ||
                    t.includes("detection") ||
                    t.includes("recognition") ||
                    t.includes("conversational") ||
                    t.includes("translation") ||
                    t.includes("multimodal"))
              )
              .slice(0, 3)
              .map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                >
                  {getTaskIcon(tag)}
                  {tag.replace(/-/g, " ")}
                </span>
              ))}
          </div>
        </div>

        {/* ── Tab Navigation with Tabler Icons ── */}
        <div className="flex border-b border-[var(--glass-bdr)] mt-8 gap-8 px-2 text-sm overflow-x-auto">
          <button
            onClick={() => setActiveTab("quickrun")}
            className={`pb-3 border-b-2 font-medium transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "quickrun"
                ? "border-[var(--ink)] text-[var(--ink)]"
                : "border-transparent text-[var(--ink-faint)] hover:text-[var(--ink)]"
            }`}
          >
            <IconCode size={15} stroke={1.5} />
            quick run
          </button>
          <button
            onClick={() => setActiveTab("card")}
            className={`pb-3 border-b-2 font-medium transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "card"
                ? "border-[var(--ink)] text-[var(--ink)]"
                : "border-transparent text-[var(--ink-faint)] hover:text-[var(--ink)]"
            }`}
          >
            <IconBook size={15} stroke={1.5} />
            model card
          </button>
          <button
            onClick={() => setActiveTab("files")}
            className={`pb-3 border-b-2 font-medium transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "files"
                ? "border-[var(--ink)] text-[var(--ink)]"
                : "border-transparent text-[var(--ink-faint)] hover:text-[var(--ink)]"
            }`}
          >
            <IconFiles size={15} stroke={1.5} />
            files ({modelDetail?.siblings?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab("community")}
            className={`pb-3 border-b-2 font-medium transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "community"
                ? "border-[var(--ink)] text-[var(--ink)]"
                : "border-transparent text-[var(--ink-faint)] hover:text-[var(--ink)]"
            }`}
          >
            <IconMessages size={15} stroke={1.5} />
            community
          </button>
        </div>

        {/* ── Content Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 py-8">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-8">
            {activeTab === "card" && (
              <>
                <section className="bg-[var(--surface)] border border-[var(--glass-bdr)] rounded-2xl p-6 md:p-8 space-y-4">
                  <h2 className="text-xl font-light lowercase tracking-tight">model card</h2>
                  {modelReadme ? (
                    <div className="pt-4 border-t border-[var(--glass-bdr)] select-text text-sm leading-relaxed text-[var(--ink)]">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          h1: ({ children }) => (
                            <h1 className="text-2xl font-semibold tracking-tight text-[var(--ink)] mt-6 mb-3 first:mt-0 border-b border-[var(--glass-bdr)] pb-2">
                              {children}
                            </h1>
                          ),
                          h2: ({ children }) => (
                            <h2 className="text-xl font-medium tracking-tight text-[var(--ink)] mt-6 mb-2.5">
                              {children}
                            </h2>
                          ),
                          h3: ({ children }) => (
                            <h3 className="text-lg font-medium text-[var(--ink)] mt-4 mb-2">
                              {children}
                            </h3>
                          ),
                          p: ({ children }) => (
                            <p className="text-[var(--ink-muted)] mb-3 leading-relaxed text-sm">
                              {children}
                            </p>
                          ),
                          ul: ({ children }) => (
                            <ul className="list-disc list-inside space-y-1 text-[var(--ink-muted)] mb-4 pl-1 text-sm">
                              {children}
                            </ul>
                          ),
                          ol: ({ children }) => (
                            <ol className="list-decimal list-inside space-y-1 text-[var(--ink-muted)] mb-4 pl-1 text-sm">
                              {children}
                            </ol>
                          ),
                          li: ({ children }) => (
                            <li className="leading-relaxed">{children}</li>
                          ),
                          blockquote: ({ children }) => (
                            <blockquote className="border-l-2 border-[var(--accent)] pl-4 italic text-[var(--ink-muted)] my-3">
                              {children}
                            </blockquote>
                          ),
                          code: ({ className, children, ...props }) => {
                            const match = /language-(\w+)/.exec(className || "");
                            const isInline = !match && !String(children).includes("\n");
                            return isInline ? (
                              <code className="bg-[var(--paper-subtle)] text-[var(--ink)] px-1.5 py-0.5 rounded font-mono text-xs border border-[var(--glass-bdr)]" {...props}>
                                {children}
                              </code>
                            ) : (
                              <div className="my-3 bg-[var(--paper-subtle)] border border-[var(--glass-bdr)] rounded-xl p-4 overflow-x-auto">
                                <code className="font-mono text-xs text-[var(--ink)] leading-relaxed" {...props}>
                                  {children}
                                </code>
                              </div>
                            );
                          },
                          table: ({ children }) => (
                            <div className="overflow-x-auto my-4 border border-[var(--glass-bdr)] rounded-xl">
                              <table className="min-w-full divide-y divide-[var(--glass-bdr)] text-left text-xs">
                                {children}
                              </table>
                            </div>
                          ),
                          th: ({ children }) => (
                            <th className="px-3 py-2 bg-[var(--paper-subtle)] font-medium text-[var(--ink)]">
                              {children}
                            </th>
                          ),
                          td: ({ children }) => (
                            <td className="px-3 py-2 border-t border-[var(--glass-bdr)] text-[var(--ink-muted)]">
                              {children}
                            </td>
                          ),
                          a: ({ href, children }) => (
                            <a
                              href={href}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[var(--accent)] hover:underline inline-flex items-center gap-0.5"
                            >
                              {children}
                            </a>
                          ),
                          img: ({ src, alt }) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={src} alt={alt || ""} className="max-w-full rounded-xl my-4" />
                          ),
                          hr: () => <hr className="border-[var(--glass-bdr)] my-6" />,
                        }}
                      >
                        {modelReadme}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-[var(--ink-muted)] text-sm leading-relaxed">
                        Live details fetched from Hugging Face Hub for{" "}
                        <code className="text-xs bg-[var(--paper-subtle)] px-1.5 py-0.5 rounded font-mono">
                          {modelId}
                        </code>
                        . Configured for{" "}
                        <strong className="text-[var(--ink)]">{pipelineTag}</strong>.
                      </p>
                      <p className="text-xs text-[var(--ink-faint)] italic">
                        (This repository requires authentication or gating on Hugging Face to view full weights/text, or does not include a public raw README.)
                      </p>
                    </div>
                  )}
                </section>
              </>
            )}

            {activeTab === "quickrun" && (
              <section className="bg-[var(--surface)] border border-[var(--glass-bdr)] rounded-2xl p-6 md:p-8 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-light lowercase tracking-tight">quick run</h2>
                    <p className="text-xs text-[var(--ink-muted)] mt-1">
                      Ready-to-use Python snippet configured for <span className="text-[var(--accent)] font-mono">{pipelineTag}</span>
                    </p>
                  </div>
                  <button
                    onClick={copyCode}
                    className="flex items-center gap-1.5 text-xs text-[var(--ink)] hover:bg-[var(--paper-subtle)] transition cursor-pointer px-3 py-1.5 rounded-full border border-[var(--glass-bdr)] bg-[var(--surface)] shadow-xs"
                  >
                    {copied ? (
                      <>
                        <IconCheck size={14} className="text-emerald-500" />
                        <span className="font-medium text-emerald-600 dark:text-emerald-400">copied!</span>
                      </>
                    ) : (
                      <>
                        <IconCopy size={14} stroke={1.5} />
                        <span>copy code</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="bg-[var(--paper-subtle)] rounded-xl p-5 font-mono text-xs overflow-x-auto text-[var(--ink)] leading-relaxed border border-[var(--glass-bdr)]">
                  <span className="text-purple-600 dark:text-purple-400">from</span>{" "}
                  transformers <span className="text-purple-600 dark:text-purple-400">import</span> pipeline
                  <br />
                  <br />
                  pipe = pipeline(
                  <br />
                  &nbsp;&nbsp;<span className="text-emerald-600 dark:text-emerald-400">&quot;{pipelineTag}&quot;</span>,
                  <br />
                  &nbsp;&nbsp;model=
                  <span className="text-emerald-600 dark:text-emerald-400">
                    &quot;{modelId}&quot;
                  </span>
                  <br />
                  )
                  <br />
                  output = pipe(<span className="text-emerald-600 dark:text-emerald-400">&quot;Hello, world!&quot;</span>)
                </div>
              </section>
            )}

            {activeTab === "files" && (
              <section className="bg-[var(--surface)] border border-[var(--glass-bdr)] rounded-2xl p-6 space-y-3">
                <h2 className="text-xl font-light lowercase tracking-tight mb-4">
                  repository files ({modelFiles.length || modelDetail?.siblings?.length || 0})
                </h2>
                {modelFiles.length > 0 ? (
                  modelFiles.slice(0, 20).map((file) => (
                    <div
                      key={file.path}
                      className="flex items-center justify-between py-2 border-b border-[var(--glass-bdr)] text-sm"
                    >
                      <span className="font-mono text-xs flex items-center gap-2 truncate pr-4">
                        <IconFileText size={14} className="text-[var(--ink-faint)] shrink-0" />
                        <span className="truncate">{file.path}</span>
                      </span>
                      <span className="font-mono text-xs text-[var(--ink-muted)] shrink-0">
                        {formatFileSize(file.size)}
                      </span>
                    </div>
                  ))
                ) : modelDetail?.siblings && modelDetail.siblings.length > 0 ? (
                  modelDetail.siblings.slice(0, 15).map((file) => (
                    <div
                      key={file.rfilename}
                      className="flex items-center justify-between py-2 border-b border-[var(--glass-bdr)] text-sm"
                    >
                      <span className="font-mono text-xs flex items-center gap-2 truncate pr-4">
                        <IconFileText size={14} className="text-[var(--ink-faint)] shrink-0" />
                        <span className="truncate">{file.rfilename}</span>
                      </span>
                      <span className="font-mono text-xs text-[var(--ink-muted)] shrink-0">
                        —
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-[var(--ink-faint)]">No public files listed.</p>
                )}
              </section>
            )}

            {activeTab === "community" && (
              <section className="bg-[var(--surface)] border border-[var(--glass-bdr)] rounded-2xl p-6 space-y-4">
                <h2 className="text-xl font-light lowercase tracking-tight">discussions</h2>
                <div className="p-4 rounded-xl border border-[var(--glass-bdr)] hover:border-[var(--ink)] transition cursor-pointer">
                  <h3 className="font-medium text-sm">Community hub discussion for {modelShortName}</h3>
                  <p className="text-xs text-[var(--ink-faint)] mt-1">Open discussion thread on Hugging Face</p>
                </div>
              </section>
            )}
          </div>

          {/* Right Sidebar Details */}
          <aside className="space-y-6">
            <div className="bg-[var(--surface)] border border-[var(--glass-bdr)] rounded-2xl p-6 space-y-4 text-xs">
              <h3 className="text-xs font-medium uppercase tracking-wider text-[var(--ink-faint)]">
                hugging face stats
              </h3>
              <div className="flex justify-between py-1 border-b border-[var(--glass-bdr)]">
                <span className="text-[var(--ink-muted)] flex items-center gap-1">
                  <IconDownload size={13} stroke={1.5} /> monthly downloads
                </span>
                <span className="font-medium">
                  {modelDetail?.downloads !== undefined
                    ? modelDetail.downloads.toLocaleString()
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--glass-bdr)]">
                <span className="text-[var(--ink-muted)] flex items-center gap-1">
                  <IconHeart size={13} stroke={1.5} /> likes
                </span>
                <span className="font-medium">{likesCount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--glass-bdr)]">
                <span className="text-[var(--ink-muted)]">author</span>
                <span className="font-medium">{author}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[var(--ink-muted)]">pipeline task</span>
                <span className="font-medium">{pipelineTag}</span>
              </div>
            </div>

            <div className="bg-[var(--surface)] border border-[var(--glass-bdr)] rounded-2xl p-6 space-y-3">
              <h3 className="text-xs font-medium uppercase tracking-wider text-[var(--ink-faint)]">
                primary task
              </h3>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--paper-subtle)] border border-[var(--glass-bdr)] text-xs font-medium">
                {getTaskIcon(pipelineTag)}
                {pipelineTag}
              </div>
            </div>
          </aside>
        </div>
      </main>
      )}

      {/* ── DOCS SECTION — same page, no routing ── */}
      {activeSection === "docs" && (
        <main className="max-w-6xl mx-auto px-4 md:px-8 -mt-16 md:-mt-20 relative z-10 pb-20">
          <div className="bg-[var(--surface)] border border-[var(--glass-bdr)] rounded-2xl p-6 md:p-8 shadow-sm mb-8">
            <p className="text-xs uppercase tracking-widest text-[var(--ink-faint)] mb-2">hf ease</p>
            <h1 className="text-2xl md:text-3xl font-light tracking-tight lowercase">documentation</h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-10">

              <section className="space-y-4">
                <h2 className="text-lg font-light lowercase tracking-tight flex items-center gap-2">
                  <IconBook size={18} stroke={1.5} className="text-[var(--accent)]" />
                  overview
                </h2>
                <p className="text-sm text-[var(--ink-muted)] leading-relaxed">
                  hf ease is a clean, no-clutter interface for Hugging Face Hub. Search any model and instantly see its real stats, full model card, files with sizes, and a ready-to-copy Python snippet.
                </p>
              </section>

              <div className="border-t border-[var(--glass-bdr)]" />

              <section className="space-y-4">
                <h2 className="text-lg font-light lowercase tracking-tight flex items-center gap-2">
                  <IconSearch size={18} stroke={1.5} className="text-[var(--accent)]" />
                  searching models
                </h2>
                <p className="text-sm text-[var(--ink-muted)] leading-relaxed">
                  Type in the search bar. Results are pulled live from Hugging Face as you type with a 280ms debounce. Click any result to load its full card, file tree, and stats.
                </p>
                <div className="bg-[var(--paper-subtle)] border border-[var(--glass-bdr)] rounded-xl p-4 text-xs font-mono text-[var(--ink-muted)]">
                  <span className="text-[var(--ink-faint)]"># example queries</span><br />
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
                  Every model card surfaces a copy-ready Python snippet pre-configured for the model&apos;s pipeline task.
                </p>
                <div className="bg-[var(--paper-subtle)] border border-[var(--glass-bdr)] rounded-xl p-4 text-xs font-mono text-[var(--ink)] leading-relaxed">
                  <span className="text-purple-500">from</span> transformers <span className="text-purple-500">import</span> pipeline<br /><br />
                  pipe = pipeline(<span className="text-emerald-600">&quot;text-generation&quot;</span>, model=<span className="text-emerald-600">&quot;Qwen/Qwen2.5-7B&quot;</span>)<br />
                  output = pipe(<span className="text-emerald-600">&quot;Hello!&quot;</span>)
                </div>
              </section>

              <div className="border-t border-[var(--glass-bdr)]" />

              <section className="space-y-4">
                <h2 className="text-lg font-light lowercase tracking-tight flex items-center gap-2">
                  <IconApi size={18} stroke={1.5} className="text-[var(--accent)]" />
                  data sources
                </h2>
                <p className="text-sm text-[var(--ink-muted)] leading-relaxed">
                  All data fetched live from public Hugging Face endpoints — no caching, no staleness.
                </p>
                <div className="space-y-2">
                  {([
                    ["Model details", "api/models/{id}"],
                    ["Search", "api/models?search=..."],
                    ["File sizes", "api/models/{id}/tree/main"],
                    ["Author avatar", "api/quicksearch?q=..."],
                    ["Model card", "{id}/raw/main/README.md"],
                  ] as [string, string][]).map(([label, url]) => (
                    <div key={label} className="flex items-start gap-3 text-xs">
                      <IconChevronRight size={13} className="text-[var(--accent)] mt-0.5 shrink-0" />
                      <div>
                        <span className="text-[var(--ink)] font-medium">{label}</span>
                        <span className="text-[var(--ink-faint)] font-mono ml-2">huggingface.co/{url}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <aside className="space-y-6">
              <div className="bg-[var(--surface)] border border-[var(--glass-bdr)] rounded-2xl p-6 space-y-4">
                <h3 className="text-xs font-medium uppercase tracking-wider text-[var(--ink-faint)]">on this page</h3>
                <div className="space-y-2">
                  {([["overview", IconBook], ["searching", IconSearch], ["quick run", IconCode], ["data sources", IconApi]] as [string, React.ElementType][]).map(([label, Icon]) => (
                    <div key={label} className="flex items-center gap-2 text-xs text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer transition">
                      <Icon size={13} stroke={1.5} className="text-[var(--ink-faint)]" />
                      {label}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[var(--surface)] border border-[var(--glass-bdr)] rounded-2xl p-6 space-y-4">
                <h3 className="text-xs font-medium uppercase tracking-wider text-[var(--ink-faint)]">stack</h3>
                <div className="space-y-2">
                  {([["Next.js 16", IconTerminal], ["shaders-react", IconBrain], ["tabler icons", IconSparkles], ["Tailwind CSS", IconCode], ["HF API", IconDownload], ["GSAP", IconSparkles]] as [string, React.ElementType][]).map(([label, Icon]) => (
                    <div key={label} className="flex items-center gap-2 text-xs text-[var(--ink-muted)]">
                      <Icon size={13} stroke={1.5} className="text-[var(--ink-faint)]" />
                      {label}
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </main>
      )}

      {/* ── Supabase Sign In Modal (Google & Email Login / Sign Up) ── */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-sm bg-[var(--surface)] border border-[var(--glass-bdr)] rounded-3xl p-6 shadow-2xl">
            <button
              onClick={() => {
                setShowAuthModal(false);
                setAuthMessage(null);
              }}
              className="absolute top-4 right-4 text-[var(--ink-faint)] hover:text-[var(--ink)] cursor-pointer p-1"
            >
              <IconX size={18} />
            </button>

            <div className="text-center mb-5 pt-2">
              <div className="w-10 h-10 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] mx-auto flex items-center justify-center mb-2.5">
                <IconSparkles size={20} />
              </div>
              <h3 className="text-xl font-medium tracking-tight text-[var(--ink)]">
                {authMode === "signin" ? "sign in to hf ease" : "create your account"}
              </h3>
              <p className="text-xs text-[var(--ink-muted)] mt-1">
                Save starred models, track downloads, and copy tokens effortlessly.
              </p>
            </div>


            {/* Email Form */}
            <form onSubmit={handleEmailAuth} className="space-y-3">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--ink-faint)]">
                  <IconMail size={15} />
                </div>
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-[var(--paper-subtle)] text-[var(--ink)] placeholder-[var(--ink-faint)] border border-[var(--glass-bdr)] focus:outline-none focus:border-[var(--accent)] transition"
                />
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--ink-faint)]">
                  <IconLock size={15} />
                </div>
                <input
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-[var(--paper-subtle)] text-[var(--ink)] placeholder-[var(--ink-faint)] border border-[var(--glass-bdr)] focus:outline-none focus:border-[var(--accent)] transition"
                />
              </div>

              {authMessage && (
                <div
                  className={`p-2.5 rounded-xl text-xs leading-relaxed ${
                    authMessage.type === "error"
                      ? "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                      : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  }`}
                >
                  {authMessage.text}
                </div>
              )}

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-[var(--ink)] text-[var(--paper)] text-xs font-medium transition hover:opacity-90 cursor-pointer disabled:opacity-50 mt-1 shadow-sm"
              >
                {authLoading ? (
                  <span>processing...</span>
                ) : authMode === "signin" ? (
                  <span>sign in</span>
                ) : (
                  <span>create account</span>
                )}
              </button>
            </form>

            {/* Mode switch */}
            <div className="mt-4 pt-3 border-t border-[var(--glass-bdr)] text-center">
              {authMode === "signin" ? (
                <p className="text-xs text-[var(--ink-muted)]">
                  Don&apos;t have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("signup");
                      setAuthMessage(null);
                    }}
                    className="text-[var(--accent)] font-medium hover:underline cursor-pointer ml-1"
                  >
                    sign up
                  </button>
                </p>
              ) : (
                <p className="text-xs text-[var(--ink-muted)]">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("signin");
                      setAuthMessage(null);
                    }}
                    className="text-[var(--accent)] font-medium hover:underline cursor-pointer ml-1"
                  >
                    sign in
                  </button>
                </p>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
