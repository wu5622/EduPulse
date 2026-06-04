import type { VideoNode } from "../../nodeSchemas";
import { useEditorDispatch } from "../editor-store/EditorDispatchContext";
import { TextInputDispatch } from "./NodeDispatchFields";
import type { NodeTabProps } from "./TabRenderer";
import {
  labelClassName,
  panelInputClassName,
  sectionClassName,
  sectionHeaderClassName,
} from "./tabStyles";

export function VideoTab({ node }: NodeTabProps<VideoNode>) {
  const dispatch = useEditorDispatch();

  return (
    <>
      <section className={sectionClassName}>
        <p className={sectionHeaderClassName}>Video Setup</p>
        <label className={labelClassName}>Title</label>
        <TextInputDispatch
          node={node}
          path="title"
          className={panelInputClassName}
          placeholder="Video title"
        />
        <label className={`${labelClassName} mt-4`}>Video URL</label>
        <TextInputDispatch
          node={node}
          path="src"
          className={panelInputClassName}
          placeholder="https://..."
        />
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
          Paste a YouTube link (youtube.com or youtu.be) or a direct video URL.
        </p>
        <label className={`${labelClassName} mt-4`}>Captions URL</label>
        <TextInputDispatch
          node={node}
          path="captionsSrc"
          className={panelInputClassName}
          placeholder="https://..."
        />
      </section>

      <section className={sectionClassName}>
        <p className={sectionHeaderClassName}>Playback</p>
        <label className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 border-slate-300 bg-slate-100 dark:border-slate-700/70 dark:bg-slate-900/35">
          <input
            type="checkbox"
            checked={Boolean(node.autoplay)}
            className="h-4 w-4 rounded text-sky-500 focus:ring-2 focus:ring-sky-400/40 border-slate-400 bg-white dark:border-slate-500 dark:bg-slate-900"
            onChange={(e) =>
              dispatch({
                type: "updateNode",
                id: node.id,
                patch: {
                  type: "video",
                  autoplay: e.target.checked,
                },
              })
            }
          />
          <div>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
              Autoplay video
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Starts playback when this node becomes active.
            </p>
          </div>
        </label>
      </section>
    </>
  );
}
