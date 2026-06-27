"use client";

interface AnimatedRaysProps {
  className?: string;
}

export default function AnimatedRays({ className = "" }: AnimatedRaysProps) {
  const stripes = `repeating-linear-gradient(
    100deg,
    rgba(253,248,240,0.06) 0%,
    rgba(253,248,240,0.06) 7%,
    transparent 10%,
    transparent 12%,
    rgba(253,248,240,0.06) 16%
  )`;

  // coral → mango → mint → coral loop
  const rays = `repeating-linear-gradient(
    100deg,
    #F76C4D 10%,
    #FF8D16 18%,
    #25CCB8 26%,
    #F76C4D 34%,
    #FF8D16 42%,
    #25CCB8 50%
  )`;

  return (
    <div
      aria-hidden
      className={`absolute inset-0 overflow-hidden ${className}`}
      style={{ zIndex: 1 }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `${stripes}, ${rays}`,
          backgroundSize: "300%, 200%",
          backgroundPosition: "50% 50%, 50% 50%",
          filter: "blur(12px) opacity(0.38) saturate(180%)",
          maskImage: "radial-gradient(ellipse at 90% 5%, black 30%, transparent 72%)",
          WebkitMaskImage: "radial-gradient(ellipse at 90% 5%, black 30%, transparent 72%)",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `${stripes}, ${rays}`,
            backgroundSize: "200%, 100%",
            backgroundAttachment: "fixed",
            mixBlendMode: "multiply",
            animation: "crdAuroraBg 18s ease-in-out infinite",
          }}
        />
      </div>

      {/* segundo haz: mango desde arriba-izquierda, más tenue */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `repeating-linear-gradient(
            80deg,
            #FF8D16 0%,
            #F76C4D 14%,
            transparent 18%,
            transparent 22%,
            #25CCB8 28%,
            transparent 34%
          )`,
          backgroundSize: "250%, 150%",
          filter: "blur(18px) opacity(0.18) saturate(160%)",
          maskImage: "radial-gradient(ellipse at 8% 8%, black 20%, transparent 60%)",
          WebkitMaskImage: "radial-gradient(ellipse at 8% 8%, black 20%, transparent 60%)",
          animation: "crdAuroraBgAlt 22s ease-in-out infinite",
        }}
      />
    </div>
  );
}
