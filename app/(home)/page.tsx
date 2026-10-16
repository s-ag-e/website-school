"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { Pencil, Save, Share2 } from "lucide-react";
export default function Home() {
  const router = useRouter();
  const [opening, setOpening] = useState(false);
  const [message, setMessage] = useState("");
  async function openPage(
    event: React.MouseEvent<HTMLAnchorElement>,
    page: string,
  ) {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)
      return;
    event.preventDefault();
    if (opening) return;
    setOpening(true);
    setMessage("");
    try {
      if (!supabase) {
        router.push("/login?next=" + encodeURIComponent(page));
        return;
      }
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      router.push(
        data.session ? page : "/login?next=" + encodeURIComponent(page),
      );
    } catch {
      setMessage("cant check login.");
    } finally {
      setOpening(false);
    }
  }
  return (
    <main id="main-content" className="bg-white text-[#444]">
      <section className="px-6 pt-16 pb-20 text-center max-[650px]:pt-10 max-[650px]:pb-14">
        <h1 className="text-5xl leading-[1.2] font-bold max-[650px]:text-[36px]">
          Draw plays for
          <br />
          your team.
        </h1>
        <p className="mx-auto mt-5 max-w-[500px] text-lg leading-relaxed text-[#666]">
          Your basketball plays, saved and ready for the next game.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-5">
          <Link
            href="/login?next=%2Fdashboard"
            onClick={(event) => openPage(event, "/dashboard")}
            aria-busy={opening}
            className="inline-flex min-h-[52px] min-w-[164px] items-center justify-center rounded-[4px] bg-[#444] px-5 text-white no-underline hover:bg-[#222] focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            Draw a play
          </Link>
          <Link
            href="/login?next=%2Fshared"
            onClick={(event) => openPage(event, "/shared")}
            aria-busy={opening}
            className="inline-flex min-h-[52px] min-w-[164px] items-center justify-center rounded-[4px] border border-[#aaa] px-5 text-[#444] no-underline hover:bg-[#f3f3f3] focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            View public plays
          </Link>
        </div>
        {message && (
          <p className="mt-4 text-sm text-[#a13a2c]" role="alert">
            {message}
          </p>
        )}
      </section>

      <section
        className="grid grid-cols-3 gap-16 bg-[#f5f5f5] px-14 py-12 max-[750px]:grid-cols-1 max-[750px]:gap-10 max-[650px]:px-6 max-[650px]:py-9"
        aria-label="What you can do"
      >
        <div>
          <h2 className="mb-4 flex items-center gap-3 text-xl font-bold">
            <Pencil size={23} aria-hidden="true" />
            Draw it
          </h2>
          <p className="max-w-[340px] leading-relaxed text-[#666]">
            Add players and draw their movement on the court.
          </p>
        </div>
        <div>
          <h2 className="mb-4 flex items-center gap-3 text-xl font-bold">
            <Save size={23} aria-hidden="true" />
            Keep it
          </h2>
          <p className="max-w-[340px] leading-relaxed text-[#666]">
            Save to your account or download a photo.
          </p>
        </div>
        <div>
          <h2 className="mb-4 flex items-center gap-3 text-xl font-bold">
            <Share2 size={23} aria-hidden="true" />
            Share it
          </h2>
          <p className="max-w-[340px] leading-relaxed text-[#666]">
            Keep plays private or share a public link.
          </p>
        </div>
      </section>

      <section className="grid grid-cols-[1.3fr_1fr] items-center gap-20 px-14 py-16 max-[750px]:grid-cols-1 max-[750px]:gap-9 max-[650px]:px-6 max-[650px]:py-12">
        <div className="max-w-[540px]">
          <h2 className="mb-3 text-xl font-bold">Why I made Playbook</h2>
          <p className="leading-relaxed text-[#666]">
            My coaches needed an easier way to keep our plays. I made this so we
            could save them instead of drawing everything again on paper.
          </p>
        </div>
        <div className="justify-self-end max-[750px]:justify-self-start">
          <p className="mb-3 text-sm text-[#666]">Need a play to start with?</p>
          <Link
            href="/login?next=%2Fshared"
            onClick={(event) => openPage(event, "/shared")}
            className="inline-block py-2 text-[#444] underline underline-offset-4 hover:text-black"
          >
            Browse public plays →
          </Link>
        </div>
      </section>
    </main>
  );
}
