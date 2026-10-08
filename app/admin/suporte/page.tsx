"use client";

import { Suspense } from "react";

import { CaixaDeSuporte } from "@/components/telas/admin/suporte";

/* SUPORTE: os chamados — os que alguém abriu e os que o sistema abriu sozinho. */
export default function AdminSuportePage() {
  return (
    <Suspense fallback={null}>
      <CaixaDeSuporte />
    </Suspense>
  );
}
