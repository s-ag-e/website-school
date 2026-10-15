import SharedPlays from "../../shared/page";
export const metadata = {
  title: "Public play",
};
export default async function Page({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const { id } = await params;
  return <SharedPlays id={id} />;
}
