import { useState, useEffect, useRef, useCallback } from "react";

// ─── AR Filter Renderers ─────────────────────────────────────────────────────
// face = { x, y, w, h } top-left + size in canvas pixels
// landmarks = faceapi landmarks object (68 points)

// helper: draw a heart shape centered at (cx,cy) with given size
function drawHeart(ctx, cx, cy, size, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.shadowColor = color; ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.moveTo(cx, cy + size * 0.3);
  ctx.bezierCurveTo(cx - size, cy - size * 0.3, cx - size * 1.1, cy + size * 0.6, cx, cy + size * 1.1);
  ctx.bezierCurveTo(cx + size * 1.1, cy + size * 0.6, cx + size, cy - size * 0.3, cx, cy + size * 0.3);
  ctx.closePath(); ctx.fill();
  ctx.shadowBlur = 0; ctx.restore();
}

// helper: draw a fluffy cloud centered at (cx,cy)
function drawCloud(ctx, cx, cy, w, h) {
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.88)";
  ctx.shadowColor = "rgba(200,200,255,0.5)"; ctx.shadowBlur = 10;
  const r = h * 0.45;
  ctx.beginPath();
  ctx.arc(cx,          cy,          r * 1.1, 0, Math.PI * 2);
  ctx.arc(cx - w*0.28, cy + h*0.1,  r * 0.85, 0, Math.PI * 2);
  ctx.arc(cx + w*0.28, cy + h*0.1,  r * 0.85, 0, Math.PI * 2);
  ctx.arc(cx - w*0.18, cy + h*0.35, r * 0.7,  0, Math.PI * 2);
  ctx.arc(cx + w*0.18, cy + h*0.35, r * 0.7,  0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0; ctx.restore();
}

// helper: draw a cute bow at (cx, cy)
function drawBow(ctx, cx, cy, size) {
  ctx.save();
  // Left loop
  ctx.fillStyle = "#ff3d8a";
  ctx.shadowColor = "#ff3d8a"; ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.bezierCurveTo(cx - size*1.1, cy - size*0.8, cx - size*1.3, cy + size*0.5, cx, cy + size*0.15);
  ctx.closePath(); ctx.fill();
  // Right loop
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.bezierCurveTo(cx + size*1.1, cy - size*0.8, cx + size*1.3, cy + size*0.5, cx, cy + size*0.15);
  ctx.closePath(); ctx.fill();
  // Knot center circle
  ctx.fillStyle = "#ff6aaa";
  ctx.beginPath(); ctx.arc(cx, cy + size*0.07, size*0.22, 0, Math.PI*2); ctx.fill();
  // Left tail
  ctx.fillStyle = "#ff3d8a";
  ctx.beginPath();
  ctx.moveTo(cx - size*0.1, cy + size*0.15);
  ctx.bezierCurveTo(cx - size*0.6, cy + size*0.7, cx - size*0.9, cy + size*0.9, cx - size*0.5, cy + size*1.0);
  ctx.bezierCurveTo(cx - size*0.3, cy + size*0.8, cx - size*0.1, cy + size*0.5, cx, cy + size*0.15);
  ctx.closePath(); ctx.fill();
  // Right tail
  ctx.beginPath();
  ctx.moveTo(cx + size*0.1, cy + size*0.15);
  ctx.bezierCurveTo(cx + size*0.6, cy + size*0.7, cx + size*0.9, cy + size*0.9, cx + size*0.5, cy + size*1.0);
  ctx.bezierCurveTo(cx + size*0.3, cy + size*0.8, cx + size*0.1, cy + size*0.5, cx, cy + size*0.15);
  ctx.closePath(); ctx.fill();
  ctx.shadowBlur = 0; ctx.restore();
}

const AR_RENDERERS = {
  none: null,

  // 🐰 Bunny ears + pink nose + whiskers
  bunny: (ctx, face, lm) => {
    const cx = face.x + face.w / 2;
    const earW = face.w * 0.2, earH = face.h * 0.95, gap = face.w * 0.2;
    [{ ox: -gap, angle: -0.13 }, { ox: gap, angle: 0.13 }].forEach(({ ox, angle }) => {
      ctx.save();
      ctx.translate(cx + ox, face.y);
      ctx.rotate(angle);
      ctx.fillStyle = "#f0f0f0";
      ctx.beginPath(); ctx.ellipse(0, -earH/2, earW/2, earH/2, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = "#ffb6c1";
      ctx.beginPath(); ctx.ellipse(0, -earH/2, earW*0.3, earH*0.44, 0, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    });
    const noseTip = lm ? lm.getNose()[3] : null;
    const nx = noseTip ? noseTip.x : cx;
    const ny = noseTip ? noseTip.y : face.y + face.h * 0.62;
    ctx.font = `${face.w*0.2}px serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("🐽", nx, ny);
    ctx.strokeStyle = "rgba(255,255,255,0.85)"; ctx.lineWidth = 1.8;
    for (let i = 0; i < 3; i++) {
      const dy = (i-1) * (face.h*0.06);
      ctx.beginPath(); ctx.moveTo(nx-face.w*0.06, ny+dy); ctx.lineTo(nx-face.w*0.46, ny+dy-face.h*0.02); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(nx+face.w*0.06, ny+dy); ctx.lineTo(nx+face.w*0.46, ny+dy-face.h*0.02); ctx.stroke();
    }
  },

  // 🐱 Cat ears + whiskers
  cat: (ctx, face, lm) => {
    const cx = face.x + face.w / 2;
    const earH = face.h * 0.4;
    [[face.x+face.w*0.1,face.y,face.x-face.w*0.02,face.y-earH,face.x+face.w*0.32,face.y-earH*0.06],
     [face.x+face.w*0.9,face.y,face.x+face.w*1.02,face.y-earH,face.x+face.w*0.68,face.y-earH*0.06]
    ].forEach(([x1,y1,x2,y2,x3,y3]) => {
      ctx.fillStyle="#1a1a1a"; ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.lineTo(x3,y3); ctx.closePath(); ctx.fill();
    });
    ctx.fillStyle="#ffb6c1";
    ctx.beginPath(); ctx.moveTo(face.x+face.w*0.12,face.y); ctx.lineTo(face.x+face.w*0.05,face.y-earH*0.7); ctx.lineTo(face.x+face.w*0.3,face.y-earH*0.05); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(face.x+face.w*0.88,face.y); ctx.lineTo(face.x+face.w*0.95,face.y-earH*0.7); ctx.lineTo(face.x+face.w*0.7,face.y-earH*0.05); ctx.closePath(); ctx.fill();
    const noseTip = lm ? lm.getNose()[3] : null;
    const nx = noseTip ? noseTip.x : cx;
    const ny = noseTip ? noseTip.y : face.y + face.h*0.62;
    ctx.fillStyle="#ff69b4"; ctx.beginPath(); ctx.arc(nx,ny,face.w*0.045,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle="rgba(0,0,0,0.6)"; ctx.lineWidth=1.6;
    for (let i=0;i<3;i++){
      const dy=(i-1)*(face.h*0.055);
      ctx.beginPath();ctx.moveTo(nx-face.w*0.07,ny+dy);ctx.lineTo(nx-face.w*0.47,ny+dy-face.h*0.02);ctx.stroke();
      ctx.beginPath();ctx.moveTo(nx+face.w*0.07,ny+dy);ctx.lineTo(nx+face.w*0.47,ny+dy-face.h*0.02);ctx.stroke();
    }
  },

  // 💗 Pink hearts — above head only, nothing on face
  hearts: (ctx, face, lm, t) => {
    const cx = face.x + face.w / 2;
    const bob = Math.sin(t / 600) * 5;
    // Big center heart
    drawHeart(ctx, cx,              face.y - face.h*0.55 + bob,    face.w*0.18, "#ff3d8a");
    // Flanking hearts
    drawHeart(ctx, cx - face.w*0.32, face.y - face.h*0.42 + bob*0.7, face.w*0.11, "#ff6aaa");
    drawHeart(ctx, cx + face.w*0.32, face.y - face.h*0.42 + bob*0.7, face.w*0.11, "#ff6aaa");
    // Smaller ones even wider
    drawHeart(ctx, cx - face.w*0.55, face.y - face.h*0.28 + bob*0.4, face.w*0.07, "#ffadd0");
    drawHeart(ctx, cx + face.w*0.55, face.y - face.h*0.28 + bob*0.4, face.w*0.07, "#ffadd0");
  },

  // ☁️ Small cute clouds above head only, nothing on face
  clouds: (ctx, face, lm, t) => {
    const cx = face.x + face.w / 2;
    const bob = Math.sin(t / 800) * 4;
    const cw = face.w * 0.22, ch = face.h * 0.1;
    // Center cloud above head
    drawCloud(ctx, cx,               face.y - face.h*0.48 + bob,    cw*1.2, ch*1.2);
    // Side clouds slightly lower
    drawCloud(ctx, cx - face.w*0.38, face.y - face.h*0.36 + bob*0.6, cw,     ch);
    drawCloud(ctx, cx + face.w*0.38, face.y - face.h*0.36 + bob*0.6, cw,     ch);
    // Tiny puffs even wider
    ctx.save(); ctx.globalAlpha = 0.7;
    drawCloud(ctx, cx - face.w*0.65, face.y - face.h*0.22 + bob*0.3, cw*0.7, ch*0.7);
    drawCloud(ctx, cx + face.w*0.65, face.y - face.h*0.22 + bob*0.3, cw*0.7, ch*0.7);
    ctx.globalAlpha = 1; ctx.restore();
  },

  // 🎀 Small bow on right side of head (like a hair clip)
  bow: (ctx, face, lm, t) => {
    const bob = Math.sin(t / 700) * 3;
    const bowSize = face.w * 0.17;   // much smaller
    // Place on right side of head, at hairline level
    const bowX = face.x + face.w * 0.88;
    const bowY = face.y - face.h * 0.04 + bob;
    drawBow(ctx, bowX, bowY, bowSize);
    // A couple of tiny hearts near the bow
    [{dx:face.w*0.22,dy:-face.h*0.18,p:0},{dx:face.w*0.38,dy:-face.h*0.05,p:2}].forEach(m=>{
      drawHeart(ctx, face.x+face.w/2+m.dx, face.y+m.dy+Math.sin(t/500+m.p)*4, face.w*0.04, "#ff85b3");
    });
  },

  // 🎃 Pumpkin hat
  pumpkin: (ctx, face) => {
    const cx = face.x + face.w/2;
    const brimY=face.y-face.h*0.07, brimH=face.h*0.12, hatW=face.w*1.12;
    const topW=hatW*0.56, topH=face.h*0.65, topY=brimY-topH;
    const rr=(x,y,w,h,r)=>{ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();};
    ctx.fillStyle="#1a1a1a"; rr(cx-hatW/2,brimY,hatW,brimH,brimH/2); ctx.fill();
    ctx.fillStyle="#111"; rr(cx-topW/2,topY,topW,topH+brimH/2,6); ctx.fill();
    ctx.strokeStyle="#d4a000"; ctx.lineWidth=2.5; ctx.strokeRect(cx-hatW*0.07,brimY-brimH*0.28,hatW*0.14,brimH*1.55);
    ctx.shadowColor="#ff6600"; ctx.shadowBlur=14; ctx.fillStyle="#ff6600";
    const ey=face.y+face.h*0.4, es=face.w*0.11;
    [[0.28,0.22,0.34],[0.72,0.66,0.78]].forEach(([top,l,r])=>{ctx.beginPath();ctx.moveTo(face.x+face.w*top,ey-es);ctx.lineTo(face.x+face.w*l,ey+es*0.4);ctx.lineTo(face.x+face.w*r,ey+es*0.4);ctx.closePath();ctx.fill();});
    const my=face.y+face.h*0.66; ctx.beginPath();
    [0.18,0.27,0.36,0.45,0.54,0.63,0.72,0.82].forEach((mx,i)=>{const py=my+(i%2===0?0:face.h*0.09);i===0?ctx.moveTo(face.x+face.w*mx,py):ctx.lineTo(face.x+face.w*mx,py);});
    ctx.strokeStyle="#ff6600"; ctx.lineWidth=3; ctx.stroke(); ctx.shadowBlur=0;
  },
};

const AR_FILTERS = [
  { id:"none",    label:"None",    emoji:"🚫" },
  { id:"bunny",   label:"Bunny",   emoji:"🐰" },
  { id:"cat",     label:"Cat",     emoji:"🐱" },
  { id:"hearts",  label:"Hearts",  emoji:"💗" },
  { id:"clouds",  label:"Clouds",  emoji:"☁️" },
  { id:"bow",     label:"Bow",     emoji:"🎀" },
  { id:"pumpkin", label:"Pumpkin", emoji:"🎃" },
];

const COLOR_FILTERS = [
  { id:"filmy",     label:"Filmy",    css:"sepia(40%) saturate(1.5) brightness(1.08) contrast(0.88) hue-rotate(-15deg)" },
  { id:"summery",   label:"Summery",  css:"saturate(1.6) brightness(1.18) contrast(0.88) hue-rotate(12deg) sepia(18%)" },
  { id:"mild",      label:"Mild",     css:"saturate(0.8) brightness(1.06) contrast(1.04) sepia(8%)" },
  { id:"candy",     label:"Candy",    css:"saturate(2.0) brightness(1.12) contrast(0.82) hue-rotate(-8deg) sepia(10%)" },
];

const STICKER_PACKS = {
  cute:   ["🎀","💖","✨","🐱","🌸","🍭","😎","👑","🦋","🌈","🔥","💎"],
  spooky: ["👻","💀","🕷️","🦇","🌙","🔮","🕯️","⚡","😈","🪄","🫀","🎃"],
  hype:   ["🔥","💯","🤩","💪","🎯","🚀","🏆","🎸","💥","🌟","🤡","😂"],
  nature: ["🌺","🍀","🌊","🦜","🐬","🌿","🍄","🌻","🐝","🌴","🦋","🐸"],
};

// ─── Main Component ──────────────────────────────────────────────────────────
export default function PhotoBhoot() {
  const videoRef       = useRef(null);
  const arCanvasRef    = useRef(null);
  const rafRef         = useRef(null);
  const streamRef      = useRef(null);
  const tRef           = useRef(0);
  const faceDataRef    = useRef(null); // { face, landmarks }
  const faceApiLoaded  = useRef(false);
  const detectLoopRef  = useRef(null);

  const [activeAR,     setActiveAR]     = useState("none");
  const [activeColor,  setActiveColor]  = useState("");
  const [filterTab,    setFilterTab]    = useState("ar");
  const [isMirrored,   setIsMirrored]   = useState(true);
  const [facingMode,   setFacingMode]   = useState("user");
  const [mode,         setMode]         = useState("single");
  const [collageCount, setCollageCount] = useState(3);
  const [isCapturing,  setIsCapturing]  = useState(false);
  const [countdown,    setCountdown]    = useState(null);
  const [showFlash,    setShowFlash]    = useState(false);
  const [screen,       setScreen]       = useState("camera");
  const [editSrc,      setEditSrc]      = useState(null);
  const [stickerPack,  setStickerPack]  = useState("cute");
  const [stickers,     setStickers]     = useState([]);
  const [caption,      setCaption]      = useState("");
  const [gallery,      setGallery]      = useState([]);
  const [previewSrc,   setPreviewSrc]   = useState(null);
  const [faceStatus,   setFaceStatus]   = useState(""); // "" | "loading" | "found" | "lost"
  const [cameraError,  setCameraError]  = useState(false);

  // ── Camera ────────────────────────────────────────────────
  const startCamera = useCallback(async (facing) => {
    const fm = facing || facingMode;
    try {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: fm, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false
      });
      if (videoRef.current) { videoRef.current.srcObject = stream; streamRef.current = stream; }
      setCameraError(false);
    } catch { setCameraError(true); }
  }, [facingMode]);

  useEffect(() => { startCamera(); return () => streamRef.current?.getTracks().forEach(t => t.stop()); }, []);

  const flipCamera = async () => {
    const next = facingMode === "user" ? "environment" : "user";
    setFacingMode(next);
    await startCamera(next);
  };

  // ── Load face-api.js & models ─────────────────────────────
  useEffect(() => {
    const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13/model";

    const loadFaceApi = () => {
      return new Promise((resolve) => {
        // Load face-api script
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13/dist/face-api.js";
        script.onload = async () => {
          try {
            const faceapi = window.faceapi;
            // Load tiny models (fast & lightweight)
            await Promise.all([
              faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
              faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
            ]);
            faceApiLoaded.current = true;
            resolve(true);
          } catch (e) {
            console.warn("face-api models failed:", e);
            resolve(false);
          }
        };
        script.onerror = () => resolve(false);
        document.head.appendChild(script);
      });
    };

    setFaceStatus("loading");
    loadFaceApi().then(ok => {
      if (ok) {
        setFaceStatus("ready");
        startDetectionLoop();
      } else {
        setFaceStatus("unsupported");
      }
    });

    return () => {
      if (detectLoopRef.current) clearTimeout(detectLoopRef.current);
    };
  }, []);

  // ── Face Detection Loop ───────────────────────────────────
  const startDetectionLoop = () => {
    const detect = async () => {
      const faceapi = window.faceapi;
      const video   = videoRef.current;
      if (!faceapi || !video || !video.videoWidth || !faceApiLoaded.current) {
        detectLoopRef.current = setTimeout(detect, 200);
        return;
      }
      try {
        const result = await faceapi
          .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 }))
          .withFaceLandmarks(true); // true = tiny landmark model

        if (result) {
          // result.detection.box = {x,y,width,height} in VIDEO pixels
          // We need to scale to the DISPLAYED canvas size
          const c    = arCanvasRef.current;
          const rect = video.getBoundingClientRect();
          const dw   = rect.width, dh = rect.height;

          // Scale from video resolution to display size (accounting for object-fit:cover)
          const vidAR  = video.videoWidth / video.videoHeight;
          const dispAR = dw / dh;
          let scaleX, scaleY, offX = 0, offY = 0;
          if (vidAR > dispAR) {
            scaleY = dh / video.videoHeight; scaleX = scaleY;
            offX = (dw - video.videoWidth * scaleX) / 2;
          } else {
            scaleX = dw / video.videoWidth; scaleY = scaleX;
            offY = (dh - video.videoHeight * scaleY) / 2;
          }

          const box = result.detection.box;
          let fx = box.x * scaleX + offX;
          const fy = box.y * scaleY + offY;
          const fw = box.width  * scaleX;
          const fh = box.height * scaleY;

          // Mirror X if needed
          if (isMirrored) fx = dw - fx - fw;

          // Scale landmarks too
          const rawLM = result.landmarks;
          const scaledLM = {
            getNose: () => rawLM.getNose().map(p => ({
              x: isMirrored ? dw - (p.x * scaleX + offX) : p.x * scaleX + offX,
              y: p.y * scaleY + offY
            })),
            getLeftEye: () => rawLM.getLeftEye().map(p => ({
              x: isMirrored ? dw - (p.x * scaleX + offX) : p.x * scaleX + offX,
              y: p.y * scaleY + offY
            })),
            getRightEye: () => rawLM.getRightEye().map(p => ({
              x: isMirrored ? dw - (p.x * scaleX + offX) : p.x * scaleX + offX,
              y: p.y * scaleY + offY
            })),
            getMouth: () => rawLM.getMouth().map(p => ({
              x: isMirrored ? dw - (p.x * scaleX + offX) : p.x * scaleX + offX,
              y: p.y * scaleY + offY
            })),
          };

          faceDataRef.current = { face: { x: fx, y: fy, w: fw, h: fh }, landmarks: scaledLM };
          setFaceStatus("found");
        } else {
          faceDataRef.current = null;
          setFaceStatus("lost");
        }
      } catch { faceDataRef.current = null; }

      detectLoopRef.current = setTimeout(detect, 80); // ~12fps detection
    };
    detect();
  };

  // ── AR Canvas Draw Loop (60fps) ───────────────────────────
  useEffect(() => {
    const loop = () => {
      tRef.current = performance.now();
      const c   = arCanvasRef.current;
      const vid = videoRef.current;
      if (!c || !vid) { rafRef.current = requestAnimationFrame(loop); return; }

      // Canvas size = displayed video size
      const rect = vid.getBoundingClientRect();
      const dw = Math.round(rect.width), dh = Math.round(rect.height);
      if (c.width !== dw || c.height !== dh) { c.width = dw; c.height = dh; }

      const ctx = c.getContext("2d");
      ctx.clearRect(0, 0, dw, dh);

      const renderer = AR_RENDERERS[activeAR];
      if (renderer && faceDataRef.current) {
        const { face, landmarks } = faceDataRef.current;
        renderer(ctx, face, landmarks, tRef.current);
      }

      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [activeAR]);

  // ── Gallery persistence ───────────────────────────────────
  useEffect(() => {
    try { const s = localStorage.getItem("photobhoot_v2"); if (s) setGallery(JSON.parse(s)); } catch {}
  }, []);
  const saveGallery = g => { setGallery(g); try { localStorage.setItem("photobhoot_v2", JSON.stringify(g)); } catch {} };

  // ── Capture ───────────────────────────────────────────────
  const runCountdown = secs => new Promise(resolve => {
    let c = secs; setCountdown(c);
    const t = setInterval(() => {
      c--;
      if (c > 0) setCountdown(c);
      else { clearInterval(t); setCountdown(null); setShowFlash(true); setTimeout(() => setShowFlash(false), 150); resolve(); }
    }, 1000);
  });

  const captureFrame = useCallback(() => {
    const vid = videoRef.current;
    const w = vid.videoWidth, h = vid.videoHeight;
    const tmp = document.createElement("canvas");
    tmp.width = w; tmp.height = h;
    const ctx = tmp.getContext("2d");

    if (isMirrored) { ctx.translate(w, 0); ctx.scale(-1, 1); }
    const cf = COLOR_FILTERS.find(f => f.id === activeColor);
    if (cf?.css) ctx.filter = cf.css;
    ctx.drawImage(vid, 0, 0);
    ctx.filter = "none";
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Bake AR filter — scale face coords from display → video resolution
    if (activeAR !== "none" && faceDataRef.current) {
      const renderer = AR_RENDERERS[activeAR];
      const c2 = arCanvasRef.current;
      const sx = w / c2.width, sy = h / c2.height;
      const { face: df, landmarks: dlm } = faceDataRef.current;
      const scaledFace = { x: df.x*sx, y: df.y*sy, w: df.w*sx, h: df.h*sy };
      const scaledLM = dlm ? {
        getNose:     () => dlm.getNose().map(p    => ({ x: p.x*sx, y: p.y*sy })),
        getLeftEye:  () => dlm.getLeftEye().map(p  => ({ x: p.x*sx, y: p.y*sy })),
        getRightEye: () => dlm.getRightEye().map(p => ({ x: p.x*sx, y: p.y*sy })),
        getMouth:    () => dlm.getMouth().map(p    => ({ x: p.x*sx, y: p.y*sy })),
      } : null;
      renderer(ctx, scaledFace, scaledLM, tRef.current);
    }
    return tmp.toDataURL("image/png");
  }, [isMirrored, activeColor, activeAR]);

  const createPolaroid = imgSrc => new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas"), ctx = c.getContext("2d");
      const b = 40, bt = 120;
      c.width = img.width + b*2; c.height = img.height + b + bt;
      ctx.fillStyle = "#fff"; ctx.fillRect(0,0,c.width,c.height);
      ctx.drawImage(img, b, b);
      ctx.fillStyle="#aaa"; ctx.font="28px sans-serif"; ctx.textAlign="center";
      ctx.fillText(new Date().toLocaleDateString(), c.width/2, c.height-42);
      resolve(c.toDataURL());
    };
    img.src = imgSrc;
  });

  const createFilmStrip = images => new Promise(resolve => {
    const loaded = new Array(images.length); let n = 0;
    images.forEach((src, i) => {
      const img = new Image();
      img.onload = () => { loaded[i]=img; if(++n===images.length) gen(); };
      img.src = src;
    });
    function gen() {
      const c=document.createElement("canvas"), ctx=c.getContext("2d");
      const iw=loaded[0].width, ih=loaded[0].height, pad=40;
      c.width=iw+pad*2; c.height=ih*loaded.length+pad*(loaded.length+1);
      ctx.fillStyle="#030000"; ctx.fillRect(0,0,c.width,c.height);
      for(let i=0;i<=loaded.length;i++){
        const hy=pad/2+i*(ih+pad);
        for(let hx=10;hx<c.width;hx+=22){ctx.fillStyle="rgba(255,255,255,0.06)";ctx.beginPath();ctx.arc(hx,hy,4,0,Math.PI*2);ctx.fill();}
      }
      loaded.forEach((img,i)=>{
        const x=pad,y=pad+i*(ih+pad),r=36;
        ctx.save();ctx.beginPath();
        ctx.moveTo(x+r,y);ctx.lineTo(x+iw-r,y);ctx.quadraticCurveTo(x+iw,y,x+iw,y+r);
        ctx.lineTo(x+iw,y+ih-r);ctx.quadraticCurveTo(x+iw,y+ih,x+iw-r,y+ih);
        ctx.lineTo(x+r,y+ih);ctx.quadraticCurveTo(x,y+ih,x,y+ih-r);
        ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();
        ctx.clip();ctx.drawImage(img,x,y);ctx.restore();
      });
      resolve(c.toDataURL());
    }
  });

  const handleCapture = async () => {
    if (isCapturing) return;
    setIsCapturing(true);
    if (mode === "single") {
      await runCountdown(3);
      const pol = await createPolaroid(captureFrame());
      openEditor(pol);
    } else {
      const frames = [];
      await runCountdown(3); frames.push(captureFrame());
      for (let i=1;i<collageCount;i++) { await runCountdown(2); frames.push(captureFrame()); }
      openEditor(await createFilmStrip(frames));
    }
    setIsCapturing(false);
  };

  // ── Editor ────────────────────────────────────────────────
  const editorCanvasRef = useRef(null);
  const openEditor = src => { setEditSrc(src); setStickers([]); setCaption(""); setScreen("editor"); };

  useEffect(() => {
    if (screen !== "editor" || !editSrc) return;
    const canvas = editorCanvasRef.current; if (!canvas) return;
    const img = new Image();
    img.onload = () => {
      const maxW=canvas.parentElement.clientWidth-40, maxH=canvas.parentElement.clientHeight-40;
      const sc=Math.min(maxW/img.width, maxH/img.height);
      canvas.width=img.width; canvas.height=img.height;
      canvas.style.width=img.width*sc+"px"; canvas.style.height=img.height*sc+"px";
      const ctx=canvas.getContext("2d"); ctx.drawImage(img,0,0);
      stickers.forEach(s => {
        ctx.font=`${img.width*0.08}px Arial`; ctx.textAlign="center"; ctx.textBaseline="middle";
        ctx.fillText(s.emoji, s.x*img.width/100, s.y*img.height/100);
      });
    };
    img.src = editSrc;
  }, [screen, editSrc, stickers]);

  const handleSave = useCallback(() => {
    const canvas = editorCanvasRef.current; if (!canvas) return;
    if (caption.trim()) {
      const ctx=canvas.getContext("2d");
      ctx.font=`${Math.max(24,canvas.width*0.025)}px sans-serif`;
      ctx.fillStyle="#777"; ctx.textAlign="center"; ctx.textBaseline="alphabetic";
      ctx.fillText(caption, canvas.width/2, canvas.height-30);
    }
    saveGallery([{ src: canvas.toDataURL("image/png"), caption }, ...gallery]);
    setScreen("gallery");
  }, [caption, gallery]);

  // ── Styles (original theme) ───────────────────────────────
  const BG="#030000", W="#ffffff";
  const BIG_BG = "linear-gradient(90deg,rgba(3,0,0,1) 0%,rgba(173,76,76,1) 50%,rgba(51,35,2,1) 100%)";
  const S = {
    root:    { background:BIG_BG, fontFamily:"'Quicksand',sans-serif", color:W, height:"100dvh", overflow:"hidden", display:"flex", flexDirection:"column", userSelect:"none" },
    wrap:    { display:"flex", flexDirection:"column", height:"100%", maxWidth:600, margin:"0 auto", width:"100%", padding:20, gap:16 },
    header:  { display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 },
    title:   { fontFamily:"'Fredoka',sans-serif", fontSize:"1.4rem", fontWeight:600 },
    hbtns:   { display:"flex", gap:8 },
    hbtn: a=>({ background:a?"#fff":"rgba(255,255,255,0.12)", border:"1px solid rgba(255,255,255,0.18)", color:a?BG:W, width:36, height:36, borderRadius:"50%", cursor:"pointer", fontSize:"0.85rem", display:"flex", alignItems:"center", justifyContent:"center" }),
    frame:   { flex:1, background:"#1a1a1a", borderRadius:30, border:`8px solid ${BG}`, position:"relative", overflow:"hidden", boxShadow:"0 20px 50px rgba(0,0,0,0.5)", minHeight:0 },
    video: (m,css)=>({ width:"100%", height:"100%", objectFit:"cover", display:"block", transform:m?"scaleX(-1)":"scaleX(1)", filter:css||"none" }),
    arCanvas:{ position:"absolute", top:0, left:0, width:"100%", height:"100%", zIndex:5, pointerEvents:"none" },
    panel:   { position:"absolute", bottom:0, left:0, right:0, background:"rgba(0,0,0,0.42)", backdropFilter:"blur(8px)", zIndex:10, borderRadius:"0 0 22px 22px" },
    ftabs:   { display:"flex", borderBottom:"1px solid rgba(255,255,255,0.1)" },
    ftab: a=>({ flex:1, background:"none", border:"none", color:a?W:"rgba(255,255,255,0.5)", fontFamily:"'Quicksand',sans-serif", fontWeight:700, fontSize:"0.78rem", padding:"8px 0", cursor:"pointer", borderBottom:a?"2px solid #fff":"2px solid transparent" }),
    frow:    { display:"flex", gap:6, padding:"10px 14px", overflowX:"auto", scrollbarWidth:"none" },
    fbtn: a=>({ background:a?"rgba(255,255,255,0.9)":"none", border:"none", color:a?BG:"rgba(255,255,255,0.65)", fontFamily:"'Quicksand',sans-serif", fontWeight:700, fontSize:"0.82rem", whiteSpace:"nowrap", cursor:"pointer", padding:"5px 13px", borderRadius:20, transform:a?"scale(1.08)":"scale(1)" }),
    statusTag: col=>({ position:"absolute", top:14, left:"50%", transform:"translateX(-50%)", background:col, backdropFilter:"blur(6px)", color:"rgba(255,255,255,0.9)", fontSize:"0.7rem", fontWeight:700, padding:"4px 12px", borderRadius:20, zIndex:15, whiteSpace:"nowrap" }),
    cdwn:    { position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Fredoka',sans-serif", fontSize:"9rem", color:W, textShadow:"0 4px 20px rgba(0,0,0,0.6)", pointerEvents:"none", zIndex:20 },
    flash:   { position:"absolute", inset:0, background:W, opacity:showFlash?1:0, transition:"opacity 0.1s", pointerEvents:"none", zIndex:25 },
    ctrl:    { height:120, background:BG, borderRadius:40, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 30px", flexShrink:0 },
    cg: a=>({ flex:1, display:"flex", flexDirection:"column", alignItems:a, justifyContent:"center" }),
    modeWrap:{ display:"flex", flexDirection:"column", gap:8 },
    mbtn: a=>({ background:a?W:"transparent", border:"1px solid transparent", color:a?BG:"#888", fontFamily:"'Fredoka',sans-serif", fontSize:"0.78rem", padding:"5px 10px", borderRadius:15, cursor:"pointer", letterSpacing:"1px", fontWeight:a?"bold":"normal" }),
    copts:   { display:"flex", gap:5, marginTop:8 },
    copt: a=>({ width:25, height:25, borderRadius:"50%", border:`1px solid ${a?W:"#888"}`, background:a?W:"transparent", color:a?BG:"#888", fontSize:"0.7rem", cursor:"pointer" }),
    shutter: { width:80, height:80, background:W, borderRadius:"50%", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 0 20px rgba(255,255,255,0.2)", opacity:isCapturing?0.6:1 },
    sInner:  { width:70, height:70, borderRadius:"50%", border:"2px solid #ddd", display:"flex", alignItems:"center", justifyContent:"center" },
    galBtn:  { background:"#222", border:"none", width:60, height:60, borderRadius:15, color:W, fontSize:"1.4rem", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:4, position:"relative" },
    badge:   { position:"absolute", top:-5, right:-5, background:"#e53935", color:W, fontSize:"0.58rem", fontWeight:700, width:17, height:17, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", border:`2px solid ${BG}` },
    modal:   { position:"fixed", inset:0, background:"#111", zIndex:100, display:"flex", flexDirection:"column", animation:"slideUp 0.3s ease-out" },
    mhdr:    { padding:"18px 20px", display:"flex", justifyContent:"space-between", alignItems:"center", background:"#000", flexShrink:0 },
    mtitle:  { fontFamily:"'Fredoka',sans-serif", fontSize:"1.15rem" },
    ibtn: p=>({ background:p?W:"#333", border:"none", color:p?BG:W, width:40, height:40, borderRadius:"50%", cursor:"pointer", fontSize:"0.95rem", display:"flex", alignItems:"center", justifyContent:"center" }),
    ews:     { flex:1, background:"#222", display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden", position:"relative", minHeight:0 },
    capArea: { padding:"10px 16px", background:"rgba(0,0,0,0.4)", borderTop:"1px solid rgba(255,255,255,0.06)", flexShrink:0 },
    capInput:{ width:"100%", background:"#222", border:"1px solid rgba(255,255,255,0.12)", borderRadius:20, color:W, fontFamily:"'Quicksand',sans-serif", fontSize:"0.85rem", padding:"9px 16px", outline:"none" },
    stray:   { background:"#000", flexShrink:0, borderTop:"1px solid rgba(255,255,255,0.06)" },
    stabsbar:{ display:"flex", padding:"8px 12px 0", gap:6 },
    stab: a=>({ background:a?W:"transparent", border:`1px solid ${a?W:"rgba(255,255,255,0.15)"}`, color:a?BG:"rgba(255,255,255,0.5)", fontFamily:"'Quicksand',sans-serif", fontWeight:700, fontSize:"0.72rem", padding:"5px 12px", borderRadius:20, cursor:"pointer" }),
    srow:    { display:"flex", gap:16, padding:"10px 16px", overflowX:"auto", scrollbarWidth:"none", fontSize:"2.4rem" },
    galGrid: { flex:1, overflowY:"auto", padding:20, display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(145px,1fr))", gap:18, alignContent:"start" },
    pol:     { background:W, padding:"9px 9px 38px", borderRadius:2, boxShadow:"0 5px 18px rgba(0,0,0,0.35)", position:"relative", cursor:"pointer", animation:"popIn 0.4s cubic-bezier(0.175,0.885,0.32,1.275)" },
    emptyG:  { flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:12, color:"rgba(255,255,255,0.4)" },
    prev:    { position:"fixed", inset:0, background:"rgba(0,0,0,0.95)", zIndex:200, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:20 },
    pvbtn:   { background:"#222", border:"1px solid rgba(255,255,255,0.15)", color:W, fontFamily:"'Quicksand',sans-serif", fontWeight:700, fontSize:"0.9rem", padding:"11px 22px", borderRadius:30, cursor:"pointer", display:"flex", alignItems:"center", gap:8 },
  };

  const cfCSS = COLOR_FILTERS.find(f => f.id === activeColor)?.css || "";

  const statusInfo = () => {
    if (activeAR === "none") return null;
    if (faceStatus === "loading")     return { bg: "rgba(80,60,0,0.7)",   text: "⏳ Loading face detection…" };
    if (faceStatus === "found")       return { bg: "rgba(0,80,0,0.7)",    text: "✅ Face tracked" };
    if (faceStatus === "lost")        return { bg: "rgba(100,0,0,0.7)",   text: "👤 Show your face to the camera" };
    if (faceStatus === "unsupported") return { bg: "rgba(80,0,80,0.7)",   text: "⚠️ Face detection unavailable" };
    return null;
  };
  const si = statusInfo();

  if (cameraError) return (
    <div style={{...S.root, alignItems:"center", justifyContent:"center"}}>
      <div style={{textAlign:"center",padding:40,background:"rgba(0,0,0,0.5)",borderRadius:20,maxWidth:300}}>
        <div style={{fontSize:"4rem",marginBottom:16}}>📷</div>
        <h2 style={{fontFamily:"'Fredoka',sans-serif",marginBottom:10}}>Camera Access Needed</h2>
        <p style={{color:"rgba(255,255,255,0.7)",marginBottom:24,lineHeight:1.5}}>Please allow camera access!</p>
        <button onClick={()=>{setCameraError(false);startCamera();}}
          style={{background:W,border:"none",color:BG,fontFamily:"'Fredoka',sans-serif",fontSize:"1rem",padding:"12px 32px",borderRadius:30,cursor:"pointer"}}>
          Try Again
        </button>
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@400;600&family=Quicksand:wght@500;700&display=swap');
        @keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
        @keyframes popIn{from{transform:scale(0.75);opacity:0}to{transform:scale(1);opacity:1}}
        *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;}
        ::-webkit-scrollbar{display:none;} body{overflow:hidden;}
      `}</style>

      <div style={S.root}>
        <div style={S.wrap}>

          {/* Header */}
          <div style={S.header}>
            <span style={S.title}>📸 Photo Bhoot</span>
            <div style={S.hbtns}>
              <button style={S.hbtn(!isMirrored)} onClick={()=>setIsMirrored(m=>!m)}>↔</button>
              <button style={S.hbtn(false)} onClick={flipCamera}>🔄</button>
            </div>
          </div>

          {/* Camera */}
          <div style={S.frame}>
            <video ref={videoRef} autoPlay playsInline muted style={S.video(isMirrored, cfCSS)} />
            <canvas ref={arCanvasRef} style={S.arCanvas} />

            {/* Status chip */}
            {si && <div style={S.statusTag(si.bg)}>{si.text}</div>}

            {/* Filter Panel */}
            <div style={S.panel}>
              <div style={S.ftabs}>
                {["ar","color"].map(tab=>(
                  <button key={tab} style={S.ftab(filterTab===tab)} onClick={()=>setFilterTab(tab)}>
                    {tab==="ar"?"✨ AR Filters":"🎨 Color"}
                  </button>
                ))}
              </div>
              <div style={S.frow}>
                {filterTab==="ar"
                  ? AR_FILTERS.map(f=>(
                      <button key={f.id} style={S.fbtn(activeAR===f.id)} onClick={()=>setActiveAR(f.id)}>
                        {f.emoji} {f.label}
                      </button>
                    ))
                  : [
                      <button key="none" style={S.fbtn(activeColor==="")} onClick={()=>setActiveColor("")}>
                        🚫 None
                      </button>,
                      ...COLOR_FILTERS.map(f=>(
                        <button key={f.id} style={S.fbtn(activeColor===f.id)} onClick={()=>setActiveColor(f.id)}>
                          {f.label}
                        </button>
                      ))
                    ]
                }
              </div>
            </div>

            {countdown && <div style={S.cdwn}>{countdown}</div>}
            <div style={S.flash} />
          </div>

          {/* Controls */}
          <div style={S.ctrl}>
            <div style={S.cg("flex-start")}>
              <div style={S.modeWrap}>
                <button style={S.mbtn(mode==="single")}  onClick={()=>setMode("single")}>SINGLE</button>
                <button style={S.mbtn(mode==="collage")} onClick={()=>setMode("collage")}>COLLAGE</button>
              </div>
              {mode==="collage"&&<div style={S.copts}>{[2,3,4].map(n=><button key={n} style={S.copt(collageCount===n)} onClick={()=>setCollageCount(n)}>{n}</button>)}</div>}
            </div>

            <div style={S.cg("center")}>
              <button style={S.shutter} onClick={handleCapture} disabled={isCapturing}
                onMouseDown={e=>e.currentTarget.style.transform="scale(0.95)"}
                onMouseUp={e=>e.currentTarget.style.transform="scale(1)"}
                onTouchStart={e=>e.currentTarget.style.transform="scale(0.95)"}
                onTouchEnd={e=>e.currentTarget.style.transform="scale(1)"}>
                <div style={S.sInner}>
                  {mode==="collage"&&<span style={{color:BG,fontFamily:"'Fredoka',sans-serif",fontWeight:"bold",fontSize:"1.2rem"}}>{collageCount}</span>}
                </div>
              </button>
            </div>

            <div style={S.cg("flex-end")}>
              <button style={S.galBtn} onClick={()=>setScreen("gallery")}>
                <span>🖼️</span>
                <span style={{fontSize:"0.58rem",opacity:0.7,textTransform:"uppercase",letterSpacing:"0.5px"}}>Gallery</span>
                {gallery.length>0&&<span style={S.badge}>{gallery.length>99?"99+":gallery.length}</span>}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Editor */}
      {screen==="editor"&&(
        <div style={S.modal}>
          <div style={S.mhdr}>
            <button style={S.ibtn(false)} onClick={()=>setScreen("camera")}>✕</button>
            <span style={S.mtitle}>Add Stickers ✨</span>
            <button style={S.ibtn(true)} onClick={handleSave}>✓</button>
          </div>
          <div style={S.ews}><canvas ref={editorCanvasRef} style={{maxWidth:"92%",maxHeight:"92%",boxShadow:"0 0 30px rgba(0,0,0,0.5)"}}/></div>
          <div style={S.capArea}><input value={caption} onChange={e=>setCaption(e.target.value)} placeholder="Add a caption... 💬" maxLength={40} style={S.capInput}/></div>
          <div style={S.stray}>
            <div style={S.stabsbar}>{Object.keys(STICKER_PACKS).map(p=><button key={p} style={S.stab(stickerPack===p)} onClick={()=>setStickerPack(p)}>{p.charAt(0).toUpperCase()+p.slice(1)}</button>)}</div>
            <div style={S.srow}>{STICKER_PACKS[stickerPack].map((e,i)=><span key={i} style={{cursor:"pointer",flexShrink:0}} onClick={()=>setStickers(prev=>[...prev,{emoji:e,x:50,y:50,id:Date.now()}])}>{e}</span>)}</div>
          </div>
        </div>
      )}

      {/* Gallery */}
      {screen==="gallery"&&(
        <div style={S.modal}>
          <div style={S.mhdr}>
            <button style={S.ibtn(false)} onClick={()=>setScreen("camera")}>⌄</button>
            <span style={S.mtitle}>Your Snaps 📸</span>
            <button style={S.ibtn(false)} onClick={()=>{if(confirm("Clear all snaps?"))saveGallery([]);}}>🗑️</button>
          </div>
          {gallery.length===0
            ?<div style={S.emptyG}><span style={{fontSize:"4rem",opacity:0.4}}>📷</span><p style={{fontFamily:"'Fredoka',sans-serif",fontSize:"1.1rem",textAlign:"center",lineHeight:1.6}}>No snaps yet!<br/>Strike a pose 💃</p></div>
            :<div style={S.galGrid}>{gallery.map((item,i)=>(
              <div key={i} style={S.pol} onClick={()=>setPreviewSrc(item.src)}>
                <img src={item.src} alt="snap" style={{width:"100%",display:"block",border:"1px solid #eee"}}/>
                {item.caption&&<div style={{position:"absolute",bottom:8,left:0,right:0,textAlign:"center",fontFamily:"'Fredoka',sans-serif",fontSize:"0.65rem",color:"#666",padding:"0 6px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.caption}</div>}
                <div style={{position:"absolute",top:5,right:5,display:"flex",gap:4}} onClick={e=>e.stopPropagation()}>
                  <button onClick={()=>{const a=document.createElement("a");a.href=item.src;a.download=`photobhoot-${Date.now()}.png`;a.click();}} style={{background:"rgba(0,0,0,0.6)",border:"none",color:W,width:26,height:26,borderRadius:"50%",cursor:"pointer",fontSize:"0.72rem"}}>↓</button>
                  <button onClick={()=>saveGallery(gallery.filter((_,j)=>j!==i))} style={{background:"rgba(0,0,0,0.6)",border:"none",color:W,width:26,height:26,borderRadius:"50%",cursor:"pointer",fontSize:"0.72rem"}}>✕</button>
                </div>
              </div>
            ))}</div>
          }
        </div>
      )}

      {/* Preview */}
      {previewSrc&&(
        <div style={S.prev} onClick={()=>setPreviewSrc(null)}>
          <button onClick={()=>setPreviewSrc(null)} style={{position:"absolute",top:20,right:20,background:"rgba(255,255,255,0.1)",border:"none",color:W,width:42,height:42,borderRadius:"50%",cursor:"pointer",fontSize:"1.1rem"}}>✕</button>
          <img src={previewSrc} alt="preview" style={{maxWidth:"90vw",maxHeight:"72vh",objectFit:"contain",borderRadius:4,boxShadow:"0 20px 60px rgba(0,0,0,0.6)"}} onClick={e=>e.stopPropagation()}/>
          <div style={{display:"flex",gap:12}} onClick={e=>e.stopPropagation()}>
            <button style={S.pvbtn} onClick={()=>{const a=document.createElement("a");a.href=previewSrc;a.download=`photobhoot-${Date.now()}.png`;a.click();}}>↓ Save</button>
            <button style={S.pvbtn} onClick={async()=>{try{const blob=await(await fetch(previewSrc)).blob();const file=new File([blob],`photobhoot-${Date.now()}.png`,{type:"image/png"});if(navigator.share&&navigator.canShare({files:[file]}))await navigator.share({title:"Photo Bhoot 📸",files:[file]});else{await navigator.clipboard.writeText("📸 Photo Bhoot!");alert("Copied!");}}catch{}}}>↑ Share</button>
          </div>
        </div>
      )}
    </>
  );
}