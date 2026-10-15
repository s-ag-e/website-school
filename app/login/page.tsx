"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
export default function Login() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [nextPage, setNextPage] = useState("");

  useEffect(() => {
    const page = new URLSearchParams(window.location.search).get("next");
    if (page === "/dashboard" || page === "/shared") setNextPage(page);
  }, []);

  async function login(event) {
    event.preventDefault();
    setMessage("");
    if (!supabase) {
      setMessage("no db in .env.local");
      return;
    }
    const form = new FormData(event.target);
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: String(form.get("email")).trim(),
        password: String(form.get("password")),
      });
      if (error) {
        setMessage(error.message);
        return;
      }
      let destination = nextPage || "/dashboard";
      try {
        const saved = sessionStorage.getItem("playbook-return");
        sessionStorage.removeItem("playbook-return");
        if (
          !nextPage &&
          (saved === "/shared" || /^\/play\/[a-f0-9-]+$/.test(saved || ""))
        )
          destination = saved;
      } catch {}
      router.push(destination);
    } catch {
      setMessage("can not connect.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main
      id="main-content"
      className="login-page mx-auto mt-[55px] mb-[70px] w-[calc(100%_-_40px)] max-w-[420px] [&_small]:text-[13px] [&_small]:leading-normal [&_small]:text-[#666] max-[650px]:mt-[35px]"
    >
      <h1 className=" mb-4 text-[32px] font-bold">Login</h1>
      <form onSubmit={login} className=" mb-[22px] flex flex-col gap-[10px]">
        <label htmlFor="email" className=" mt-2">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="Email address"
          className="min-h-[45px] w-full rounded-[3px] border border-[#aaa] bg-white p-3 text-[15px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#278cc1]"
        />
        <label htmlFor="password" className=" mt-2">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="Password"
          className="min-h-[45px] w-full rounded-[3px] border border-[#aaa] bg-white p-3 text-[15px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#278cc1]"
        />
        <button
          disabled={busy}
          className="mt-[13px] min-w-[110px] self-start rounded bg-[#444] px-[22px] py-3 text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#278cc1] cursor-pointer disabled:cursor-default disabled:opacity-50"
        >
          {busy ? "Please wait…" : "Login"}
        </button>
        {message && (
          <p
            className="login-message mt-[6px] bg-[#eee] p-3 text-sm leading-normal"
            role="status"
          >
            {message}
          </p>
        )}
      </form>
      <p className=" mb-[25px] text-base leading-normal">
        No account?{" "}
        <Link
          href={
            nextPage
              ? "/register?next=" + encodeURIComponent(nextPage)
              : "/register"
          }
          className="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#278cc1] text-[#267eaa]"
        >
          Register
        </Link>
      </p>
    </main>
  );
}
