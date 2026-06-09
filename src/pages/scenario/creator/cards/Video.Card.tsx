import type { VideoNode } from "../../nodeSchemas";
import ReactPlayer from "react-player"
// import { extractYouTubeId } from "../../youtubeUtils";
import {
  Handle,
  Position,
  type NodeProps
} from '@xyflow/react';
import type { ReactFlowCard } from "./Cards";
import { NodeCardFrame } from "./NodeCardFrame";


export function VideoCard(props: NodeProps<ReactFlowCard<VideoNode>>) {
  const node = props.data.node;
  // const youtubeId = node.src ? extractYouTubeId(node.src) : null;

  return (
    <NodeCardFrame nodeId={node.id} nodeType={node.type} selected={Boolean(props.selected)}>
      <Handle type="target" position={Position.Left} className="creator-handle" />
      <h2 className="creator-card-title">{node.title?.trim() || "Untitled video"}</h2>
      <p className="creator-card-description">
        {node.src?.trim() || "No source URL configured."}
      </p>

      {node.src ? (
        <div
        className="creator-card-video-preview"
        style={{ position: "relative", aspectRatio: "16/9", height: "auto", overflow: "hidden"}}
        >
        <ReactPlayer
          src={node.src}
          controls={true}
          muted={true}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", maxWidth: "100%", maxHeight: "100%"}}
        >
        {node.captionsSrc ? (
          <track
          src={node.captionsSrc}
          kind="subtitles"
          srcLang="en"
          label="English"
          />
        ): null}
        </ReactPlayer>
        </div>
      ) : (
        <div className="creator-card-video-empty">No preview</div>
      )}

      <div className="creator-card-meta">
        <span className="creator-card-tag">{"Hosted"}</span>
        <span className="creator-card-tag">{node.autoplay ? "Autoplay" : "Manual Play"}</span>
        <span className="creator-card-tag">{node.captionsSrc ? "Captions" : "No Captions"}</span>
      </div>

      <Handle type="source" position={Position.Right} className="creator-handle" />
    </NodeCardFrame>
  );
}
