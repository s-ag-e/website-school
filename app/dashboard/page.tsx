"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Pencil,
  MoveUpRight,
  Eraser,
  Circle,
  CircleDot,
  Plus,
  Menu,
  X,
  Check,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import {
  blank,
  validBoard,
  CourtLines,
  Marks,
  Board,
  SavedPlay,
} from "../court/Court";
const tools: [string, string, typeof Pencil][] = [
  ["player", "Player", Circle],
  ["ball", "Ball", CircleDot],
  ["draw", "Draw", Pencil],
  ["move", "Arrow", MoveUpRight],
  ["erase", "Erase", Eraser],
];
const copyBoard = (x: Board): Board => JSON.parse(JSON.stringify(x));
const createId = () => crypto.randomUUID();
export default function Dashboard() {
  const router = useRouter();
  const [board, setBoard] = useState(blank);
  const [title, setTitle] = useState("Main Set");
  const [playId, setPlayId] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(false);
  const [plays, setPlays] = useState<SavedPlay[]>([]);
  const [loadingPlays, setLoadingPlays] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const [tool, setTool] = useState("player");
  const [past, setPast] = useState<Board[]>([]);
  const [future, setFuture] = useState<Board[]>([]);
  const [dirty, setDirty] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [modal, setModal] = useState<{
    url: string;
  } | null>(null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [sidebar, setSidebar] = useState(false);
  const svg = useRef<SVGSVGElement>(null);
  const gesture = useRef<{
    kind: string;
    id: string;
    original: Board;
    start?: number[];
    offset?: number[];
  }>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const authId = useRef(null);
  const showMessage = (m) => {
    setNotice(m);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setNotice(""), 5000);
  };
  function update(next: Board) {
    setPast((p) => [...p.slice(-49), copyBoard(board)]);
    setFuture([]);
    setBoard(next);
    setDirty(true);
  }
  async function loadCloud(ownerId) {
    if (!ownerId || !supabase) return;
    setLoadingPlays(true);
    try {
      const { data, error } = await supabase
        .from("plays")
        .select("id, owner_id, title, board, is_public, updated_at")
        .eq("owner_id", ownerId)
        .order("updated_at", {
          ascending: false,
        });
      if (error) {
        showMessage(error.message);
        return;
      }
      setPlays((data || []).filter((play) => validBoard(play.board)));
    } catch {
      showMessage("Could not load your plays. Please try again.");
    } finally {
      setLoadingPlays(false);
    }
  }
  useEffect(() => {
    try {
      if (location.hash.startsWith("#play=")) {
        let p = JSON.parse(decodeURIComponent(location.hash.slice(6)));
        if (!validBoard(p.board) || typeof p.title !== "string") throw Error();
        sessionStorage.setItem("playbook-shared", JSON.stringify(p));
        setBoard(p.board);
        setTitle(p.title.slice(0, 100));
        setDirty(true);
        history.replaceState(null, "", location.pathname);
        showMessage("Public play opened. Save a copy to keep it.");
      }
    } catch {
      showMessage("Could not load stored or shared data.");
    }
    if (!supabase) {
      setAuthReady(true);
      return;
    }
    supabase.auth
      .getSession()
      .then(({ data }) => {
        setUser(data.session?.user || null);
        setAuthReady(true);
        authId.current = data.session?.user?.id || null;
        if (data.session?.user) loadCloud(data.session.user.id);
      })
      .catch(() => {
        setUser(null);
        setAuthReady(true);
      });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      setAuthReady(true);
      if (session?.user) {
        if (authId.current !== session.user.id) {
          setPlayId(null);
          setIsPublic(false);
          authId.current = session.user.id;
        }
        queueMicrotask(() => loadCloud(session.user.id));
      } else if (event === "SIGNED_OUT") {
        authId.current = null;
        setPlays([]);
        setPlayId(null);
        setIsPublic(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (authReady && !user) router.replace("/login");
  }, [authReady, user, router]);
  useEffect(() => {
    if (!authReady || !user) return;
    try {
      const shared = sessionStorage.getItem("playbook-shared");
      const draft = sessionStorage.getItem("playbook-draft-" + user.id);
      const saved = shared || draft;
      if (saved) {
        const play = JSON.parse(saved);
        if (validBoard(play.board) && typeof play.title === "string") {
          setBoard(play.board);
          setTitle(play.title.slice(0, 100));
          setPlayId(shared ? null : play.id || null);
          setIsPublic(shared ? false : play.is_public === true);
          setDirty(true);
          showMessage(
            shared
              ? "Play opened as a private copy."
              : "Your unsaved play was restored.",
          );
        }
      }
      sessionStorage.removeItem("playbook-shared");
    } catch {
      showMessage("Could not restore the last drawing.");
    }
    setDraftReady(true);
  }, [authReady, user?.id]);
  useEffect(() => {
    if (!user || !draftReady) return;
    try {
      const key = "playbook-draft-" + user.id;
      if (dirty)
        sessionStorage.setItem(
          key,
          JSON.stringify({
            id: playId,
            title,
            board,
            is_public: isPublic,
          }),
        );
      else sessionStorage.removeItem(key);
    } catch {}
  }, [board, title, playId, isPublic, dirty, draftReady, user?.id]);
  useEffect(() => {
    const handler = (e) => {
      if (e.target.closest("input,textarea,select")) return;
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        savePlay();
      }
    };
    window.addEventListener("keydown", handler);
    const unload = (e) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", unload);
    return () => {
      window.removeEventListener("keydown", handler);
      window.removeEventListener("beforeunload", unload);
    };
  }, [board, past, future, dirty, title, isPublic, user]);
  useEffect(() => {
    if (!modal) return;
    const previous = document.activeElement;
    const el = document.querySelector<HTMLElement>(".modal");
    const nodes = () =>
      Array.from(
        el.querySelectorAll<HTMLElement>(
          "button:not(:disabled),input,textarea",
        ),
      ).filter((n) => n.getClientRects().length);
    nodes()
      .find((n) => n.tagName === "TEXTAREA")
      ?.focus();
    const key = (e) => {
      if (e.key === "Escape") {
        setModal(null);
        return;
      }
      if (e.key === "Tab") {
        const list = nodes();
        const first = list[0];
        const last = list.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      (previous as HTMLElement)?.focus();
    };
  }, [modal]);
  function undo() {
    if (!past.length) return;
    setFuture((f) => [copyBoard(board), ...f]);
    setBoard(past[past.length - 1]);
    setPast((p) => p.slice(0, -1));
    setDirty(true);
  }
  function redo() {
    if (!future.length) return;
    setPast((p) => [...p, copyBoard(board)]);
    setBoard(future[0]);
    setFuture((f) => f.slice(1));
    setDirty(true);
  }
  function getCourtPosition(event) {
    const svgPoint = svg.current.createSVGPoint();
    svgPoint.x = event.clientX;
    svgPoint.y = event.clientY;
    const position = svgPoint.matrixTransform(
      svg.current.getScreenCTM().inverse(),
    );
    return [
      Math.max(28, Math.min(772, position.x)),
      Math.max(24, Math.min(536, position.y)),
    ];
  }
  function startDrawing(event: React.PointerEvent, id?: string) {
    if (event.button !== 0 || !event.isPrimary || gesture.current) return;
    if (board.objects.length >= 1000 && tool !== "erase" && !id) {
      showMessage("This play is full. Erase something or start a new play.");
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    svg.current.setPointerCapture(event.pointerId);
    const position = getCourtPosition(event);
    if (tool === "erase") {
      if (id)
        update({
          ...board,
          objects: board.objects.filter((o) => o.id !== id),
        });
      return;
    }
    if ((tool === "player" || tool === "ball") && id) {
      const o = board.objects.find((o) => o.id === id);
      if (
        o &&
        ["player", "defender", "ball"].includes(o.type) &&
        (tool !== "ball" || o.type === "ball")
      )
        gesture.current = {
          kind: "drag",
          id,
          start: position,
          original: copyBoard(board),
          offset: [position[0] - o.x, position[1] - o.y],
        };
      return;
    }
    const number =
      Math.max(
        0,
        ...board.objects
          .filter((o) => o.type === tool)
          .map((o) => o.number || 0),
      ) + 1;
    if (["player", "defender", "ball"].includes(tool)) {
      update({
        ...board,
        objects: [
          ...board.objects,
          {
            id: createId(),
            type: tool,
            number: tool === "ball" ? 0 : Math.min(number, 99),
            x: position[0],
            y: position[1],
          },
        ],
      });
      return;
    }
    const object = {
      id: createId(),
      type: tool,
      points: [position],
    };
    gesture.current = {
      kind: "line",
      id: object.id,
      original: copyBoard(board),
    };
    setBoard({
      ...board,
      objects: [...board.objects, object],
    });
  }
  function moveDrawing(e) {
    const drawing = gesture.current;
    if (!drawing) return;
    const position = getCourtPosition(e);
    setBoard((currentBoard) => {
      const objects = currentBoard.objects.map((object) => {
        if (object.id !== drawing.id) return object;
        if (drawing.kind === "drag") {
          return {
            ...object,
            x: Math.max(28, Math.min(772, position[0] - drawing.offset[0])),
            y: Math.max(24, Math.min(536, position[1] - drawing.offset[1])),
          };
        }
        let points;
        if (tool === "draw") {
          if (object.points.length >= 10000) return object;
          points = [...object.points, position];
        } else {
          points = [object.points[0], position];
        }
        return {
          ...object,
          points,
        };
      });
      return {
        ...currentBoard,
        objects,
      };
    });
  }
  function finishDrawing() {
    const drawing = gesture.current;
    if (!drawing) return;
    gesture.current = null;
    if (drawing.kind === "line") {
      const o = board.objects.find((o) => o.id === drawing.id);
      if (
        !o ||
        o.points.length < 2 ||
        !o.points.some(
          (point) =>
            Math.hypot(point[0] - o.points[0][0], point[1] - o.points[0][1]) >=
            2,
        )
      ) {
        setBoard(drawing.original);
        return;
      }
    }
    if (drawing.kind === "drag") {
      const before = drawing.original.objects.find(
        (object) => object.id === drawing.id,
      );
      const after = board.objects.find((object) => object.id === drawing.id);
      if (before && after && before.x === after.x && before.y === after.y)
        return;
    }
    setPast((p) => [...p.slice(-49), drawing.original]);
    setFuture([]);
    setDirty(true);
  }
  function openPlay(play) {
    if (dirty && !confirm("Discard unsaved changes and open this play?"))
      return;
    setBoard(copyBoard(play.board));
    setTitle(play.title);
    setIsPublic(Boolean(play.is_public && play.owner_id === user?.id));
    setPlayId(
      user && play.owner_id && play.owner_id !== user.id ? null : play.id,
    );
    setPast([]);
    setFuture([]);
    setDirty(false);
    setSidebar(false);
  }
  function newPlay() {
    if (dirty && !confirm("Discard unsaved changes and start a new play?"))
      return;
    setBoard(blank());
    setTitle("Untitled play");
    setIsPublic(false);
    setPlayId(null);
    setPast([]);
    setFuture([]);
    setDirty(true);
  }
  async function savePlay(makePublic = isPublic) {
    if (busy) return;
    if (!title.trim()) {
      showMessage("Give your play a name first.");
      return;
    }
    if (!user) {
      router.push("/login");
      return;
    }
    if (!validBoard(board)) {
      showMessage("This drawing could not be saved. Please start a new play.");
      return;
    }
    setBusy(true);
    const play = {
      id: playId || createId(),
      owner_id: user.id,
      title: title.trim(),
      board: copyBoard(board),
      is_public: makePublic === true,
      updated_at: new Date().toISOString(),
    };
    try {
      const { error } = await supabase.from("plays").upsert(play);
      if (error) {
        showMessage(error.message);
        return;
      }
      setPlayId(play.id);
      setIsPublic(play.is_public);
      setDirty(false);
      await loadCloud(user.id);
      showMessage("Saved.");
      return play.id;
    } catch {
      showMessage("Could not save your play. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  function download(data, name, type) {
    const url = URL.createObjectURL(
      new Blob([data], {
        type,
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function exportPNG() {
    const courtSvg = svg.current.cloneNode(true) as SVGSVGElement;
    courtSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    courtSvg.setAttribute("width", "1600");
    courtSvg.setAttribute("height", "1120");
    courtSvg.style.color = "#b5b5b5";
    courtSvg.style.background = "#f0f0f0";
    const blob = new Blob([new XMLSerializer().serializeToString(courtSvg)], {
      type: "image/svg+xml",
    });
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      const c = document.createElement("canvas");
      c.width = 1600;
      c.height = 1220;
      const ctx = c.getContext("2d");
      ctx.fillStyle = "#f0f0f0";
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.fillStyle = "#203a3e";
      let fontSize = 36;
      ctx.font = "bold " + fontSize + "px Arial";
      while (ctx.measureText(title).width > 1488 && fontSize > 14) {
        fontSize -= 2;
        ctx.font = "bold " + fontSize + "px Arial";
      }
      ctx.fillText(title, 56, 60, 1488);
      ctx.drawImage(image, 0, 100, 1600, 1120);
      URL.revokeObjectURL(url);
      c.toBlob((b) => {
        if (b) {
          download(b, "playbook-photo.png", "image/png");
          showMessage("Photo saved.");
        } else showMessage("Could not save the photo. Please try again.");
      });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      showMessage("Could not save the photo. Please try again.");
    };
    image.src = url;
  }
  async function share() {
    if (!isPublic) {
      showMessage("Choose Public and save your play before sharing.");
      return;
    }
    const id = await savePlay();
    if (!id) return;
    const url = location.origin + "/play/" + id;
    try {
      await navigator.clipboard.writeText(url);
      showMessage("Link copied. Anyone can open this public play.");
    } catch {
      setModal({
        url,
      });
    }
  }
  if (!authReady || !user)
    return (
      <main id="main-content" className="auth-loading p-10">
        Loading…
      </main>
    );
  return (
    <div className="app play-editor min-h-[calc(100dvh-75px)] bg-[#f7f7f7]">
      <main
        id="main-content"
        className="workspace grid min-h-[calc(100dvh-75px)] grid-cols-[206px_minmax(0,1fr)_218px] max-[1000px]:grid-cols-[175px_minmax(0,1fr)_180px] max-[760px]:relative max-[760px]:grid-cols-[minmax(0,1fr)_170px] max-[540px]:flex max-[540px]:flex-col"
      >
        <aside
          id="saved-plays"
          className={
            "play-sidebar flex flex-col border-r border-[#888] bg-white px-2 py-[21px] max-[760px]:hidden max-[760px]:[&.mobile-open]:absolute max-[760px]:[&.mobile-open]:inset-y-0 max-[760px]:[&.mobile-open]:left-0 max-[760px]:[&.mobile-open]:z-10 max-[760px]:[&.mobile-open]:flex max-[760px]:[&.mobile-open]:w-[210px] " +
            (sidebar ? "mobile-open" : "")
          }
        >
          <div className="sidebar-heading flex items-center justify-between">
            <h2 className=" text-base font-bold text-[#737373]">My Plays</h2>
            <button
              className="icon-button inline-flex min-h-10 min-w-10 items-center justify-center border-0 bg-transparent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#278cc1] cursor-pointer disabled:cursor-default disabled:opacity-50"
              aria-label="New play"
              onClick={newPlay}
            >
              <Plus size={18} />
            </button>
          </div>
          <div className="editor-play-list flex flex-col">
            {plays.map((p) => (
              <button
                className={
                  "play-row min-h-8 w-full truncate rounded-[5px] bg-transparent px-[18px] py-[7px] text-left text-sm font-bold hover:bg-[#ededed] [&.selected]:bg-[#ededed]  focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#278cc1] cursor-pointer disabled:cursor-default disabled:opacity-50" +
                  (playId === p.id
                    ? "selected focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#278cc1] cursor-pointer disabled:cursor-default disabled:opacity-50"
                    : "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#278cc1] cursor-pointer disabled:cursor-default disabled:opacity-50")
                }
                key={p.id}
                aria-current={playId === p.id ? "true" : undefined}
                title={p.title}
                onClick={() => openPlay(p)}
              >
                {p.title}
              </button>
            ))}
            {loadingPlays ? (
              <p
                className="editor-empty px-[18px] py-[13px] text-xs leading-relaxed text-[#777]"
                role="status"
              >
                Loading plays…
              </p>
            ) : (
              !plays.length && (
                <p className="editor-empty px-[18px] py-[13px] text-xs leading-relaxed text-[#777]">
                  No plays yet.
                </p>
              )
            )}
          </div>
          <button
            className="new-play mx-2 my-[18px] flex min-h-10 items-center justify-center gap-[7px] border border-[#ddd] bg-white p-[9px] text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#278cc1] cursor-pointer disabled:cursor-default disabled:opacity-50"
            onClick={newPlay}
          >
            <Plus size={16} />
            New play
          </button>
        </aside>
        <section className="board-section min-w-0 px-[27px] pt-[58px] pb-5 max-[1000px]:px-5 max-[1000px]:pt-10 max-[760px]:px-4 max-[760px]:py-6 max-[540px]:px-[14px] max-[540px]:pt-[22px] max-[540px]:pb-2">
          <div className="editor-mobile-bar hidden max-[760px]:-mt-[18px] max-[760px]:mb-[14px] max-[760px]:flex max-[760px]:items-center max-[760px]:gap-[6px] max-[760px]:text-xs max-[540px]:-mt-3 max-[540px]:mb-[10px]">
            <button
              className="icon-button inline-flex min-h-10 min-w-10 items-center justify-center border-0 bg-transparent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#278cc1] cursor-pointer disabled:cursor-default disabled:opacity-50"
              aria-label="Toggle playbooks"
              aria-expanded={sidebar}
              aria-controls="saved-plays"
              onClick={() => setSidebar(!sidebar)}
            >
              <Menu size={20} />
            </button>
            <span>My Plays</span>
          </div>
          <div className="court-wrap overflow-hidden rounded-[27px] border-4 border-[#c5c5c5] bg-[#f0f0f0] max-[540px]:rounded-[22px] max-[540px]:border-[3px]">
            <svg
              ref={svg}
              className={
                "court block h-[calc(100dvh-210px)] max-h-[620px] w-full touch-none select-none text-[#b5b5b5] [&:not(.tool-player)]:cursor-crosshair max-[540px]:aspect-[800/560] max-[540px]:h-auto max-[540px]:max-h-none tool-" +
                tool
              }
              viewBox="0 0 800 560"
              aria-label="Basketball court drawing canvas. Select a tool, then draw or place players on the court."
              onPointerDown={(e) => startDrawing(e)}
              onPointerMove={moveDrawing}
              onPointerUp={finishDrawing}
              onPointerCancel={finishDrawing}
            >
              <CourtLines full={board.court === "full"} />
              <Marks objects={board.objects} onDown={startDrawing} />
            </svg>
          </div>
        </section>
        <aside className="tool-sidebar min-h-[438px] self-start border-l border-[#888] bg-white px-[17px] py-7 max-[1000px]:px-3 max-[540px]:min-h-0 max-[540px]:w-full max-[540px]:border-t max-[540px]:border-l-0 max-[540px]:border-[#999] max-[540px]:px-4 max-[540px]:py-5">
          <label
            className="play-name-label mb-2 block text-xs"
            htmlFor="play-name"
          >
            Play name
          </label>
          <input
            id="play-name"
            className="play-name-input min-h-10 w-full rounded-[3px] border border-[#aaa] bg-white px-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#278cc1]"
            maxLength={100}
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              setDirty(true);
            }}
          />
          <button
            className="board-save mt-3 mb-6 min-h-10 w-full rounded bg-[#2c97ce] text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#278cc1] cursor-pointer disabled:cursor-default disabled:opacity-50"
            onClick={() => savePlay()}
            disabled={busy}
          >
            {busy ? "Saving…" : "Save"}
          </button>
          <h2 className=" mb-[13px] text-base font-bold text-[#737373]">
            Drawing Actions
          </h2>
          <div className="tools grid grid-cols-2 gap-[11px] max-[540px]:gap-[10px]">
            {tools.map(([id, name, Icon]) => (
              <button
                className={
                  "tool flex flex-col items-center justify-center gap-[5px] rounded-[7px] border-2 text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#278cc1] cursor-pointer " +
                  (tool === id
                    ? "border-[#2c97ce] bg-[#dceef7] text-[#1c658b] "
                    : "border-transparent bg-[#dedede] text-[#545454] hover:bg-[#d0d0d0] ") +
                  (id === "erase" ? "col-span-2 h-12" : "h-[65px]")
                }
                key={id}
                aria-pressed={tool === id}
                onClick={() => setTool(id)}
              >
                <Icon
                  size={21}
                  className={id === "ball" ? "text-[#d66b2e]" : ""}
                />
                <span>{name}</span>
              </button>
            ))}
          </div>
          <label
            className="visibility-label mt-6 mb-2 block text-xs"
            htmlFor="visibility"
          >
            Visibility
          </label>
          <select
            id="visibility"
            className="visibility-select min-h-10 w-full rounded-[3px] border border-[#aaa] bg-white px-2 text-[13px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#278cc1]"
            value={isPublic ? "public" : "private"}
            onChange={(event) => {
              setIsPublic(event.target.value === "public");
              setDirty(true);
            }}
          >
            <option value="private">Private</option>
            <option value="public">Public</option>
          </select>
          <div className="simple-board-actions mt-[18px] flex flex-col gap-[10px] border-t border-[#ddd] pt-[18px]">
            <button
              onClick={exportPNG}
              className="min-h-10 rounded border border-[#aaa] bg-[#eee] p-2 text-[13px] hover:bg-[#ddd] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#278cc1] cursor-pointer disabled:cursor-default disabled:opacity-50"
            >
              Save photo
            </button>
            <button
              onClick={share}
              disabled={!isPublic || busy}
              className="min-h-10 rounded border border-[#aaa] bg-[#eee] p-2 text-[13px] hover:bg-[#ddd] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#278cc1] cursor-pointer disabled:cursor-default disabled:opacity-50"
            >
              Copy public link
            </button>
          </div>
          <div className="simple-edit-actions mt-5 flex gap-[10px]">
            <button
              onClick={undo}
              disabled={!past.length}
              className="min-h-9 flex-1 border border-[#ccc] bg-white text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#278cc1] cursor-pointer disabled:cursor-default disabled:opacity-50"
            >
              Undo
            </button>
            <button
              onClick={() => {
                if (confirm("Clear the court?"))
                  update({
                    ...board,
                    objects: [],
                  });
              }}
              className="min-h-9 flex-1 border border-[#ccc] bg-white text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#278cc1] cursor-pointer disabled:cursor-default disabled:opacity-50"
            >
              Clear
            </button>
          </div>
        </aside>
      </main>
      {notice && (
        <div
          className="toast fixed bottom-5 left-1/2 z-20 flex max-w-[90vw] -translate-x-1/2 items-center gap-[10px] bg-[#1c3443] px-[18px] py-[14px] text-[13px] text-white max-[540px]:w-[90%]"
          role="status"
        >
          <Check size={18} />
          {notice}
          <button
            aria-label="Dismiss message"
            onClick={() => setNotice("")}
            className="bg-transparent text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#278cc1] cursor-pointer disabled:cursor-default disabled:opacity-50"
          >
            <X size={16} />
          </button>
        </div>
      )}
      {modal && (
        <div
          className="modal-backdrop fixed inset-0 z-30 grid place-items-center bg-black/40 p-5"
          onClick={() => setModal(null)}
        >
          <section
            className="modal relative w-full max-w-[420px] bg-white p-[30px]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close absolute top-[5px] right-2 bg-transparent text-[26px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#278cc1] cursor-pointer disabled:cursor-default disabled:opacity-50"
              aria-label="Close dialog"
              onClick={() => setModal(null)}
            >
              ×
            </button>
            <h2 id="modal-title" className=" mb-[15px] text-xl font-bold">
              Share play
            </h2>
            <p className=" mb-[15px] leading-normal">
              Copy this link to share a copy of your play.
            </p>
            <textarea
              readOnly
              value={modal.url}
              onFocus={(e) => e.target.select()}
              className="min-h-[120px] w-full border border-[#aaa] p-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#278cc1]"
            />
          </section>
        </div>
      )}
    </div>
  );
}
