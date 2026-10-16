"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
export default function Navbar() {
  const router = useRouter();
  const path = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (!supabase) return;
    let active = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (active) setUser(data.session?.user || null);
      })
      .catch(() => {});
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setUser(session?.user || null);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);
  async function signOut() {
    setBusy(true);
    setMessage("");
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.replace("/login");
    } catch {
      setMessage("cant sign out.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <header className="flex min-h-[75px] items-center gap-[65px] px-[43px] py-[15px] max-[1000px]:gap-10 max-[1000px]:px-7 max-[650px]:flex-wrap max-[650px]:gap-[10px] max-[650px]:px-5 max-[650px]:py-3">
      <a
        className="fixed top-2 left-2 z-50 -translate-y-24 bg-white px-4 py-3 text-[#222] underline focus:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#278cc1]"
        href="#main-content"
      >
        Skip to content
      </a>
      <Link
        className="text-[22px] text-[#444] no-underline max-[650px]:text-[21px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#278cc1]"
        href="/"
      >
        Playbook
      </Link>
      <nav
        aria-label="Main navigation"
        className="flex flex-wrap items-center gap-x-10 gap-y-0 max-[1000px]:gap-7 max-[760px]:flex-wrap max-[760px]:gap-x-6 max-[760px]:gap-y-[10px] max-[650px]:w-full max-[650px]:gap-x-7"
      >
        <Link
          href="/"
          aria-current={path === "/" ? "page" : undefined}
          className="py-3 text-lg text-[#555] no-underline hover:text-black hover:underline max-[650px]:text-[15px] aria-[current=page]:font-bold aria-[current=page]:underline aria-[current=page]:underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#278cc1]"
        >
          Home
        </Link>
        <Link
          href="/dashboard"
          aria-current={path === "/dashboard" ? "page" : undefined}
          className="py-3 text-lg text-[#555] no-underline hover:text-black hover:underline max-[650px]:text-[15px] aria-[current=page]:font-bold aria-[current=page]:underline aria-[current=page]:underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#278cc1]"
        >
          Dashboard
        </Link>
        <Link
          href="/shared"
          aria-current={
            path === "/shared" || path.startsWith("/play/") ? "page" : undefined
          }
          className="py-3 text-lg text-[#555] no-underline hover:text-black hover:underline max-[650px]:text-[15px] aria-[current=page]:font-bold aria-[current=page]:underline aria-[current=page]:underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#278cc1]"
        >
          Public Plays
        </Link>
        {user ? (
          <button
            onClick={signOut}
            disabled={busy}
            className="py-3 text-lg text-[#555] no-underline hover:text-black hover:underline max-[650px]:text-[15px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#278cc1] cursor-pointer disabled:cursor-default disabled:opacity-50"
          >
            {busy ? "signing out..." : "Sign out"}
          </button>
        ) : (
          <Link
            href="/login"
            aria-current={path === "/login" ? "page" : undefined}
            className="py-3 text-lg text-[#555] no-underline hover:text-black hover:underline max-[650px]:text-[15px] aria-[current=page]:font-bold aria-[current=page]:underline aria-[current=page]:underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#278cc1]"
          >
            Login
          </Link>
        )}
      </nav>
      {message && <p role="status">{message}</p>}
    </header>
  );
}
