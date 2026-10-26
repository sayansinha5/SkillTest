export default function PlaceholderPage({ title }) {
  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-ink">{title}</h1>
      <p className="rounded-lg border border-dashed border-slate-300 bg-card p-6 text-sm text-slate-600">
        This section will be built in the next slices.
      </p>
    </div>
  )
}
