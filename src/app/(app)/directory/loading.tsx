// Skeleton shown while the directory loads.
export default function Loading() {
  return (
    <div>
      <div className="skeleton h-8 w-48" />
      <div className="skeleton mt-3 h-4 w-72" />
      <div className="skeleton mt-5 h-11 w-full max-w-md" />
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card p-6">
            <div className="flex items-start gap-5">
              <div className="skeleton h-[88px] w-[88px] rounded-full" />
              <div className="flex-1">
                <div className="skeleton h-5 w-40" />
                <div className="skeleton mt-2 h-4 w-32" />
                <div className="skeleton mt-3 h-4 w-full" />
                <div className="skeleton mt-2 h-4 w-2/3" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
