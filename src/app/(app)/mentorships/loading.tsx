// Skeleton shown while a member's conversations load.
export default function Loading() {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="skeleton h-8 w-44" />
      <div className="skeleton mt-3 h-4 w-80" />
      <div className="mt-6 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card flex items-center justify-between p-5">
            <div className="flex-1">
              <div className="skeleton h-5 w-40" />
              <div className="skeleton mt-2 h-4 w-24" />
            </div>
            <div className="skeleton h-5 w-5 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
