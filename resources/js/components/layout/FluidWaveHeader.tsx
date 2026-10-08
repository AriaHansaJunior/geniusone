import { useEffect, useRef } from "react";

export function FluidWaveHeader() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;

    const handleResize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.scale(dpr, dpr);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    let startTime: number | null = null;

    const render = (now: number) => {
      if (startTime === null) startTime = now;
      const elapsed = (now - startTime) * 0.001;

      // Kecepatan lambat & elegan (calm, slow wavy flow)
      const t = elapsed * 0.45;

      if (width > 0 && height > 0) {
        // =========================================================================
        // 1. BASE BACKGROUND (Deep Navy ke Dark Maroon - Infinity Continuous Drift)
        // =========================================================================
        // Transisi warna menggunakan fungsi sinus/kosinus kontinu sehingga tidak ada
        // "detik akhir" ataupun reset loop yang patah/ngecut. Warnanya mengalun mulus selamanya.
        const colorCycle = t * 0.06;
        const navyShift = Math.sin(colorCycle) * 0.12;

        const bgGrad = ctx.createLinearGradient(0, 0, width, height);
        bgGrad.addColorStop(0, "#061329"); // Deepest Navy
        bgGrad.addColorStop(Math.max(0, 0.4 + navyShift), "#09224d"); // Ocean Blue
        bgGrad.addColorStop(Math.min(1, 0.85 + navyShift), "#4a0b1d"); // Deep Maroon Wine
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);

        // =========================================================================
        // 2. FUNGSI GELOMBANG AIR BIASA (Pure Smooth Layered Waves)
        // =========================================================================
        // Mengalir lembut dari kanan ke kiri tanpa efek benturan/tabrakan tembok.
        const drawSmoothWave = (
          baseY: number,
          amplitude1: number,
          wavelength1: number,
          amplitude2: number,
          wavelength2: number,
          speed: number,
          phase: number,
          fillGradient: CanvasGradient,
          crestColor: string,
          crestAlpha: number
        ) => {
          ctx.beginPath();
          const step = 6;
          const k1 = (2 * Math.PI) / wavelength1;
          const k2 = (2 * Math.PI) / wavelength2;

          const getWaveY = (x: number) => {
            const w1 = Math.sin(x * k1 + t * speed + phase) * amplitude1;
            const w2 = Math.cos(x * k2 - t * (speed * 0.6) + phase * 1.5) * amplitude2;
            return baseY + w1 + w2;
          };

          const startY = getWaveY(-10);
          ctx.moveTo(-10, startY);

          const crestPoints: { x: number; y: number }[] = [];

          for (let x = -10; x <= width + 15; x += step) {
            const y = getWaveY(x);
            ctx.lineTo(x, y);
            crestPoints.push({ x, y });
          }

          // Isi bagian bawah gelombang agar membentuk volume air yang anggun
          ctx.lineTo(width + 15, height);
          ctx.lineTo(-10, height);
          ctx.closePath();

          ctx.fillStyle = fillGradient;
          ctx.fill();

          // Garis lembut permukaan air (crest highlight)
          if (crestAlpha > 0) {
            ctx.beginPath();
            ctx.moveTo(crestPoints[0].x, crestPoints[0].y);
            for (let i = 1; i < crestPoints.length; i++) {
              ctx.lineTo(crestPoints[i].x, crestPoints[i].y);
            }
            ctx.strokeStyle = crestColor;
            ctx.lineWidth = 1.3;
            ctx.globalAlpha = crestAlpha;
            ctx.stroke();
            ctx.globalAlpha = 1.0;
          }
        };

        // =========================================================================
        // 3. LAYER 1: GELOMBANG DALAM (Deep Sapphire ke Dark Maroon)
        // =========================================================================
        const grad1 = ctx.createLinearGradient(0, 0, width, 0);
        grad1.addColorStop(0, "rgba(22, 60, 155, 0.45)"); // Deep Sapphire
        grad1.addColorStop(0.5, "rgba(37, 99, 235, 0.35)"); // Royal Blue
        grad1.addColorStop(1, "rgba(140, 18, 48, 0.42)"); // Maroon

        drawSmoothWave(
          height * 0.58,
          9,
          480,
          4,
          260,
          0.75,
          0,
          grad1,
          "rgba(59, 130, 246, 0.4)",
          0.35
        );

        // =========================================================================
        // 4. LAYER 2: GELOMBANG UTAMA (Crimson Red ke Ocean Blue)
        // =========================================================================
        // Memadukan warna merah dan biru yang harmonis di alur tengah
        const grad2 = ctx.createLinearGradient(0, 0, width, 0);
        grad2.addColorStop(0, "rgba(185, 24, 60, 0.42)"); // Crimson Red
        grad2.addColorStop(0.45, "rgba(29, 78, 216, 0.38)"); // Blue Tengah
        grad2.addColorStop(0.85, "rgba(190, 18, 60, 0.38)"); // Crimson
        grad2.addColorStop(1, "rgba(194, 65, 12, 0.32)"); // Aksen hangat amber/oranye lembut

        drawSmoothWave(
          height * 0.46,
          8,
          380,
          4.5,
          190,
          1.05,
          2.3,
          grad2,
          "rgba(244, 63, 94, 0.5)",
          0.45
        );

        // =========================================================================
        // 5. LAYER 3: GELOMBANG ATAS LEMBUT (Aksen Semburan Ombak Halus)
        // =========================================================================
        const grad3 = ctx.createLinearGradient(0, 0, width, 0);
        grad3.addColorStop(0, "rgba(29, 78, 216, 0.28)"); // Blue
        grad3.addColorStop(0.5, "rgba(217, 70, 38, 0.25)"); // Warm orange/amber accent
        grad3.addColorStop(1, "rgba(159, 18, 57, 0.3)"); // Maroon

        drawSmoothWave(
          height * 0.5,
          5,
          310,
          3,
          150,
          0.6,
          4.5,
          grad3,
          "rgba(251, 146, 60, 0.4)",
          0.3
        );
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="topbar__fluid-canvas" aria-hidden="true" />;
}
