import type { VideoNode } from "../../nodeSchemas";
import { extractYouTubeId } from "../../youtubeUtils";
import {
  Handle,
  Position,
  type NodeProps
} from '@xyflow/react';
import type { ReactFlowCard } from "./Cards";
import { NodeCardFrame } from "./NodeCardFrame";


export function VideoCard(props: NodeProps<ReactFlowCard<VideoNode>>) {
  const node = props.data.node;
  const youtubeId = node.src ? extractYouTubeId(node.src) : null;

  return (
    <NodeCardFrame nodeId={node.id} nodeType={node.type} selected={Boolean(props.selected)}>
      <Handle type="target" position={Position.Left} className="creator-handle" />
      <h2 className="creator-card-title">{node.title?.trim() || "Untitled video"}</h2>
      <p className="creator-card-description">
        {node.src?.trim() || "No source URL configured."}
      </p>

      {youtubeId ? (
        <img
          src={`https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`}
          alt="YouTube thumbnail"
          className="creator-card-video-preview w-full object-cover"
        />
      ) : node.src ? (
        <video
          className="creator-card-video-preview"
          muted
          playsInline
          controls
          preload="metadata"
        >
          <source src={node.src} />
          {node.captionsSrc && (
            <track
              src={node.captionsSrc}
              kind="subtitles"
              srcLang="en"
              label="English"
            />
          )}
          Your browser does not support the video tag.
        </video>
      ) : (
        <div className="creator-card-video-empty">No preview</div>
      )}

      <div className="creator-card-meta">
        <span className="creator-card-tag">{youtubeId ? "YouTube" : "Hosted"}</span>
        <span className="creator-card-tag">{node.autoplay ? "Autoplay" : "Manual Play"}</span>
        {!youtubeId && <span className="creator-card-tag">{node.captionsSrc ? "Captions" : "No Captions"}</span>}
      </div>

      <Handle type="source" position={Position.Right} className="creator-handle" />
    </NodeCardFrame>
  );
}
