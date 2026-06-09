import { useRef, useCallback } from "react";
import ReactPlayer from "react-player";

type PlayerProps = {
  src: string;
  autoplay?: boolean;
  captionsSrc?: string;
  onEnded: () => void;
  onError?: (err: unknown) => void;
};

export function ScenarioPlayer({
  src,
  autoplay,
  captionsSrc,
  onEnded,
  onError,
}: PlayerProps) {
  const playerRef = useRef<HTMLVideoElement | null>(null);

  const setPlayerRef = useCallback((player: HTMLVideoElement | null) => {
    playerRef.current = player;
  }, []);

  // finish styling
  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-neutral-200 bg-black shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] dark:border-neutral-800">
      <ReactPlayer
        ref={setPlayerRef}
        src={src}
        playing={Boolean(autoplay)}
        muted={Boolean(autoplay)}
        controls={true} // for now
        style={{ width: "100%", height: "100%", aspectRatio: "16/9" }}
        onEnded={onEnded}
        onError={onError}
      >
        {captionsSrc ? (
          <track
            kind="subtitles"
            src={captionsSrc}
            srcLang="en"
            label="english"
          />
        ) : null}
      </ReactPlayer>
    </div>
  );
}
