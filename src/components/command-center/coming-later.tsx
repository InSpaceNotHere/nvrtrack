export function ComingLater({ title, summary }: { title: string; summary: string }) {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-[15px] font-semibold uppercase tracking-[0.08em] text-[#17785E]">Coming next</p>
        <h1 className="mt-2 text-[clamp(2rem,4vw,2.375rem)] font-semibold tracking-tight text-[#17201D]">{title}</h1>
        <p className="mt-3 max-w-xl text-[18px] leading-8 text-[#65706B]">{summary}</p>
      </header>
    </div>
  );
}
