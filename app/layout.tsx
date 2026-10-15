import "tailwindcss/index.css";
import Navbar from "./navbar/Navbar";
export const metadata = {
  title: {
    default: "Playbook",
    template: "%s | Playbook",
  },
  description: "A basketball whiteboard for creating and saving plays.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="m-0 bg-white font-[Arial,sans-serif] text-[#444]">
        <Navbar />
        {children}
      </body>
    </html>
  );
}
