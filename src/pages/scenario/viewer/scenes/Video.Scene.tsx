import { useEffect, useRef, useState } from "react";

import type { VideoNode } from "../../nodeSchemas";
import type { NodeSceneProps } from "../viewerTypes";
import { SceneLayout, scenePrimaryButtonClassName } from "./sceneUi";
import { ScenarioPlayer } from "../ScenarioPlayer.tsx";

export function VideoScene({
  node,
  busy,
  errorMessage,
  dispatch,
}: NodeSceneProps<VideoNode>) {
  const didAutoAdvanceRef = useRef<boolean>(false);
  const [prevSrc, setPrevSrc] = useState(node.src);
  const [hasEnded, setHasEnded] = useState(false);

  if (prevSrc !== node.src) {
    setPrevSrc(node.src);
    setHasEnded(false);
  }

  // TODO A video player without scrub forward?
  useEffect(() => {
    if (!node.src && !busy && !didAutoAdvanceRef.current) {
      didAutoAdvanceRef.current = true;
      void dispatch({ type: "ADVANCE" });
    }
  }, [node.id, node.src, busy, dispatch]);

  // useEffect(() => {
  //   setHasEnded(false);
  // }, [node.src]);

  return (
    <SceneLayout
      tone="indigo"
      label="Video"
      title={node.title?.trim() || "Watch this clip"}
      errorMessage={errorMessage}
      footer={
        node.src ? (
          <button
            type="button"
            onClick={() => void dispatch({ type: "ADVANCE" })}
            disabled={!hasEnded || busy}
            className={scenePrimaryButtonClassName}
          >
            {busy ? "Continuing" : "Continue"}
          </button>
        ) : undefined
      }
    >
      {node.src ? (
        <ScenarioPlayer
          src={node.src}
          autoplay={node.autoplay}
          captionsSrc={node.captionsSrc}
          onEnded={() => setHasEnded(true)}
        />
      ) : (
        <div className="flex aspect-video items-center justify-center rounded-[1.5rem] border border-neutral-200 bg-black px-6 text-center text-sm text-neutral-300 dark:border-neutral-800">
          Preparing the next scene...
        </div>
      )}
    </SceneLayout>
  );
}
