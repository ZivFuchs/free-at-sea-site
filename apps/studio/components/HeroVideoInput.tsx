import { useEffect, useRef } from "react";
import { type FileInputProps, useClient, useDocumentOperation, useFormValue } from "sanity";

/** Draws a video's first frame to a JPEG. Needs the file's host to allow CORS, as Sanity's CDN does. */
const firstFrame = (url: string) =>
	new Promise<Blob>((resolve, reject) => {
		const video = document.createElement("video");
		video.crossOrigin = "anonymous";
		video.muted = true;
		video.preload = "auto";
		video.addEventListener(
			"loadeddata",
			() => {
				const canvas = document.createElement("canvas");
				canvas.width = video.videoWidth;
				canvas.height = video.videoHeight;
				canvas.getContext("2d")?.drawImage(video, 0, 0);
				canvas.toBlob(
					(blob) => (blob ? resolve(blob) : reject(new Error("Frame capture failed"))),
					"image/jpeg",
					0.9,
				);
			},
			{ once: true },
		);
		video.addEventListener("error", () => reject(video.error), { once: true });
		video.src = url;
	});

/** Default file input that keeps `heroPoster` set to the first frame of the chosen video. */
export function HeroVideoInput(props: FileInputProps) {
	const id = String(useFormValue(["_id"]) ?? "").replace(/^drafts\./, "");
	const type = String(useFormValue(["_type"]) ?? "");
	const posterFor = useFormValue(["heroPosterFor"]) as string | undefined;
	const videoRef = props.value?.asset?._ref;
	const client = useClient({ apiVersion: "2025-01-01" });
	const { patch } = useDocumentOperation(id, type);
	const patchRef = useRef(patch);
	patchRef.current = patch;

	useEffect(() => {
		if (videoRef === posterFor) return;
		if (!videoRef) {
			patchRef.current.execute([{ unset: ["heroPoster", "heroPosterFor"] }]);
			return;
		}
		let cancelled = false;
		(async () => {
			const url = await client.fetch<string | null>("*[_id == $ref][0].url", { ref: videoRef });
			if (!url || cancelled) return;
			const frame = await firstFrame(url);
			const asset = await client.assets.upload("image", frame, { filename: "hero-poster.jpg" });
			if (cancelled) return;
			patchRef.current.execute([
				{
					set: {
						heroPoster: { _type: "image", asset: { _type: "reference", _ref: asset._id } },
						heroPosterFor: videoRef,
					},
				},
			]);
		})().catch((error) => console.error("Hero poster capture failed", error));
		return () => {
			cancelled = true;
		};
	}, [videoRef, posterFor, client]);

	return props.renderDefault(props);
}
