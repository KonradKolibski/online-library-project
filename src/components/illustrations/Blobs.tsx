/**
 * Decorative gradient blobs rendered behind the app content.
 * Fixed-position, pointer-events none, low z-index.
 */
export function Blobs() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="absolute -top-32 -left-32 h-[28rem] w-[28rem] rounded-full blur-3xl opacity-60"
        style={{ background: "radial-gradient(circle, #C7D2FE 0%, transparent 70%)" }}
      />
      <div
        className="absolute top-1/3 -right-40 h-[32rem] w-[32rem] rounded-full blur-3xl opacity-50"
        style={{ background: "radial-gradient(circle, #FBCFE8 0%, transparent 70%)" }}
      />
      <div
        className="absolute -bottom-40 left-1/3 h-[30rem] w-[30rem] rounded-full blur-3xl opacity-50"
        style={{ background: "radial-gradient(circle, #FED7AA 0%, transparent 70%)" }}
      />
      <div
        className="absolute top-1/2 left-1/4 h-72 w-72 rounded-full blur-3xl opacity-40"
        style={{ background: "radial-gradient(circle, #DDD6FE 0%, transparent 70%)" }}
      />
    </div>
  );
}
