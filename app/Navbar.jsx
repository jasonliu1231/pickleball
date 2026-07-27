"use client";

import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="nav" aria-label="主要選單">
      <a href="/" className={pathname === "/" ? "active" : ""}>立即預約</a>
      <a href="/notice" className={pathname === "/notice" ? "active" : ""}>公告</a>
      <a href="/knowledge" className={pathname === "/knowledge" ? "active" : ""}>小知識</a>
      <a href="/faq" className={pathname === "/faq" ? "active" : ""}>常見問題</a>
      <a href="/member" id="navMemberTab" className={pathname === "/member" ? "active" : ""}>個人中心</a>
    </nav>
  );
}
