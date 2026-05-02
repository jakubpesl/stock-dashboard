export default function SkeletonCard() {
  return (
    <div className="bg-[#1a1a24] border border-[#2a2a3a] rounded-xl p-5 animate-pulse">
      <div className="flex justify-between mb-4">
        <div className="space-y-2">
          <div className="h-3 w-16 bg-white/10 rounded" />
          <div className="h-4 w-24 bg-white/10 rounded" />
        </div>
        <div className="space-y-2 text-right">
          <div className="h-5 w-20 bg-white/10 rounded" />
          <div className="h-4 w-12 bg-white/10 rounded ml-auto" />
        </div>
      </div>
      <div className="h-16 bg-white/5 rounded mb-4" />
      <div className="h-6 w-28 bg-white/10 rounded" />
    </div>
  )
}
