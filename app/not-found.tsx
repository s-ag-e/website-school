import Link from "next/link";
export default function NotFound() {
  return (
    <main
      id="main-content"
      className="shared-page mx-[57px] my-10 max-w-[1200px] [&_button]:min-h-[42px] [&_button]:rounded [&_button]:bg-[#444] [&_button]:px-[18px] [&_button]:py-[10px] [&_button]:text-white [&_button]:hover:bg-[#222] [&_button.upvote]:border [&_button.upvote]:border-[#aaa] [&_button.upvote]:bg-[#eee] [&_button.upvote]:text-sm [&_button.upvote]:text-[#444] [&_button.voted]:border-[#444] [&_button.voted]:bg-[#ddd] max-[1000px]:mx-7 max-[1000px]:my-[35px] max-[540px]:mx-5 max-[540px]:my-7"
    >
      <h1 className=" mb-[22px] text-[32px] font-bold max-[540px]:text-[28px]">
        404 - Page not found
      </h1>
      <p className=" mb-[18px] leading-normal">
        This page does not exist or has moved.
      </p>
      <Link
        href="/"
        className="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#278cc1] text-[#267eaa]"
      >
        Back to home
      </Link>
    </main>
  );
}
