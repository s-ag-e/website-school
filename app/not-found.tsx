import Link from "next/link";
export default function NotFound() {
  return (
    <main
      id="main-content"
      className="mx-[57px] my-10 max-w-[1200px] max-[1000px]:mx-7 max-[1000px]:my-[35px] max-[540px]:mx-5 max-[540px]:my-7"
    >
      <h1 className="mb-[22px] text-[32px] font-bold max-[540px]:text-[28px]">
        404 - Page not found
      </h1>
      <p className="mb-[18px] leading-normal">
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
