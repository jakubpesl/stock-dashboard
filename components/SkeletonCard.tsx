export default function SkeletonCard() {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 animate-pulse">
      <div className="flex justify-between mb-4">
        <div className="space-y-2">
          <div className="h-3 w-16 bg-slate-200 rounded-full" />
          <div className="h-4 w-24 bg-slate-200 rounded-full" />
        </div>
        <div className="space-y-2 text-right">
          <div className="h-5 w-20 bg-slate-200 rounded-full ml-auto" />
          <div className="h-4 w-12 bg-slate-200 rounded-full ml-auto" />
        </div>
      </div>
      <div className="h-16 bg-slate-100 rounded-xl mb-4" />
      <div className="h-6 w-28 bg-slate-200 rounded-full" />
    </div>
  )
}
