import Link from "next/link";
import { Landing } from "@/components/Landing";

export default function CyberCityPage() {
  return (
    <>
      <Link className="game-back-link" href="/">← Game Hub</Link>
      <Landing />
    </>
  );
}
