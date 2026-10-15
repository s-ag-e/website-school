"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import { validBoard, Mini, SavedPlay } from "../court/Court";
export default function SharedPlays({ id }: { id?: string }) {
  const router = useRouter();
  const [plays, setPlays] = useState<SavedPlay[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [votes, setVotes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function load() {
    setMessage("");
    if (!supabase) {
      setMessage("no db");
      setLoading(false);
      return;
    }
    try {
      const session = await supabase.auth.getSession();
      const currentUser = session.data.session?.user || null;
      setUser(currentUser);
      let query = supabase
        .from("shared_plays")
        .select("id, title, board, username, upvotes");
      if (id) query = query.eq("id", id);
      const { data, error } = await query
        .order("upvotes", {
          ascending: false,
        })
        .order("updated_at", {
          ascending: false,
        })
        .limit(100);
      if (error) throw error;
      const publicPlays = (data || []).filter((play) => validBoard(play.board));
      setPlays(publicPlays);
      if (id && !publicPlays.length)
        setMessage("This play is private or no longer available.");
      if (currentUser && publicPlays.length) {
        const result = await supabase
          .from("play_votes")
          .select("play_id")
          .eq("user_id", currentUser.id)
          .in(
            "play_id",
            publicPlays.map((play) => play.id),
          );
        if (result.error) throw result.error;
        setVotes(result.data.map((vote) => vote.play_id));
      } else {
        setVotes([]);
      }
    } catch {
      setMessage("Could not load plays. Please try again.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, [id]);
  async function upvote(play) {
    if (!user) {
      try {
        sessionStorage.setItem(
          "playbook-return",
          id ? "/play/" + id : "/shared",
        );
      } catch {}
      router.push("/login");
      return;
    }
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      let result;
      if (votes.includes(play.id)) {
        result = await supabase
          .from("play_votes")
          .delete()
          .eq("play_id", play.id)
          .eq("user_id", user.id);
      } else {
        result = await supabase.from("play_votes").insert({
          play_id: play.id,
          user_id: user.id,
        });
      }
      if (result.error) throw result.error;
      await load();
    } catch {
      setMessage("Could not update vote. Try again.");
    } finally {
      setBusy(false);
    }
  }
  function usePlay(play) {
    try {
      sessionStorage.removeItem("playbook-return");
      sessionStorage.setItem(
        "playbook-shared",
        JSON.stringify({
          title: play.title,
          board: play.board,
        }),
      );
      router.push(user ? "/dashboard" : "/login");
    } catch {
      setMessage(
        "Your browser could not open this copy. Try a different browser.",
      );
    }
  }
  return (
    <>
      <main
        id="main-content"
        className="shared-page mx-[57px] my-10 max-w-[1200px] max-[1000px]:mx-7 max-[1000px]:my-[35px] max-[540px]:mx-5 max-[540px]:my-7"
      >
        <h1 className=" mb-[22px] text-[32px] font-bold max-[540px]:text-[28px]">
          {id ? plays[0]?.title || "Public play" : "Public Plays"}
        </h1>
        {!id && (
          <p className=" mb-[18px] leading-normal">
            Public plays made by other players and coaches.
          </p>
        )}
        {message && (
          <div
            className="shared-message my-5 border-l-2 border-[#aaa] pl-4"
            role="status"
          >
            <p className=" mb-3 leading-normal">{message}</p>
            <button
              onClick={load}
              disabled={busy}
              className="min-h-[42px] rounded bg-[#444] px-[18px] py-[10px] text-white hover:bg-[#222] [&.upvote]:border [&.upvote]:border-[#aaa] [&.upvote]:bg-[#eee] [&.upvote]:text-sm [&.upvote]:text-[#444] [&.voted]:border-[#444] [&.voted]:bg-[#ddd] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#278cc1] cursor-pointer disabled:cursor-default disabled:opacity-50"
            >
              Try again
            </button>
          </div>
        )}
        {loading ? (
          <p className=" mb-[18px] leading-normal">Loading…</p>
        ) : (
          <>
            {!plays.length && !message && (
              <div className="shared-empty my-6">
                <p className=" mb-3">No public plays yet.</p>
                <Link
                  href="/dashboard"
                  className="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#278cc1] text-[#267eaa]"
                >
                  Create a play
                </Link>
              </div>
            )}
            {plays.map((play) =>
              id ? (
                <div key={play.id}>
                  <p className="play-username mt-[6px] text-[13px] text-[#666]">
                    By @{play.username}
                  </p>
                  <div className="shared-play-layout mt-[30px] grid grid-cols-[minmax(0,1fr)_190px] items-start gap-7 max-[760px]:grid-cols-1 max-[760px]:gap-5">
                    <div className="shared-play-court overflow-hidden rounded-[25px] border-4 border-[#c5c5c5] bg-[#eee]">
                      <Mini board={play.board} />
                    </div>
                    <aside className="shared-play-actions flex flex-col gap-3 border-l border-[#aaa] pl-[22px] max-[760px]:flex-row max-[760px]:flex-wrap max-[760px]:items-center max-[760px]:border-0 max-[760px]:pl-0">
                      <button
                        onClick={() => usePlay(play)}
                        className="min-h-[42px] rounded bg-[#444] px-[18px] py-[10px] text-white hover:bg-[#222] [&.upvote]:border [&.upvote]:border-[#aaa] [&.upvote]:bg-[#eee] [&.upvote]:text-sm [&.upvote]:text-[#444] [&.voted]:border-[#444] [&.voted]:bg-[#ddd] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#278cc1] cursor-pointer disabled:cursor-default disabled:opacity-50"
                      >
                        Use this play
                      </button>
                      <button
                        className={
                          votes.includes(play.id)
                            ? "upvote voted min-h-[42px] rounded bg-[#444] px-[18px] py-[10px] text-white hover:bg-[#222] [&.upvote]:border [&.upvote]:border-[#aaa] [&.upvote]:bg-[#eee] [&.upvote]:text-sm [&.upvote]:text-[#444] [&.voted]:border-[#444] [&.voted]:bg-[#ddd] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#278cc1] cursor-pointer disabled:cursor-default disabled:opacity-50"
                            : "upvote min-h-[42px] rounded bg-[#444] px-[18px] py-[10px] text-white hover:bg-[#222] [&.upvote]:border [&.upvote]:border-[#aaa] [&.upvote]:bg-[#eee] [&.upvote]:text-sm [&.upvote]:text-[#444] [&.voted]:border-[#444] [&.voted]:bg-[#ddd] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#278cc1] cursor-pointer disabled:cursor-default disabled:opacity-50"
                        }
                        aria-label={"Upvote " + play.title}
                        aria-pressed={votes.includes(play.id)}
                        disabled={busy}
                        onClick={() => upvote(play)}
                      >
                        {votes.includes(play.id) ? "Upvoted" : "Upvote"} ·{" "}
                        {play.upvotes}
                      </button>
                      <Link
                        href="/shared"
                        className="text-sm text-[#444] underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#278cc1]"
                      >
                        Back to public plays
                      </Link>
                    </aside>
                  </div>
                </div>
              ) : (
                <article
                  className="shared-play-row flex max-w-[950px] items-center gap-5 border-b border-[#ddd] py-[15px] max-[540px]:flex-wrap max-[540px]:gap-3"
                  key={play.id}
                >
                  <Link
                    className="shared-play-preview block w-[120px] shrink-0 bg-[#eee] max-[540px]:w-[90px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#278cc1] text-[#267eaa]"
                    href={"/play/" + play.id}
                    aria-label={"View " + play.title}
                  >
                    <Mini board={play.board} />
                  </Link>
                  <div className="shared-play-info min-w-0 flex-1 max-[540px]:basis-[calc(100%_-_105px)]">
                    <Link
                      href={"/play/" + play.id}
                      className="[overflow-wrap:anywhere] text-base text-[#444] underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#278cc1]"
                    >
                      {play.title}
                    </Link>
                    <p className="play-username mt-[6px] text-[13px] text-[#666]">
                      @{play.username}
                    </p>
                  </div>
                  <button
                    className={
                      votes.includes(play.id)
                        ? "upvote voted min-h-[42px] rounded bg-[#444] px-[18px] py-[10px] text-white hover:bg-[#222] [&.upvote]:border [&.upvote]:border-[#aaa] [&.upvote]:bg-[#eee] [&.upvote]:text-sm [&.upvote]:text-[#444] [&.voted]:border-[#444] [&.voted]:bg-[#ddd] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#278cc1] cursor-pointer disabled:cursor-default disabled:opacity-50"
                        : "upvote min-h-[42px] rounded bg-[#444] px-[18px] py-[10px] text-white hover:bg-[#222] [&.upvote]:border [&.upvote]:border-[#aaa] [&.upvote]:bg-[#eee] [&.upvote]:text-sm [&.upvote]:text-[#444] [&.voted]:border-[#444] [&.voted]:bg-[#ddd] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#278cc1] cursor-pointer disabled:cursor-default disabled:opacity-50"
                    }
                    aria-label={"Upvote " + play.title}
                    aria-pressed={votes.includes(play.id)}
                    disabled={busy}
                    onClick={() => upvote(play)}
                  >
                    {votes.includes(play.id) ? "Upvoted" : "Upvote"} ·{" "}
                    {play.upvotes}
                  </button>
                  <button
                    onClick={() => usePlay(play)}
                    className="min-h-[42px] rounded bg-[#444] px-[18px] py-[10px] text-white hover:bg-[#222] [&.upvote]:border [&.upvote]:border-[#aaa] [&.upvote]:bg-[#eee] [&.upvote]:text-sm [&.upvote]:text-[#444] [&.voted]:border-[#444] [&.voted]:bg-[#ddd] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#278cc1] cursor-pointer disabled:cursor-default disabled:opacity-50"
                  >
                    Use play
                  </button>
                </article>
              ),
            )}
          </>
        )}
      </main>
    </>
  );
}
