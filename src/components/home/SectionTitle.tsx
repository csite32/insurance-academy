const SectionTitle = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <div className="flex flex-col items-center text-center">
    <div className="flex items-center gap-3">
      <span className="h-px w-10 bg-primary" />
      <h2 className="text-2xl font-bold text-foreground sm:text-3xl">{title}</h2>
      <span className="h-px w-10 bg-primary" />
    </div>
    {subtitle && <p className="mt-3 text-sm text-muted-foreground sm:text-base">{subtitle}</p>}
  </div>
);

export default SectionTitle;