"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
export default function Register() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [nextPage, setNextPage] = useState("");
  useEffect(() => {
    const page = new URLSearchParams(window.location.search).get("next");
    if (page === "/dashboard" || page === "/shared") setNextPage(page);
  }, []);
  async function register(event) {
    event.preventDefault();
    setMessage("");
    if (!supabase) {
      setMessage("cant connect to database.");
      return;
    }
    const formElement = event.target;
    const form = new FormData(formElement);
    const username = String(form.get("username") || "")
      .trim()
      .toLowerCase();
    if (!/^[a-z0-9_]{3,24}$/.test(username)) {
      setMessage(
        "username needs 3-24 letters, numbers or underscores.",
      );
      return;
    }
    setBusy(true);
    try {
      const check = await supabase
        .from("usernames")
        .select("username")
        .eq("username", username)
        .maybeSingle();
      if (check.error) {
        setMessage("cant check username.");
        return;
      }
      if (check.data) {
        setMessage("username taken.");
        return;
      }
      const { data, error } = await supabase.auth.signUp({
        email: String(form.get("email")).trim(),
        password: String(form.get("password")),
        options: {
          data: {
            username,
          },
        },
      });
      if (error) {
        setMessage(
          error.code === "user_already_exists"
            ? "email already in use."
            : error.code === "weak_password"
              ? "try a stronger password."
              : error.code === "over_email_send_rate_limit"
                ? "wait a bit before trying again."
                : "cant create account.",
        );
        return;
      }
      if (data.session) router.push(nextPage || "/dashboard");
      else {
        setMessage("check your email to confirm your account.");
        formElement.reset();
      }
    } catch {
      setMessage("cant connect.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main
      id="main-content"
      className="mx-auto mt-[55px] mb-[70px] w-[calc(100%_-_40px)] max-w-[420px] max-[650px]:mt-[35px]"
    >
      <h1 className="mb-4 text-[32px] font-bold">Register</h1>
      <p className="mb-[25px] text-base leading-normal">
        Create an account to save your plays.
      </p>
      <form onSubmit={register} className="mb-[22px] flex flex-col gap-[10px]">
        <label htmlFor="username" className="mt-2">
          Username
        </label>
        <input
          id="username"
          name="username"
          required
          minLength={3}
          maxLength={24}
          pattern="[A-Za-z0-9_]{3,24}"
          title="3 to 24 letters, numbers or underscores"
          autoComplete="nickname"
          placeholder="Choose a username"
          className="min-h-[45px] w-full rounded-[3px] border border-[#aaa] bg-white p-3 text-[15px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#278cc1]"
        />
        <small className="text-[13px] leading-normal text-[#666]">
          3–24 letters, numbers or underscores.
        </small>
        <label htmlFor="email" className="mt-2">
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
        <label htmlFor="password" className="mt-2">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="At least 8 characters"
          className="min-h-[45px] w-full rounded-[3px] border border-[#aaa] bg-white p-3 text-[15px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#278cc1]"
        />
        <button
          disabled={busy}
          className="mt-[13px] min-w-[110px] self-start rounded bg-[#444] px-[22px] py-3 text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#278cc1] cursor-pointer disabled:cursor-default disabled:opacity-50"
        >
          {busy ? "creating account..." : "Register"}
        </button>
        {message && (
          <p
            className="mt-[6px] bg-[#eee] p-3 text-sm leading-normal"
            role="status"
          >
            {message}
          </p>
        )}
      </form>
      <p className="mb-[25px] text-base leading-normal">
        Have an account?{" "}
        <Link
          href={
            nextPage ? "/login?next=" + encodeURIComponent(nextPage) : "/login"
          }
          className="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#278cc1] text-[#267eaa]"
        >
          Login
        </Link>
      </p>
    </main>
  );
}
