import { useEffect, useRef } from "react";

import type { VideoNode } from "../../nodeSchemas";
import { extractYouTubeId, toYouTubeEmbedUrl } from "../../youtubeUtils";
import type { NodeSceneProps } from "../viewerTypes";
import { SceneLayout, scenePrimaryButtonClassName } from "./sceneUi";

export function VideoScene({
  node,
  busy,
  errorMessage,
  dispatch,
}: NodeSceneProps<VideoNode>) {
  const playerRef = useRef<HTMLVideoElement>(null);
  const didAutoAdvanceRef = useRef<boolean>(false);

  const youtubeId = node.src ? extractYouTubeId(node.src) : null;

  // TODO A video player without scrub forward?
  useEffect(() => {
    if (youtubeId) return; // YouTube iframe handles its own playback

    if (!node.src && !busy && !didAutoAdvanceRef.current) {
      didAutoAdvanceRef.current = true;
      void dispatch({ type: "ADVANCE" });
    }

    const player = playerRef.current;
    if (!player) {
      return;
    }

    player.onended = () => {
      void dispatch({ type: "ADVANCE" });
    };

    return () => {
      player.onended = null;
    };
  }, [node.id, node.src, busy, dispatch, youtubeId]);

  const continueButton = (
    <button
      type="button"
      onClick={() => void dispatch({ type: "ADVANCE" })}
      disabled={busy}
      className={scenePrimaryButtonClassName}
    >
      {busy ? "Continuing..." : "Continue"}
    </button>
  );

  return (
    <SceneLayout
      tone="indigo"
      label="Video"
      title={node.title?.trim() || "Watch this clip"}
      errorMessage={errorMessage}
      footer={youtubeId ? continueButton : undefined}
    >
      <div className="overflow-hidden rounded-[1.5rem] border border-neutral-200 bg-black shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] dark:border-neutral-800">
        {youtubeId ? (
          <iframe
            className="aspect-video w-full"
            src={toYouTubeEmbedUrl(youtubeId, Boolean(node.autoplay))}
            title={node.title || "YouTube video"}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : node.src ? (
          <video
            ref={playerRef}
            className="aspect-video w-full bg-black"
            controls
            disablePictureInPicture
            preload="auto"
            autoPlay={Boolean(node.autoplay)}
          >
            <source src={node.src} />
            {node.captionsSrc ? (
              <track
                src={node.captionsSrc}
                kind="subtitles"
                srcLang="en"
                label="English"
              />
            ) : null}
            Your browser does not support the video tag.
          </video>
        ) : (
          <div className="flex aspect-video items-center justify-center px-6 text-center text-sm text-neutral-300">
            Preparing the next scene...
          </div>
        )}
      </div>
    </SceneLayout>
  );
}
