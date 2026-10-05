import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";

function getHfToken(): string | null {
  if (process.env.HF_TOKEN) return process.env.HF_TOKEN.trim();

  try {
    const tokenPath = path.join(os.homedir(), ".cache", "huggingface", "token");
    if (fs.existsSync(tokenPath)) {
      return fs.readFileSync(tokenPath, "utf-8").trim();
    }
  } catch (err) {
    console.error("Error reading HF cache token:", err);
  }
  return null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const reqPath = searchParams.get("path");

  if (!reqPath) {
    return NextResponse.json({ error: "Missing path parameter" }, { status: 400 });
  }

  const token = getHfToken();
  const headers: Record<string, string> = {
    "User-Agent": "hf-ease/1.0",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const targetUrl = `https://huggingface.co/${reqPath}`;
    const res = await fetch(targetUrl, {
      headers,
      cache: "no-store",
    });

    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    } else {
      const text = await res.text();
      return new NextResponse(text, {
        status: res.status,
        headers: { "Content-Type": contentType || "text/plain" },
      });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Fetch failed" }, { status: 500 });
  }
}
