/** Cột No / Team / Ca / Họ tên đứng yên khi cuộn ngang */
export const freezeCol = {
  table: "border-separate border-spacing-0",
  no: "sticky left-0 z-20 w-12 min-w-12 max-w-12 bg-white",
  team: "sticky left-12 z-20 w-16 min-w-16 max-w-16 bg-white align-top",
  ca: "sticky left-[112px] z-20 w-[72px] min-w-[72px] max-w-[72px] bg-white align-top",
  name: "sticky left-[184px] z-20 w-[140px] min-w-[140px] max-w-[140px] bg-white shadow-[2px_0_6px_rgba(0,0,0,0.12)]",
  block:
    "sticky left-0 z-20 min-w-[324px] bg-white shadow-[2px_0_6px_rgba(0,0,0,0.12)]",
} as const;
