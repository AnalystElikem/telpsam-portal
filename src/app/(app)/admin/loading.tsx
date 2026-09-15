// Skeleton shown while admin pages load.
export default function Loading() {
  return (
    <div>
      <div className="skeleton h-8 w-64" />
      <div className="skeleton mt-3 h-4 w-96 max-w-full" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="card p-5">
            <div className="flex items-center gap-3">
              <div className="skeleton h-11 w-11 rounded-full" />
              <div className="flex-1">
                <div className="skeleton h-6 w-12" />
                <div className="skeleton mt-2 h-3 w-28" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
