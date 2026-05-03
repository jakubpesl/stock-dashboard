export default function SkeletonCard() {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <div className="flex justify-between mb-3">
        <div className="space-y-2">
          <div className="skeleton h-4 w-12" />
          <div className="skeleton h-3.5 w-24 mt-1" />
        </div>
        <div className="space-y-2 text-right">
          <div className="skeleton h-5 w-20 ml-auto" />
          <div className="skeleton h-3 w-10 ml-auto" />
        </div>
      </div>
      <div className="skeleton h-[72px] w-full my-3" />
      <div className="skeleton h-6 w-20 rounded-full" />
      <div className="skeleton h-1.5 w-full mt-2 rounded-full" />
    </div>
  )
}
