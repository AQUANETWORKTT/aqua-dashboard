"use client";

const products = [
  { name: "Aqua Agency Hoodie", image: "/merch/hoodie1.png" },
  { name: "Aqua Agency T-Shirt", image: "/merch/shirt1.png" },
  { name: "Aqua Tracksuit", image: "/merch/hoodie2.png" },
  { name: "Aqua Shorts", image: "/merch/shirt2.png" },
  { name: "Aqua Joggers", image: "/merch/bottoms.png" },
  { name: "Aqua Bucket Hat", image: "/merch/hat.png" },
];

export default function MerchPage() {
  return (
    <main className="merch-page min-h-screen bg-[#020617] text-white overflow-hidden">
      {/* HERO */}
      <section className="relative h-[620px] flex items-center justify-center text-center px-6">
        <div
          className="merch-hero-fade absolute inset-0 bg-cover bg-center blur-md scale-100 opacity-100"
          style={{
            backgroundImage: "url('/merch/top-banner.png')",
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-[#020617]/45 to-[#020617]" />

        <div className="relative z-10 max-w-5xl pt-10">
          <p className="text-cyan-400 tracking-[0.45em] text-sm mb-6">
            AQUA CREATOR NETWORK
          </p>

          <h1 className="merch-glow-text text-6xl md:text-8xl font-black tracking-tight leading-none">
            OFFICIAL MERCH
          </h1>

          <div className="w-24 h-[2px] bg-cyan-400 mx-auto my-8" />

          <p className="text-white/70 text-lg md:text-xl max-w-2xl mx-auto">
            Premium Aqua clothing and accessories. Designed for creators.
            Worn by legends.
          </p>
        </div>
      </section>

      {/* PRODUCTS */}
      <section className="max-w-7xl mx-auto px-6 pb-24 -mt-10 relative z-10">
        <div className="flex items-center gap-6 mb-10">
          <div className="h-px bg-cyan-400/20 flex-1" />
          <h2 className="text-cyan-400 text-2xl md:text-3xl font-bold tracking-[0.35em] text-center">
            COMING SOON
          </h2>
          <div className="h-px bg-cyan-400/20 flex-1" />
        </div>

        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-8">
          {products.map((item) => (
            <div
              key={item.name}
              className="merch-card rounded-3xl border border-cyan-400/30 p-5 transition-all duration-300"
            >
              <div className="aspect-square rounded-2xl bg-black/30 flex items-center justify-center overflow-hidden">
                <img
                  src={item.image}
                  alt={item.name}
                  className="max-h-full max-w-full object-contain"
                />
              </div>

              <h3 className="text-2xl font-bold mt-6 text-center">
                {item.name}
              </h3>

              <p className="text-cyan-400 text-sm tracking-[0.3em] mt-2 text-center">
                COMING SOON
              </p>

              <button
                disabled
                className="merch-button mt-6 w-full py-4 rounded-2xl border border-cyan-400 text-cyan-300 font-bold tracking-widest cursor-not-allowed opacity-80"
              >
                COMING SOON
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* EMAIL SECTION */}
      <section className="max-w-7xl mx-auto px-6 pb-24">
        <div className="rounded-3xl border border-cyan-400/20 bg-[#07111f] p-10 flex flex-col lg:flex-row gap-6 items-center justify-between shadow-[0_0_25px_rgba(0,255,255,0.08)]">
          <div>
            <h2 className="text-3xl font-bold merch-glow-text mb-2">
              BE THE FIRST TO KNOW
            </h2>

            <p className="text-white/60">
              Join the Aqua list for early access to drops and merch releases.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <input
              placeholder="Enter your email..."
              className="bg-black/30 border border-cyan-400/20 rounded-xl px-5 py-4 w-full sm:w-[320px] outline-none text-white placeholder:text-white/40"
            />

            <button className="px-8 py-4 rounded-xl bg-cyan-500 text-black font-black tracking-wider hover:brightness-110 transition">
              NOTIFY ME
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}