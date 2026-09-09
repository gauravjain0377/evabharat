import { useRef, useEffect } from 'react';

export function MediaPlayer({ item }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (item?.type === 'video' && videoRef.current) {
      videoRef.current.load();
      videoRef.current.play().catch(() => {});
    }
  }, [item?.url]);

  if (!item || item.type === 'blank') {
    return (
      <div className="media-wrap flex flex-col items-center justify-center gap-2 select-none">
        <div className="w-12 h-12 rounded-xl border border-white/5 flex items-center justify-center">
          <span className="text-2xl opacity-20">▪</span>
        </div>
        <span className="text-xs text-[#475569] tracking-widest uppercase font-mono">Blank</span>
      </div>
    );
  }

  if (item.type === 'video') {
    return (
      <div className="media-wrap">
        <video ref={videoRef} src={item.url} muted autoPlay playsInline loop />
      </div>
    );
  }

  return (
    <div className="media-wrap">
      <img src={item.url} alt={item.name} draggable={false} />
    </div>
  );
}
