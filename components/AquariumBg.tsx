"use client";

import { CrabHero } from "./CrabHero";

/*
  AquariumBg — Pure black background + floating 3D crab.
  The crab drifts across the screen behind all content.
*/

export function AquariumBg() {
  return (
    <div
      className="fixed inset-0 pointer-events-none"
      style={{
        zIndex: 0,
        background: "#000000",
      }}
    >
      <CrabHero />
    </div>
  );
}
