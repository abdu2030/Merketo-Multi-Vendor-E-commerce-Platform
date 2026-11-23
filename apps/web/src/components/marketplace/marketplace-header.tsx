"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";
import { ArrowRight } from "@/components/imported/design-icons";
import { useAuth } from "@/components/auth/auth-provider";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export function MarketplaceHeader({
  active,
}: {
  active?: "home" | "products" | "cart" | "checkout";
}) {
  const { user, isLoading } = useAuth();

  return (
    <header className="sticky top-0 z-30 border-b border-white/60 bg-white/85 shadow-sm backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2 sm:min-h-16 sm:px-6 lg:px-8">
        <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-start sm:gap-5">
          <Link className="flex items-center gap-2.5" href="/">
            <BrandLogo />
          </Link>
          {!isLoading && user && (
            <Link
              className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-bold text-slate-900 transition hover:bg-slate-100 focus-visible:outline-2"
              href="/dashboard"
            >
              <ArrowRight className="h-4 w-4 rotate-180" />
              Back to workspace
            </Link>
          )}
        </div>
        <nav aria-label="Marketplace navigation" className="flex w-full flex-wrap items-center gap-3 text-sm font-bold sm:w-auto sm:gap-4">
          <Link className={navClass(active === "home")} href="/">
            Home
          </Link>
          <Link className={navClass(active === "products")} href="/products">
            Products
          </Link>
          <Link className={navClass(active === "cart")} href="/cart">
            Cart
          </Link>
          {isLoading ? (
            <span className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-slate-400">
              Checking...
            </span>
          ) : !user ? (
            <Link
              className="rounded-xl bg-slate-950 px-4 py-2 text-white shadow-lg shadow-slate-900/10 transition hover:bg-fuchsia-700"
              href="/login"
            >
              Sign in
            </Link>
          ) : null}
          <ThemeToggle compact />
        </nav>
      </div>
    </header>
  );
}

function navClass(isActive: boolean) {
  return isActive
    ? "text-fuchsia-700"
    : "text-slate-500 transition hover:text-slate-950";
}
